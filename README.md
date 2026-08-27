# 🎬 MyWay

A single-page movie discovery app built on the [TMDB API](https://www.themoviedb.org/documentation/api) — with one deliberate twist. Most TMDB demo apps default to Hollywood-only listings. MyWay doesn't: every section — the home "Spotlight," genre categories, and search results — **interleaves popular English and Hindi cinema 50/50**, giving Bollywood and Hollywood equal real estate.

**[🔗 Live Demo](https://hiten1896.github.io/MyWay/)**

---

## ✨ Features

- **Home / Spotlight** — a curated, evenly-mixed feed of trending English and Hindi movies
- **Categories** — ten genres (Action, Comedy, Horror, Romance, Sci-Fi, and more), each balanced, with a sticky scroll-spy sidebar for quick navigation
- **Search** — debounced type-ahead autosuggest plus full search, also balanced across English/Hindi results
- **Voice search** — tap the mic and speak a title (built on the browser's Web Speech API; hides itself gracefully on unsupported browsers)
- **Movie detail modal** — overview, genres, runtime, rating, top cast, and a trailer link on YouTube
- **Watchlist** — save any title with a tap of the heart icon, persisted in `localStorage` — no backend or login required
- **Fully responsive** — from phones to widescreen desktops

## 🧱 Tech Stack

| Layer | Choice |
|---|---|
| Markup / Logic | HTML5 / JavaScript, served via [Vite](https://vitejs.dev/) |
| Styling | [Tailwind CSS (CDN)](https://tailwindcss.com/) layered under a custom CSS design system in `index.html` |
| Data | [TMDB API](https://www.themoviedb.org/documentation/api) — posters, cast, trailers, metadata |
| Storage | Browser `localStorage` for the watchlist — no database, no accounts |
| Music backend | Express, `yt-search`, and `yt-dlp-exec` for YouTube search and audio stream URLs |

## 🚀 Getting Started

**1. Clone the repo**
```bash
git clone https://github.com/Hiten1896/myway.git
cd myway
```

**2. Get a free TMDB API key**
Sign up at [themoviedb.org](https://www.themoviedb.org/signup), then generate a key under **Settings → API**. This project uses the "API Key (v3 auth)".

**3. Add your key**
```bash
cp config.example.js config.js
```
Open `config.js` and paste your key:
```js
window.TMDB_API_KEY = 'your-real-key-here';
```

**4. Install dependencies**
```bash
npm install
```

**5. Run the dev server**
```bash
npm run dev
```
Vite will start a local client server and print the URL to open (typically `http://localhost:5173`). For Music search and playback, run the backend in a second terminal:
```bash
npm run server:dev
```
The backend runs at `http://localhost:3000`.

For a production-style run that serves the app and backend together:
```bash
npm start
```

**6. Build for production**
```bash
npm run build
```

## 📁 Project Structure

```
myway/
├── index.html          # Markup entry point
├── server.js            # Express YouTube search/stream backend
├── js/app.js            # Music search and playback client
├── env.js                # Optional environment/config loading helper
├── config.js            # Your real API key (created locally)
├── config.example.js    # Template for config.js — safe to commit
├── css/ , js/            # Supporting Firebase and client assets
├── manifest.json         # PWA manifest
├── sw.js                 # Service worker
├── package.json           # Project metadata and Vite scripts
└── .gitignore
```

## ⚠️ Known Limitations

- The watchlist is per-browser/per-device (`localStorage`) — it doesn't sync across devices. Deliberate trade-off to avoid needing a backend for a student project.
- The TMDB v3 key is a client-side key by design — rate-limited, not a secret credential.
- Category and search pages fetch first-page results only (no pagination yet).

## 🗺️ Roadmap

- [ ] Pagination for category/search results
- [ ] Optional account sync for the watchlist

## 🙌 Credits

Built using the [TMDB API](https://www.themoviedb.org/documentation/api). This product is not endorsed or certified by TMDB.

## 📄 License

Licensed under the [MIT License](./LICENSE).





