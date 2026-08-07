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
const UPSTREAM = "animeschedule.net";
const TTL = 30 * 60 * 1000;               // match the app's own cache window
const ALLOWED = new Set(["/timetables/sub", "/timetables/dub", "/timetables/raw", "/anime"]);

if (!TOKEN) {
  console.error("ANIMESCHEDULE_TOKEN is not set — every upstream call would 401.");
  console.error("Get a token at animeschedule.net → Settings → API → create an Application.");
  process.exit(1);
}

const cache = new Map();                  // url -> {t, status, body}

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
  console.log("proxying:", [...ALLOWED].join(", "));
});
