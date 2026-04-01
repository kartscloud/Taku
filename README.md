# Taku — Anime Taste Engine

A mobile-first web app that helps anime fans discover, rate, and understand their anime taste. Swipe through anime like Tinder, build tier rankings, and chat with an AI assistant that speaks as your favorite anime characters.

## Features

- **Discover (Swipe)** — Tinder-style anime cards. Right = save, Left = skip, Up = watched. Background fetcher keeps 100+ anime queued.
- **Discover (Browse)** — Netflix-style horizontal rows with a hero banner. "Picked for You", "New This Season", "Hidden Gems".
- **Search** — Keyword search with debounced queries + seasonal calendar with airing times converted to local timezone.
- **Charts** — Top Rated, Popular, Most Loved. Gold/silver/bronze rank badges for top 3.
- **My List** — Grid and tier list views. Rate anime S through F. Recommendation cards: "Best Next Watch", "Quick Start", "Like Your S-Tier".
- **Profile** — Taste archetype, genre DNA breakdown, top 5, controversial picks, estimated watch time. Generates a 1080x1920 shareable taste card.
- **Taku AI** — Powered by GPT-4o-mini with function calling. Understands anime slang (22 terms like "aura farming", "brain rot", "peak"). Can filter the feed, add/rate anime, navigate, and answer taste questions. Regex fallback if no API key.
- **Character Voices** — 10 anime character personalities (Makima, Gojo, Zero Two, Levi, etc.) via ElevenLabs TTS with Web Speech API fallback.

## Tech Stack

- **React 18** + React Router (Vite)
- **Jikan API v4** (MyAnimeList data) — rate-limited request queues
- **OpenAI API** (gpt-4o-mini) — function calling for AI actions
- **ElevenLabs API** — character voice text-to-speech
- **localStorage** — all persistence, no backend needed
- **Web Crypto API** — SHA-256 client-side auth

## Getting Started

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`.

## Configuration

Add API keys in the Settings page after signing in:

- **OpenAI API Key** — enables full Taku AI (works without it using regex fallback)
- **ElevenLabs API Key** — enables character voices (falls back to browser TTS)

## Project Structure

```
src/
  components/    Tab bar, anime cards, AI chat modal, floating action button
  pages/         Auth, Discover (Swipe/Browse), Search, Charts, My List, Profile, Settings
  utils/         Jikan API client, AI/voice engine, localStorage helpers, constants
  styles/        Global CSS with design tokens
```

## Design System

- **Warm shell** (#F5EFE6) for management screens — My List, Charts, Profile
- **Dark cinematic** (#1A1118) for engagement screens — Discover, Search
- **Brand color** — Sakura #FFB7C5
- **Typography** — Plus Jakarta Sans
- **No emojis, no icon fonts** — text labels only

## API Dependencies

| Service | Purpose | Cost |
|---------|---------|------|
| Jikan API v4 | Anime data (MAL) | Free |
| OpenAI API | Taku AI brain | ~$0.15/1M tokens |
| ElevenLabs API | Character voices | Free tier available |
