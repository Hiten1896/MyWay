const express = require('express');
const cors = require('cors');
const path = require('path');
const ytSearch = require('yt-search');
const ytDlp = require('yt-dlp-exec');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const YTDLP_TIMEOUT_MS = 30_000;
const MUSIC_SEARCH_SUFFIX = ' official song music audio';
const NON_MUSIC_PATTERN = /\b(podcast|interview|reaction|review|commentary|news|vlog|episode|talk show|livestream|live stream|gameplay|gaming|trailer|teaser|shorts?|tutorial|documentary|prank|challenge|unboxing|influencer)\b/i;
const MUSIC_PATTERN = /\b(official (music )?(video|audio)|music video|lyrics?|audio|song|soundtrack|remix|karaoke|instrumental|cover|acoustic|slowed|sped up|nightcore|visualizer|mixtape|album)\b/i;

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: '16kb' }));
app.use(express.static(__dirname));

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

function getQuery(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeVideo(video) {
    return {
        id: video.videoId,
        title: video.title,
        artist: video.author?.name || 'Unknown artist',
        thumbnail: video.thumbnail,
        duration: video.timestamp || null,
        seconds: video.seconds || 0,
        url: video.url,
        views: video.views || 0
    };
}

function normalizeDlpVideo(video) {
    return {
        id: video.id,
        title: video.title || 'Untitled track',
        artist: video.channel || video.uploader || 'Unknown artist',
        thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
        duration: video.duration_string || null,
        seconds: video.duration || 0,
        url: video.webpage_url || `https://www.youtube.com/watch?v=${video.id}`,
        views: video.view_count || 0
    };
}

function isMusicVideo(video) {
    const title = String(video.title || '');
    const channel = String(video.artist || video.author?.name || video.channel || '');
    const duration = Number(video.seconds || 0);

    if (!title || NON_MUSIC_PATTERN.test(title) || NON_MUSIC_PATTERN.test(channel)) return false;
    if (!duration || duration > 3600) return false;
    return MUSIC_PATTERN.test(title);
}

function onlyMusic(videos) {
    return videos.filter(isMusicVideo).slice(0, 12);
}

async function searchWithFallback(query) {
    try {
        const result = await ytSearch(`${query}${MUSIC_SEARCH_SUFFIX}`);
        return onlyMusic((result.videos || []).map(normalizeVideo));
    } catch (error) {
        console.warn('yt-search failed, trying yt-dlp fallback:', error.message);
        const result = await ytDlp(`ytsearch20:${query}${MUSIC_SEARCH_SUFFIX}`, {
            dumpSingleJson: true,
            flatPlaylist: true,
            noWarnings: true,
            skipDownload: true
        });
        return onlyMusic((result.entries || []).filter(video => video.id).map(normalizeDlpVideo));
    }
}

app.get('/api/search', async (req, res) => {
    const query = getQuery(req.query.q);
    if (!query) {
        return res.status(400).json({ error: 'A search query is required.' });
    }

    try {
        const videos = await searchWithFallback(query);
        res.json({ query, videos });
    } catch (error) {
        console.error('YouTube search failed:', error.message);
        res.status(502).json({ error: 'Unable to search YouTube right now.' });
    }
});

app.get('/api/stream', async (req, res) => {
    const videoId = getQuery(req.query.id);
    if (!/^[\w-]{11}$/.test(videoId)) {
        return res.status(400).json({ error: 'A valid YouTube video ID is required.' });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    try {
        const streamUrl = await ytDlp(videoUrl, {
            noWarnings: true,
            noPlaylist: true,
            format: 'bestaudio[ext=m4a]/bestaudio/best',
            getUrl: true,
            socketTimeout: Math.floor(YTDLP_TIMEOUT_MS / 1000)
        });

        const playableUrl = String(streamUrl || '').trim();
        if (!playableUrl) {
            return res.status(404).json({ error: 'No playable audio stream was found.' });
        }

        res.json({ id: videoId, url: playableUrl });
    } catch (error) {
        console.error('YouTube stream lookup failed:', error.message);
        res.status(502).json({ error: 'Unable to prepare this track for playback.' });
    }
});

app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`MyWay server listening on http://localhost:${PORT}`);
});
