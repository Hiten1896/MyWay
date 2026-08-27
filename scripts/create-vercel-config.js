const fs = require('fs');
const path = require('path');

const config = [
    `window.TMDB_API_KEY = ${JSON.stringify(process.env.TMDB_API_KEY || '')};`,
    `window.MYWAY_API_BASE = ${JSON.stringify(process.env.VITE_BACKEND_URL || '')};`
].join('\n');

fs.writeFileSync(path.join(__dirname, '..', 'frontend', 'dist', 'config.js'), `${config}\n`);