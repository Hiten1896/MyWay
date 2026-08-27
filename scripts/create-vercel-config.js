const fs = require('fs');
const path = require('path');

const apiBase = process.env.RENDER_API_URL || process.env.VITE_BACKEND_URL || process.env.MYWAY_API_BASE_URL || '';

const config = [
    `window.TMDB_API_KEY = ${JSON.stringify(process.env.TMDB_API_KEY || '')};`,
    `window.MYWAY_API_BASE = ${JSON.stringify(apiBase)};`
].join('\n');

fs.writeFileSync(path.join(__dirname, '..', 'frontend', 'dist', 'config.js'), `${config}\n`);