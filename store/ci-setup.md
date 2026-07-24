# Ship taku to the App Store from Windows (Codemagic CI)

You have an Apple Developer account — that plus this repo is everything. No Mac needed.
Total hands-on time: ~30 minutes, mostly clicking.

## 1 · Push the repo (5 min)
1. Create an empty GitHub repo named **taku** (no README/license).
2. ```bash
   cd C:\Users\karti\projects\taku
   git remote add origin https://github.com/kartscloud/Taku.git
   git push -u origin main
   ```
3. Repo **Settings → Pages → Source: GitHub Actions** — this also puts your privacy policy
   live at `https://kartscloud.github.io/Taku/privacy.html` (you'll paste that URL in step 4).

## 2 · App Store Connect: key + app record (10 min)
At [appstoreconnect.apple.com](https://appstoreconnect.apple.com):

**a. API key** (lets Codemagic sign + upload for you):
- Users and Access → **Integrations → App Store Connect API** → Team Keys → **+**
- Name: `codemagic` · Access: **App Manager** → Generate
- **Download the .p8 file** (one-time download — keep it), note the **Key ID** and **Issuer ID**.

**b. Register the bundle ID:**
- [developer.apple.com/account](https://developer.apple.com/account) → Certificates, IDs & Profiles
  → Identifiers → **+** → App IDs → App
- Bundle ID (explicit): **com.carter.taku** · Description: taku · Capabilities: enable
  **Push Notifications** → Register.

**c. Create the app record:**
- App Store Connect → Apps → **+ New App**
- Platform iOS · Name **taku — anime finder & tracker** · Language English (U.S.)
  · Bundle ID **com.carter.taku** · SKU `taku001`

## 3 · Codemagic (10 min)
1. Sign up at [codemagic.io](https://codemagic.io) with your GitHub account (free tier:
   500 macOS build minutes/month — plenty).
2. **Add application** → pick the `taku` repo → it auto-detects `codemagic.yaml`.
3. Teams → Personal Account → **Integrations → Developer Portal → App Store Connect** →
   **Add key**: name it exactly **`taku-asc-key`** (the yaml references this name), paste
   Issuer ID + Key ID, upload the .p8.
4. Open the app → **Start new build** → workflow `ios-appstore` → Start.

The pipeline then: installs deps → generates the iOS project → builds all icon/splash sizes
from `assets/` → signs with your key → builds the IPA → **uploads to TestFlight** automatically.
First build takes ~15–20 min.

## 4 · Submit (15 min, once the build lands)
In App Store Connect → your app:
1. **TestFlight tab** — the build appears; install it on your own iPhone via the TestFlight
   app first. This is your real-device test.
2. **App Store tab** → prepare the version, pasting everything from
   `store/app-store-listing.md` (description, keywords, promo text, review notes).
3. Screenshots: 6.7" set (1290×2796), taken from the app.
4. Age rating questionnaire + privacy label ("Data Not Collected") — answers are in the
   listing pack.
5. Privacy Policy URL: `https://kartscloud.github.io/Taku/privacy.html`
6. Add the build to the version → **Submit for Review**. Typical review: 1–3 days.

## Don't forget
- Send `store/anilist-authorization-email.md` to contact@anilist.co (do this today — it's
  the only external dependency with unknown latency).
- Every future release: push to main (Pages PWA updates automatically), and for iOS just
  hit **Start build** in Codemagic again — build numbers auto-increment.
