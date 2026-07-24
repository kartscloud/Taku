# AniList API authorization email

Send from your email to **contact@anilist.co** before the App Store launch. Their ToS restricts
anime list/tracker services using the API unless authorized — taku's Want/Watching/Tiers lists
make this clause apply to us, so we ask first. (Free apps under $150/month revenue are otherwise
fine; this is specifically about the tracker clause.)

---

**To:** contact@anilist.co
**Subject:** API authorization request — taku (anime discovery app, iOS/web)

Hi AniList team,

I'm building **taku**, a free anime discovery app (installable web app now, iOS App Store via
Capacitor soon), and I'd like your authorization to use the AniList API per the third-party-app
terms, since taku includes list features that could read as a "tracker service."

**What taku is:** a Tinder-style discovery app — users swipe through anime (want / pass / seen),
tier-rate what they've finished (S–D), and get a playful "taste rank." It keeps simple local
lists: Want to Watch, Watching (with your nextAiringEpisode data), and rated titles.

**How it uses the API:**
- Anonymous GraphQL queries only (no user OAuth yet): Page/media browse, search, characters,
  recommendations, airing schedules.
- Client-side only — every user's requests come from their own device; no server-side
  mass collection, no data hoarding, results cached briefly on-device (≤30 min) purely to
  respect the rate limit.
- `isAdult` content excluded, and Ecchi/Hentai genres additionally excluded from discovery,
  per your App Store guidance in the docs.
- AniList is credited in-app and in the App Store listing ("Anime data and artwork provided
  by AniList").

**Commercial status:** completely free — no ads, no purchases, no revenue. If that ever changes
past your $150/month threshold I'll contact you about a commercial license first.

**On the tracker clause:** taku's lists are lightweight and personal, not a MAL/AniList-style
social catalog. That said, I'd genuinely like to add **AniList account sync** (import + keep
lists synced via OAuth) as a headline feature, which I understand is the kind of sustained
integration the terms favor. Happy to prioritize that if it matters for authorization.

Could you confirm taku is OK to operate on the API as described? Glad to answer anything or
adjust whatever you'd like.

Thanks for maintaining the best anime API around,
Carter
kartikaygeorg@gmail.com
