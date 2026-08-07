/* taku · animeschedule.net proxy
 *
 * Why this exists: animeschedule.net has the sub/dub data AniList doesn't, but
 *   1. its API needs a bearer token, and
 *   2. it sends no Access-Control-Allow-Origin header,
 * so a browser-only PWA can't call it directly. This is the smallest possible
 * shim: it adds CORS, attaches the token server-side, and caches responses so
 * we stay well under their rate limit.
 *
 * The token is read from the environment and never written to disk or logged.
 * Never commit it. Run with:
 *
 *   ANIMESCHEDULE_TOKEN=your_token_here node server/proxy.js
 *
 * Then point the app at http://localhost:8787.
 */
const http = require("http");
const https = require("https");

const PORT = process.env.PORT || 8787;
const TOKEN = process.env.ANIMESCHEDULE_TOKEN || "";
const TMDB_KEY = process.env.TMDB_KEY || "";       // optional — posters only
const UPSTREAM = "animeschedule.net";
const TTL = 30 * 60 * 1000;               // match the app's own cache window
const ALLOWED = new Set(["/timetables/sub", "/timetables/dub", "/timetables/raw", "/anime"]);
// /tmdb/find is ours, not a passthrough: it takes a title+year and returns at
// most a poster path, so the browser never sees the key and can't call TMDB
// with arbitrary parameters.
const TMDB_TTL = 7 * 24 * 60 * 60 * 1000; // artwork barely changes; cache hard

if (!TOKEN) {
  console.error("ANIMESCHEDULE_TOKEN is not set — every upstream call would 401.");
  console.error("Get a token at animeschedule.net → Settings → API → create an Application.");
  process.exit(1);
}

const cache = new Map();                  // url -> {t, status, body}

/* ---- TMDB poster lookup ----
   Match is deliberately strict, because the failure we must avoid is showing
   the WRONG show's art. Every candidate has to clear all four gates; anything
   that doesn't returns null and the app keeps AniList's own cover. A miss is
   invisible (slightly softer art); a false positive would be a lie. */
const TMDB_ROMAN = { i:1, ii:2, iii:3, iv:4, v:5, vi:6, vii:7, viii:8, ix:9, x:10 };
function tkey(s) {
  if (!s) return "";
  let t = String(s).toLowerCase().replace(/[’'`´]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
  t = t.replace(/\b(\d+)(st|nd|rd|th)\b/g, "$1");
  t = t.replace(/\b(season|cour|part)\s*(\d+)\b/g, "$2");
  t = t.replace(/\b(\d+)\s*(season|cour|part)\b/g, "$1");
  t = t.replace(/\b([ivx]+)\b$/, (m, r) => TMDB_ROMAN[r] !== undefined ? String(TMDB_ROMAN[r]) : m);
  return t.replace(/\s+/g, " ").trim();
}
function tmdbGet(path) {
  return new Promise((resolve, reject) => {
    const sep = path.includes("?") ? "&" : "?";
    const req = https.request(
      { host: "api.themoviedb.org", path: "/3" + path + sep + "api_key=" + TMDB_KEY,
        method: "GET", headers: { Accept: "application/json" } },
      res => { let b = ""; res.on("data", c => (b += c)); res.on("end", () => {
        try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }
    );
    req.on("error", reject);
    req.setTimeout(8000, () => req.destroy(new Error("tmdb timeout")));
    req.end();
  });
}
async function tmdbPoster(title, alt, year) {
  const want = [tkey(title), tkey(alt)].filter(Boolean);
  if (!want.length) return null;
  const q = encodeURIComponent(title || alt);
  const tries = [`/search/tv?query=${q}&include_adult=false`,
                 `/search/movie?query=${q}&include_adult=false`];
  for (const t of tries) {
    let j; try { j = await tmdbGet(t); } catch (e) { continue; }
    for (const c of (j.results || []).slice(0, 6)) {
      if (!c.poster_path) continue;                                   // 1. has art
      const names = [c.name, c.original_name, c.title, c.original_title].filter(Boolean);
      if (!names.some(n => want.includes(tkey(n)))) continue;         // 2. title matches
      const d = c.first_air_date || c.release_date || "";
      const cy = d ? +d.slice(0, 4) : 0;
      if (year && cy && Math.abs(cy - year) > 1) continue;            // 3. year agrees (±1)
      const lang = c.original_language;
      const anim = (c.genre_ids || []).includes(16);
      if (!anim && !["ja", "zh", "ko"].includes(lang)) continue;      // 4. actually anime
      return { poster: c.poster_path, tmdbId: c.id, year: cy, lang };
    }
  }
  return null;
}

function upstream(path) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { host: UPSTREAM, path: "/api/v3" + path, method: "GET",
        headers: { Authorization: "Bearer " + TOKEN, Accept: "application/json" } },
      res => {
        let body = "";
        res.on("data", c => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("upstream timeout")));
    req.end();
  });
}

http.createServer(async (req, res) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
  };
  if (req.method === "OPTIONS") return res.writeHead(204, cors).end();

  const url = new URL(req.url, "http://x");

  // poster lookup: our own endpoint, so the key stays server-side
  if (url.pathname === "/tmdb/find") {
    if (!TMDB_KEY) return res.writeHead(200, cors).end(JSON.stringify({ off: true }));
    const title = url.searchParams.get("t") || "";
    const alt   = url.searchParams.get("a") || "";
    const year  = +url.searchParams.get("y") || 0;
    const ck = "tmdb:" + tkey(title) + "|" + tkey(alt) + "|" + year;
    const hit = cache.get(ck);
    if (hit && Date.now() - hit.t < TMDB_TTL)
      return res.writeHead(200, { ...cors, "X-Cache": "hit" }).end(hit.body);
    try {
      const found = await tmdbPoster(title, alt, year);
      const body = JSON.stringify(found || { none: true });
      cache.set(ck, { t: Date.now(), status: 200, body });
      return res.writeHead(200, { ...cors, "X-Cache": "miss" }).end(body);
    } catch (e) {
      return res.writeHead(200, cors).end(JSON.stringify({ none: true }));
    }
  }

  // only proxy the endpoints we actually use — this is not an open relay
  if (!ALLOWED.has(url.pathname)) {
    return res.writeHead(404, cors).end(JSON.stringify({ error: "not proxied" }));
  }

  const key = url.pathname + url.search;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) {
    return res.writeHead(hit.status, { ...cors, "X-Cache": "hit" }).end(hit.body);
  }

  try {
    const r = await upstream(key);
    if (r.status === 200) cache.set(key, { t: Date.now(), status: r.status, body: r.body });
    res.writeHead(r.status, { ...cors, "X-Cache": "miss" }).end(r.body);
  } catch (e) {
    res.writeHead(502, cors).end(JSON.stringify({ error: String(e.message || e) }));
  }
}).listen(PORT, () => {
  console.log("taku proxy on http://localhost:" + PORT);
  console.log("TMDB posters:", TMDB_KEY ? "on" : "off (set TMDB_KEY to enable)");
  console.log("proxying:", [...ALLOWED].join(", "));
});
