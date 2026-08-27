# 🎬 MyWay

A dual-media discovery app combining movies and music. The Movies experience is built on the [TMDB API](https://www.themoviedb.org/documentation/api), while the Music experience searches YouTube through a Node.js backend and provides audio playback, queues, and personal likes.

**[🔗 Live Demo](https://hiten1896.github.io/MyWay/)**

---

## ✨ Features

- **Home / Spotlight** — a curated, evenly-mixed feed of trending English and Hindi movies
- **Categories** — ten genres (Action, Comedy, Horror, Romance, Sci-Fi, and more), each balanced, with a sticky scroll-spy sidebar for quick navigation
- **Search** — debounced type-ahead autosuggest plus full search, also balanced across English/Hindi results
- **Voice search** — tap the mic and speak a title (built on the browser's Web Speech API; hides itself gracefully on unsupported browsers)
- **Movie detail modal** — overview, genres, runtime, rating, top cast, and a trailer link on YouTube
- **Watchlist** — save any title with a tap of the heart icon, persisted in `localStorage` — no backend or login required
- **Music section** — a dedicated Home and Liked experience with search suggestions and compact song rows
- **Music player** — YouTube audio playback with expanded now-playing view, real seek controls, previous/next, repeat, shuffle, and immediate track switching
- **Liked songs** — save YouTube tracks to the Music Liked tab using browser `localStorage`
- **Music-only filtering** — backend filtering rejects podcasts, interviews, reactions, vlogs, influencer content, trailers, and other non-music results
- **Fully responsive** — optimized for phones, tablets, and widescreen desktops

## 🧱 Tech Stack

| Layer | Choice |
|---|---|
| Markup / Logic | HTML5 / JavaScript, served as a static frontend |
| Styling | [Tailwind CSS (CDN)](https://tailwindcss.com/) layered under a custom CSS design system in `index.html` |
| Data | [TMDB API](https://www.themoviedb.org/documentation/api) — posters, cast, trailers, metadata |
| Storage | Browser `localStorage` for the movie watchlist and liked songs |
| Music backend | Node.js, Express, CORS, `yt-search`, and `yt-dlp-exec` |
| Deployment | Frontend on Vercel; backend on Render |

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

**5. Run the development servers**
```bash
npm run dev
```
Vite starts the frontend at `http://localhost:5173`. Run the backend in a second terminal:
```bash
npm run server:dev
```
The backend runs at `http://localhost:3000`.

The Music client uses `http://localhost:3000/api` automatically on localhost. For deployment, set `window.MYWAY_API_BASE` in `js/config.js` to your Render API URL, for example:
```js
window.MYWAY_API_BASE = 'https://your-render-service.onrender.com/api';
```

**6. Deploy the backend to Render**
Use the included `render.yaml` or create a Render Web Service with:
- **Runtime:** Docker
- **Build:** handled by `Dockerfile`
- **Start command:** `npm start`
- **Environment:** `PORT` is provided by Render automatically

**7. Deploy the frontend to Vercel**
Import the repository into Vercel and use the default static build settings. The included `vercel.json` enables clean URLs. Make sure the frontend API URL points to the deployed Render service before publishing.

**8. Run the combined server locally**
```bash
npm start
```
This serves the frontend and backend together at `http://localhost:3000`.

**9. Build for production**
```bash
npm run build
```

## 📁 Project Structure

```
myway/
├── index.html          # Markup entry point
├── server.js            # Express YouTube search/stream backend
├── js/app.js            # Music search, playback, and likes client
├── js/config.js          # Frontend API URL override
├── env.js                # Optional environment/config loading helper
├── config.js            # Your real API key (created locally)
├── config.example.js    # Template for config.js — safe to commit
├── Dockerfile            # Render backend container definition
├── render.yaml           # Render service configuration
├── vercel.json            # Vercel frontend configuration
├── .github/workflows/    # GitHub Actions workflows
├── css/ , js/            # Supporting Firebase and client assets
├── manifest.json         # PWA manifest
├── sw.js                 # Service worker
├── package.json           # Project metadata and Vite scripts
└── .gitignore
```

## ⚠️ Known Limitations

- The movie watchlist and liked songs are per-browser/per-device (`localStorage`) and do not sync across devices.
- The TMDB v3 key is a client-side key by design — rate-limited, not a secret credential.
- Render free services can sleep after inactivity, so the first backend request may be delayed while the service wakes.
- YouTube stream URLs are temporary and are resolved on demand through `yt-dlp`.
- Music playback depends on YouTube availability and may be affected by third-party changes or regional restrictions.

## 🗺️ Roadmap

- [ ] Pagination for category/search results
- [ ] Optional account sync for the watchlist and liked songs
- [ ] Persistent Music playlists
- [ ] Deploy-time API URL configuration instead of editing `js/config.js`

## 🙌 Credits

Built using the [TMDB API](https://www.themoviedb.org/documentation/api). This product is not endorsed or certified by TMDB.

## 📄 License

Licensed under the [MIT License](./LICENSE).





