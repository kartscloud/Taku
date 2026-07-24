# taku · App Store listing pack

Everything to paste into App Store Connect. Character limits noted; all fields verified within limits.

## App name (30 chars max)
```
taku — anime finder & tracker
```

## Subtitle (30 chars max)
```
Swipe. Rate. Earn your rank.
```

## Keyword field (100 chars max, comma-separated, no spaces after commas)
```
anime,swipe,anime finder,anime tracker,tierlist,what to watch,seasonal anime,anime list,otaku,manga
```
(Targets the low-competition `swipe anime` / `anime finder` space per the ASO research; skips MAL-brand terms we can't win. Don't repeat "taku" — the app name is already indexed.)

## Promotional text (170 chars max — editable without review)
```
Find your next anime in seconds. Swipe the season's new drops, tier-rank what you've seen, and earn your legendary class. No account. No ads. Your data stays yours.
```

## Description (4000 chars max)
```
Stop scrolling lists. Start swiping.

taku is the fastest way to find your next anime — and the most fun way to prove your taste.

DISCOVER BY SWIPING
Swipe through a personalized deck of anime, Tinder-style. Right = want to watch. Left = pass. Up = already seen. Every swipe teaches taku what you love, and your For You feed gets sharper with each one — tuned toward new and currently-airing shows, so you're always on the season's pulse. Filter by genre when you're in a mood, undo when your thumb slips, and tap any card for the full picture.

RATE THE WAY FANS ACTUALLY RATE
No mushy 10-point scales. Drop every show you've finished into S, A, B, C, or D — peak to nah — and build a ranked list that actually says something. Still mid-series? Mark it Watching and taku shows you exactly when the next episode airs.

EARN YOUR RANK
taku's neural profile studies your watch history — hours, titles, and the genres you gravitate to — and classifies you into an anime archetype. Grind niche slice of life and ascend to the legendary TAKU. Live for the fights? You're headed for BERSERKER. Eighteen classes, five ranks, one identity that's actually earned.

GO DEEPER ON EVERY SHOW
Tap into any anime for a full info page: synopsis, tags, the characters (with community-sourced MBTI types for the icons), and a "More like this" rail so one great find leads to the next.

BRING YOUR SQUAD
Add friends with a simple share code and battle for the top of your squad leaderboard. Then flex: export your rank card as a share-ready image — your class, your stats, your top-rated shows — built for the group chat.

YOUR DATA IS YOURS
No account. No sign-up. No ads. No tracking. Everything lives on your device, with one-tap backup and restore. taku collects nothing — and that's not a settings page promise, it's the architecture.

Anime data and artwork provided by AniList.

Swipe. Rate. Ascend.
```

## What's New (first release)
```
First release — swipe-to-discover, S–D tier ratings, Watching with next-episode air dates, neural rank + archetypes, squad leaderboards, and shareable rank cards.
```

## Categories
- Primary: **Entertainment**
- Secondary: **Lifestyle**

## Age rating questionnaire guidance
Under Apple's current 4+/9+/13+/16+/18+ tiers, answer:
- Mature/Suggestive Themes: **Infrequent/Mild** (ecchi + hentai genres are hard-filtered from discovery at the query level; some anime artwork is inherently suggestive)
- Violence (cartoon/fantasy): **Infrequent/Mild** (action anime key art)
- Everything else: None
- Unrestricted web access: **No** (no in-app browser)
- User-generated content: the share card + friend codes are user-initiated exports, not a UGC feed
Expected result: **13+** (16+ also acceptable; do NOT voluntarily set 18+).

## Privacy label ("App Privacy" section)
**Data Not Collected** — across every category. No account, no analytics, no identifiers, no tracking. The only network traffic is anonymous queries to the public AniList API for catalog data.
- Privacy Policy URL: `https://kartscloud.github.io/Taku/privacy.html` (live once Pages deploys; update if you use a custom domain)

## App Review notes (paste into "Notes" in App Store Connect)
```
taku is an anime discovery and tracking app.

- No login is required or offered; the full app is immediately usable by the reviewer. All user data is stored on-device.
- Catalog data and artwork come from the public AniList GraphQL API (https://docs.anilist.co). Adult-flagged content is excluded via the API's isAdult filter, and the Ecchi/Hentai genres are additionally excluded from all discovery queries at the query level.
- Native functionality beyond a website: full offline app shell, haptic feedback, on-device data persistence with backup/restore, native share-sheet export of generated rank-card images, and (if enabled in this build) push notifications for episode airings.
- The "MBTI" labels on some characters are community-consensus personality-type tags, shown only for well-known characters.
- No purchases, no ads, no third-party SDKs.
```

## Assets checklist
- [x] 1024×1024 icon PNG, RGB no alpha → `store/appstore-icon-1024.png` (drag into the Xcode asset catalog / App Store Connect)
- [ ] Screenshots, 6.7" (1290×2796) — REQUIRED, minimum 3, max 10. Take from the deployed app in a phone-sized window: Discover card, rank reveal (TAKU), Tiers with Watching countdowns, info page, share card.
- [ ] Optional: 6.5" + 5.5" sets (Connect can scale the 6.7" set for you)

## Support URL
Use the GitHub repo URL or the Pages URL. Support email: kartikaygeorg@gmail.com
