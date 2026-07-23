# taku — swipe your next anime

Tinder-style anime discovery. Swipe right = want to watch, left = nope, up = watched (then tier-rate it S–D). A client-side rec engine learns your taste from every action and biases the **For You** feed toward new & currently-airing shows. Neural-network profile page classifies you into an archetype (go deep on niche Slice of Life and you ascend to **TAKU**). Friends work peer-to-peer via shareable profile codes. All data stays in the browser (`localStorage`) — no accounts, no backend.

## Project layout

```
taku/
  www/              ← the entire app (this is what Capacitor wraps / what you deploy)
    index.html
    css/app.css
    js/             data, state, api (AniList + cache), rec engine, deck, lists, search, profile, main
    sw.js           service worker (offline shell + poster cache)
    manifest.webmanifest
    icons/
  capacitor.config.json
  package.json
  index.html        ← redirect stub → www/
```

## Run it now (Windows, no install)

```powershell
cd C:\Users\karti\projects\taku
python -m http.server 5180 -d www
# open http://localhost:5180
```

## Ship it as a PWA today (installable on iPhone/Android immediately)

1. Create an empty GitHub repo named `taku` (no README/license — this repo has them), then push:
   ```bash
   git remote add origin https://github.com/<you>/taku.git
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The bundled workflow (`.github/workflows/deploy.yml`) publishes the `www/` folder as the site root on every push to `main` — so the app lives at `https://<you>.github.io/taku/` with the service worker scoped correctly (no `/www/` in the URL, no redirect hop). Watch it under the repo's **Actions** tab.
3. **HTTPS is automatic** on Pages — required for the service worker + install prompt.
4. iPhone: open the URL in Safari → Share → **Add to Home Screen**. Fullscreen, offline-shell, native-feeling. Fastest way onto your friend's phone **today**. (Alternatively point Netlify/Vercel at the `www/` folder.)

## App Store launch (Capacitor + Xcode)

**Reality check: Xcode only runs on macOS.** You cannot build/submit an iOS app from this Windows machine. Options:
- Use any Mac (friend's, library, used Mac mini)
- Cloud Mac: MacStadium / MacinCloud / Scaleway
- CI build: Ionic Appflow / Codemagic can build + upload to App Store Connect from this repo without you owning a Mac

Once on a Mac (Node + Xcode 15+ installed):

```bash
cd taku
npm install
npx cap add ios        # generates ios/ native project wrapping www/
npx cap sync ios
npx cap open ios       # opens Xcode
```

Then in Xcode:
1. Set your Team (needs an Apple Developer account, $99/yr) + bundle id `com.carter.taku`
2. Replace AppIcon with a 1024×1024 raster export of `www/icons/icon.svg` (App Store requires PNG, no alpha)
3. Product → Archive → Distribute → App Store Connect
4. In App Store Connect: screenshots (6.7" + 5.5"), description, **content rating** (mind that AniList data includes anime artwork; the app filters `isAdult`), privacy label = "Data Not Collected" (everything is on-device)

### App Review notes worth knowing
- "Data Not Collected" privacy label is accurate and is a big review plus — keep it that way.
- Guideline 4.2 (minimum functionality): the rec engine, tiers, neural profile and squad codes put you comfortably past "just a repackaged website", but expect to demo it in review notes.
- AniList API is free for non-commercial use; attribute it in the app description.

## Version bumps (important)
Shell files are version-pinned: `index.html` loads assets with `?v=N` and `www/sw.js` has matching `VER`/`AV` constants. **On every shell change bump all three together** (the `?v=` in index.html, and `VER`+`AV` in sw.js). Navigations are network-first and a `controllerchange` listener reloads the page once when a new SW activates, so clients can never run mixed old/new versions — but only if the versions are bumped.
