# taku — swipe your next anime

Tinder-style anime discovery with a taste-identity game on top. Swipe right = want to watch,
left = pass, up = seen (then tier-rate it S–D, as Finished or Still Watching with live
next-episode air dates). A client-side rec engine learns your taste from every action and biases
the **For You** feed toward new & currently-airing shows, with genre filtering. A neural-network
profile classifies you into an earnable archetype (grind niche slice of life and ascend to
**TAKU**), friends compete on a squad leaderboard via share codes, and your rank exports as a
share-ready image. Every anime opens into a full info page — characters with community-sourced
MBTI, tags, and "More like this."

**No accounts. No ads. No data collected.** Everything lives in the browser (`localStorage`),
with one-tap backup/restore. Data: [AniList](https://anilist.co) GraphQL API.

## Repo layout

```
taku/
  www/                ← the entire app (deploy target / Capacitor webDir)
    index.html        app shell
    privacy.html      privacy policy (App Store requirement, deploys with the app)
    css/app.css       design system + views
    js/               data, state, api (AniList + cache), rec engine, deck, lists,
                      search, profile, detail (info pages), share (rank card + backup), main
    sw.js             service worker — versioned shell cache, network-first navigations
    manifest.webmanifest, icons/
  store/              ← App Store launch kit
    app-store-listing.md          name/subtitle/keywords/description/review notes (paste-ready)
    appstore-icon-1024.png        1024×1024 RGB icon (regenerate: node store/make-icon.js)
    anilist-authorization-email.md  send to contact@anilist.co before store launch
  .github/workflows/deploy.yml    auto-deploys www/ to GitHub Pages on push to main
  capacitor.config.json           appId com.carter.taku, webDir www
  package.json                    Capacitor deps incl. push-notifications
```

## Run locally (Windows, no install)

```powershell
cd taku
python -m http.server 5180 -d www
# open http://localhost:5180
```

## Deploy the PWA (live link today)

1. Create an empty GitHub repo named `taku`, then:
   ```bash
   git remote add origin https://github.com/<you>/taku.git
   git push -u origin main
   ```
2. GitHub → repo **Settings → Pages → Source: GitHub Actions**. The bundled workflow publishes
   `www/` as the site root on every push → `https://<you>.github.io/taku/`.
3. iPhone: open in Safari → Share → **Add to Home Screen**. Fullscreen, offline shell, installable.

## App Store (Capacitor + Xcode)

Xcode is macOS-only. Routes: any Mac, a cloud Mac (MacinCloud), or CI (Codemagic/Appflow builds
and uploads to App Store Connect straight from this repo — no Mac owned).

On a Mac (Node + Xcode 15+):
```bash
npm install
npx cap add ios
npx cap sync ios
npx cap open ios
```
Then in Xcode: set your Team (Apple Developer Program, $99/yr), bundle id `com.carter.taku`,
drop `store/appstore-icon-1024.png` into the AppIcon set, Archive → Distribute.

In App Store Connect, everything to paste — name, subtitle, keywords, description, age-rating
answers, privacy label ("Data Not Collected"), and reviewer notes — is in
**`store/app-store-listing.md`**. Privacy Policy URL: `https://<you>.github.io/taku/privacy.html`.

**Before submitting:** send `store/anilist-authorization-email.md` to AniList (their ToS asks
tracker-style apps to get authorized), and take 6.7" screenshots from the deployed app.

## Version bumps (important)

Shell assets are version-pinned: `index.html` loads them with `?v=N`, and `www/sw.js` has
matching `VER`/`AV` constants. **Bump all three together on every shell change** — navigations
are network-first and clients auto-reload once when a new service worker activates, so mixed
old/new versions can't happen, but only if the pins move together.
