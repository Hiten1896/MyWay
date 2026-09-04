# 🎬 MyWay

A dual-media discovery app combining **Movies** and **Music**.
- **Movies Experience**: Built on the [TMDB API](https://www.themoviedb.org/documentation/api) with 50/50 interleaved Hollywood (English) and Bollywood (Hindi) cinema.
- **Music Experience**: A fast, client-side music discovery engine powered by the **Apple iTunes Search API**, providing high-quality 30-second audio previews, high-resolution album artwork, live type-ahead suggestions, mood/language filters, track queues, and personal collections.

**[🔗 Live Demo](https://hiten1896.github.io/MyWay/)**

---

## ✨ Features

### 🎬 Movies
- **Home / Spotlight** — A curated, evenly-mixed feed of trending English and Hindi movies.
- **Categories** — Ten genres (Action, Comedy, Horror, Romance, Sci-Fi, and more), each balanced with a sticky scroll-spy sidebar.
- **Search** — Debounced type-ahead autosuggest plus full search, balanced across English and Hindi cinema.
- **Voice Search** — Built on the browser's Web Speech API (supports both movie queries and music searches).
- **Movie Detail Modal** — Overview, genres, runtime, rating, top cast, and embedded YouTube trailer links.
- **Watchlist** — Save any title to `localStorage` with a single tap.

### 🎵 Music Discovery (iTunes Engine)
- **30-Second Audio Previews** — Instant, buffer-free playback of high-quality `.m4a` audio previews directly in the browser via native HTML5 Audio.
- **Mood / Language Discovery** — Filter by English (Global Top Hits), Hindi (Bollywood), Punjabi, and Regional/Indie hits.
- **Live Search & Autocomplete** — Fast debounced suggestions with track, artist, and album metadata.
- **Up Next Artist Queue** — Automatically loads other top tracks from the currently playing artist.
- **Music Player & Controls** — Floating mini-player and expanded now-playing sheet with real-time scrub bar, play/pause, next/previous, repeat, shuffle, and volume controls.
- **Liked Songs** — Save favorite tracks to the Liked collection in `localStorage`.
- **MediaSession API** — Full lockscreen controls and system media key support.
- **Zero Backend Required** — Runs 100% on the client side without needing external servers or complex streaming containers.

---

## 🧱 Tech Stack

| Layer | Choice |
|---|---|
| **Frontend Framework** | Pure HTML5 / Modern JavaScript (ES Modules), bundled with [Vite](https://vitejs.dev/) |
| **Styling** | [Tailwind CSS (CDN)](https://tailwindcss.com/) layered with a custom CSS design system and Dark/Light mode |
| **Movie Data** | [TMDB API (v3)](https://www.themoviedb.org/documentation/api) — posters, cast, trailers, metadata |
| **Music Data & Audio** | [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html) — 30s previews, HD artwork, tracks, and metadata |
| **Storage** | Browser `localStorage` for Movie Watchlist and Liked Songs |
| **Deployment** | Vercel, Netlify, or GitHub Pages (Static Hosting) |

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Hiten1896/myway.git
cd myway
```

### 2. Configure environment variables
```bash
cp .env.example .env
```
Add your free TMDB API key to `.env`:
```env
VITE_TMDB_API_KEY=your_tmdb_api_key
```

### 3. Install dependencies
```bash
npm install
```

### 4. Run the development server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 5. Build for production
```bash
npm run build
```
The compiled static assets will be output to `dist/`.

---

## 📁 Project Structure

```
myway/
├── index.html            # Main HTML markup
├── main.js               # Movie and music discovery logic and audio player
├── styles.css            # Unified design system and layout rules
├── package.json          # Vite scripts and dependencies
├── vercel.json           # Vercel deployment configuration
└── README.md
```

---

## 📄 License
Licensed under the [MIT License](./LISENCE).
