const fs = require('fs');
const path = require('path');

const apiKey = process.env.VITE_TMDB_API_KEY || process.env.TMDB_API_KEY || '';
const apiBase = process.env.VITE_BACKEND_URL || process.env.RENDER_API_URL || process.env.MYWAY_API_BASE_URL || '';

const config = [
    `window.TMDB_API_KEY = ${JSON.stringify(apiKey)};`,
    `window.MYWAY_API_BASE = ${JSON.stringify(apiBase)};`
].join('\n');

fs.writeFileSync(path.join(__dirname, '..', 'frontend', 'dist', 'config.js'), `${config}\n`);