require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ytSearch = require('yt-search');
const ytDlp = require('yt-dlp-exec');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const YTDLP_TIMEOUT_MS = 30_000;
const MUSIC_SEARCH_SUFFIX = ' official song music audio';
const TRENDING_MUSIC_QUERIES = [
    'trending songs today official music audio',
    'new music releases today official song',
    'top songs this week official music video'
];
const musicCache = new Map();
const MUSIC_CACHE_TTL_MS = 5 * 60 * 1000;

const NON_MUSIC_PATTERN = /\b(podcast|interview|reaction|review|commentary|news|vlog|episode|talk show|livestream|live stream|gameplay|gaming|trailer|teaser|shorts?|tutorial|documentary|prank|challenge|unboxing|influencer)\b/i;
const MUSIC_PATTERN = /\b(official (music )?(video|audio)|music video|lyrics?|audio|song|soundtrack|remix|karaoke|instrumental|cover|acoustic|slowed|sped up|nightcore|visualizer|mixtape|album)\b/i;

// Enable CORS & JSON payload limits
app.use(cors());
app.use(express.json({ limit: '16kb' }));

// Health Check Endpoint (monitored by the frontend header bar)
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

function normalizeGoogleVideo(item, query) {
    const snippet = item.snippet || {};
    return {
        id: item.id?.videoId,
        title: snippet.title || 'Untitled track',
        artist: snippet.channelTitle || 'Unknown artist',
        thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
        duration: null,
        seconds: 0,
        url: item.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : '',
        views: 0,
        query
    };
}

function formatDuration(value) {
    const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value || '');
    if (!match) return { duration: null, seconds: 0 };
    const seconds = Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
    return { duration: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`, seconds };
}

async function searchGoogleMusic(query, maxResults = 6) {
    if (!GOOGLE_API_KEY) return [];
    const params = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        videoCategoryId: '10',
        maxResults: String(maxResults),
        q: query,
        key: GOOGLE_API_KEY
    });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    if (!response.ok) throw new Error(`Google YouTube request failed with ${response.status}`);
    const data = await response.json();
    const videos = (data.items || [])
        .filter(item => item.id?.videoId)
        .map(item => normalizeGoogleVideo(item, query));
    if (!videos.length) return videos;

    const detailParams = new URLSearchParams({
        part: 'contentDetails',
        id: videos.map(video => video.id).join(','),
        key: GOOGLE_API_KEY
    });
    const detailResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${detailParams}`);
    if (detailResponse.ok) {
        const details = await detailResponse.json();
        const durations = new Map((details.items || []).map(item => [item.id, formatDuration(item.contentDetails?.duration)]));
        videos.forEach(video => Object.assign(video, durations.get(video.id) || {}));
    }
    return videos;
}

async function cachedMusic(key, loader) {
    const cached = musicCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const value = await loader();
    musicCache.set(key, { value, expiresAt: Date.now() + MUSIC_CACHE_TTL_MS });
    return value;
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

// 1. Trending Songs Endpoint (/api/trending)
app.get('/api/trending', async (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    try {
        if (GOOGLE_API_KEY) {
            try {
                const resultSets = await cachedMusic(`trending:${today}`, () => Promise.all(
                    TRENDING_MUSIC_QUERIES.map(query => searchGoogleMusic(`${query} ${today}`, 6))
                ));
                const seenIds = new Set();
                const videos = resultSets.flat().filter(video => {
                    if (seenIds.has(video.id)) return false;
                    seenIds.add(video.id);
                    return true;
                }).slice(0, 15);
                return res.json({ date: today, videos });
            } catch (error) {
                console.warn('Google trending failed; using YouTube search fallback:', error.message);
            }
        }
        const resultSets = await Promise.all(
            TRENDING_MUSIC_QUERIES.map(query => searchWithFallback(`${query} ${today}`))
        );
        const seenIds = new Set();
        const videos = resultSets.flat().filter(video => {
            if (seenIds.has(video.id)) return false;
            seenIds.add(video.id);
            return true;
        }).slice(0, 15);

        res.json({ date: today, videos });
    } catch (error) {
        console.error('Trending music lookup failed:', error.message);
        res.status(502).json({ error: 'Unable to load trending music right now.' });
    }
});

// 2. Google-backed live music suggestions (/api/suggestions?q=query)
app.get('/api/suggestions', async (req, res) => {
    const query = getQuery(req.query.q);
    if (!query) return res.json({ suggestions: [] });
    if (!GOOGLE_API_KEY) return res.status(503).json({ error: 'Google music search is not configured.' });

    try {
        const suggestions = await cachedMusic(`suggestion:${query.toLowerCase()}`, () => searchGoogleMusic(`${query} song`, 6));
        res.json({ query, suggestions });
    } catch (error) {
        console.error('Google suggestions lookup failed:', error.message);
        res.status(502).json({ error: 'Unable to load music suggestions right now.' });
    }
});

// 3. Music Search Endpoint (/api/search?q=query)
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

// 3. Audio Stream Resolution Endpoint (/api/stream?id=VIDEO_ID)
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

        const playableUrl = String(streamUrl || '').trim().split(/\r?\n/)[0];
        if (!playableUrl) {
            return res.status(404).json({ error: 'No playable audio stream was found.' });
        }

        res.json({ id: videoId, url: playableUrl });
    } catch (error) {
        console.error('YouTube stream lookup failed:', error.message);
        res.status(502).json({ error: 'Unable to prepare this track for playback.' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`MyWay server listening on http://localhost:${PORT}`);
});