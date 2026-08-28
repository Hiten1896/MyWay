const API_BASE = import.meta.env.VITE_BACKEND_URL
    || window.MYWAY_API_BASE
    || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api'
        : 'https://<YOUR-RENDER-APP-NAME>.onrender.com/api');
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/?$/, '');
const searchInput = document.getElementById('search-input') || document.getElementById('music-search-input');
const searchButton = document.getElementById('search-button');
const suggestionBox = document.getElementById('suggestion-box') || document.getElementById('search-suggestions');
const musicResults = document.getElementById('music-results');
const musicSectionTab = document.getElementById('music-section-tab');
const musicPlayer = document.getElementById('music-player');
const musicPlayerTitle = document.getElementById('music-player-title');
const musicPlayerArtist = document.getElementById('music-player-artist');
const musicPlayerToggle = document.getElementById('music-player-toggle');
const musicPlayerPrevious = document.getElementById('music-player-previous');
const musicPlayerNext = document.getElementById('music-player-next');
const musicPlayerSeek = document.getElementById('music-player-seek');
const musicPlayerOpen = document.getElementById('music-player-open');
const musicPlayerBackdrop = document.getElementById('music-player-backdrop');
const musicExpandedClose = document.getElementById('music-expanded-close');
const musicExpandedTitle = document.getElementById('music-expanded-title');
const musicExpandedArtist = document.getElementById('music-expanded-artist');
const musicExpandedArt = document.getElementById('music-expanded-art');
const musicExpandedDuration = document.getElementById('music-expanded-duration');
const musicExpandedSeek = document.getElementById('music-expanded-seek');
const musicExpandedToggle = document.getElementById('music-expanded-toggle');
const musicPrevious = document.getElementById('music-previous');
const musicNext = document.getElementById('music-next');
const musicRepeat = document.getElementById('music-repeat');
const musicShuffle = document.getElementById('music-shuffle');
const musicHomeTab = document.getElementById('music-home-tab');
const musicLikedTab = document.getElementById('music-liked-tab');
const musicHomeView = document.getElementById('music-home-view');
const musicLikedView = document.getElementById('music-liked-view');
const musicLikedList = document.getElementById('music-liked-list');
const backendStatus = document.getElementById('backend-status');
const backendStatusLabel = document.getElementById('backend-status-label');

let currentTrack = null;
let queue = [];
let currentIndex = -1;
let isPlaying = false;
let repeatEnabled = false;
let shuffleEnabled = false;
let musicView = 'home';
let suggestionRequestId = 0;
let suggestionTimer = null;
let backendStatusTimer = null;
let streamRequestController = null;
let streamRequestId = 0;
let audio;

function createAudioPlayer() {
    const player = new Audio();
    player.preload = 'none';

    player.addEventListener('ended', () => {
        if (player !== audio) return;
        if (repeatEnabled && currentTrack) {
            player.currentTime = 0;
            player.play().catch(() => {});
            return;
        }
        if (queue.length > 1) {
            playTrackAt((currentIndex + 1) % queue.length);
            return;
        }
        isPlaying = false;
        updatePlayerControls();
    });

    player.addEventListener('error', () => {
        if (player === audio) {
            isPlaying = false;
            updatePlayerButton();
        }
    });

    player.addEventListener('loadedmetadata', () => {
        if (player !== audio) return;
        const duration = Math.floor(player.duration) || 0;
        if (musicExpandedDuration) musicExpandedDuration.textContent = formatTime(duration);
        [musicPlayerSeek, musicExpandedSeek].forEach(seek => {
            if (seek) {
                seek.max = duration;
                seek.value = 0;
            }
        });
    });

    player.addEventListener('timeupdate', () => {
        if (player !== audio || !player.duration) return;
        const position = Math.floor(player.currentTime);
        [musicPlayerSeek, musicExpandedSeek].forEach(seek => {
            if (seek && document.activeElement !== seek) seek.value = position;
        });
    });

    return player;
}

audio = createAudioPlayer();

function replaceAudioPlayer() {
    const previousAudio = audio;
    previousAudio.pause();
    previousAudio.removeAttribute('src');
    previousAudio.load();
    audio = createAudioPlayer();
}

function inMusicSection() {
    return document.body.classList.contains('music-section-active');
}

function updatePlayerButton() {
    const label = isPlaying ? 'Pause current track' : 'Play current track';
    [musicPlayerToggle, musicExpandedToggle].forEach(button => {
        if (!button) return;
        button.textContent = isPlaying ? '❚❚' : '▶';
        button.setAttribute('aria-label', label);
    });
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
}

function updateMediaSession() {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: 'MyWay Music',
        artwork: currentTrack.thumbnail ? [{ src: currentTrack.thumbnail, sizes: '512x512' }] : []
    });
}

function updatePlayerControls() {
    updatePlayerButton();
    if (currentTrack) {
        if (musicPlayerTitle) musicPlayerTitle.textContent = currentTrack.title;
        if (musicPlayerArtist) musicPlayerArtist.textContent = currentTrack.artist;
        if (musicExpandedTitle) musicExpandedTitle.textContent = currentTrack.title;
        if (musicExpandedArtist) musicExpandedArtist.textContent = currentTrack.artist;
        if (musicExpandedArt) {
            musicExpandedArt.style.backgroundImage = currentTrack.thumbnail ? `url("${currentTrack.thumbnail}")` : '';
            musicExpandedArt.textContent = currentTrack.thumbnail ? '' : '♫';
            musicExpandedArt.setAttribute('aria-label', `${currentTrack.title} artwork`);
        }
        updateMediaSession();
    }
    [musicPrevious, musicNext, musicPlayerPrevious, musicPlayerNext].forEach(button => {
        if (button) button.disabled = queue.length < 2;
    });
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
}

function seekTo(value) {
    if (!audio.duration) return;
    audio.currentTime = Number(value);
}

function renderSearchResults(videos) {
    const grid = document.getElementById('music-discovery-list');
    if (!grid) return;

    if (videos.length === 0) {
        grid.innerHTML = '<p class="music-search-message">No tracks found. Try another search.</p>';
        return;
    }

    grid.className = 'music-song-list';
    grid.innerHTML = videos.map((video, index) => `
        <article class="music-song-card">
            <img class="music-song-cover" src="${escapeHtml(video.thumbnail)}" alt="" loading="lazy">
            <div class="music-song-copy"><strong>${escapeHtml(video.title)}</strong><small>${escapeHtml(video.artist)}${video.duration ? ` · ${escapeHtml(video.duration)}` : ''}</small></div>
            <button class="music-like-btn ${isLiked(video) ? 'active' : ''}" type="button" data-like-index="${index}" aria-label="${isLiked(video) ? 'Remove' : 'Add'} ${escapeHtml(video.title)} ${isLiked(video) ? 'from' : 'to'} liked songs">${isLiked(video) ? '♥' : '♡'}</button>
            <button class="music-play-btn" type="button" data-play-index="${index}" aria-label="Play ${escapeHtml(video.title)}">▶</button>
        </article>
    `).join('');

    grid.querySelectorAll('[data-play-index]').forEach(button => {
        button.addEventListener('click', () => playTrackAt(Number(button.dataset.playIndex)));
    });
    grid.querySelectorAll('[data-like-index]').forEach(button => {
        button.addEventListener('click', () => toggleLike(videos[Number(button.dataset.likeIndex)]));
    });
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

async function searchMusic(query) {
    const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Music search failed');
    }
    const data = await response.json();
    queue = data.videos || [];
    currentIndex = -1;
    switchMusicView('home');
    renderSearchResults(queue);
}

async function loadTrendingMusic() {
    try {
        const response = await fetch(`${API_BASE}/trending`);
        if (!response.ok) throw new Error('Trending music request failed');
        const data = await response.json();
        queue = data.videos || [];
        currentIndex = -1;
        renderSearchResults(queue);
    } catch (error) {
        console.error('Trending music failed:', error);
    }
}

async function checkBackendStatus() {
    try {
        const response = await fetch(`${BACKEND_ORIGIN}/health`, { cache: 'no-store' });
        const online = response.ok;
        if (backendStatus) backendStatus.classList.toggle('online', online);
        if (backendStatusLabel) backendStatusLabel.textContent = online ? 'Online' : 'Offline';
    } catch (error) {
        if (backendStatus) backendStatus.classList.remove('online');
        if (backendStatusLabel) backendStatusLabel.textContent = 'Offline';
    }
}

function startBackendStatusMonitor() {
    checkBackendStatus();
    backendStatusTimer = window.setInterval(checkBackendStatus, 30000);
}

function closeMusicSuggestions() {
    if (!suggestionBox) return;
    suggestionBox.innerHTML = '';
    suggestionBox.style.display = 'none';
}

function getLikedSongs() {
    try {
        return JSON.parse(localStorage.getItem('myway_music_liked')) || [];
    } catch (error) {
        return [];
    }
}

function isLiked(video) {
    return getLikedSongs().some(song => song.id === video.id);
}

function toggleLike(video) {
    const likedSongs = getLikedSongs();
    const nextSongs = isLiked(video)
        ? likedSongs.filter(song => song.id !== video.id)
        : [...likedSongs, video];
    localStorage.setItem('myway_music_liked', JSON.stringify(nextSongs));
    if (musicView === 'liked') renderLikedSongs();
    if (queue.some(song => song.id === video.id)) renderSearchResults(queue);
}

function renderLikedSongs() {
    if (!musicLikedList) return;
    const likedSongs = getLikedSongs();
    if (!likedSongs.length) {
        musicLikedList.innerHTML = '<p class="music-empty-state">Songs you like will appear here.</p>';
        return;
    }

    musicLikedList.innerHTML = likedSongs.map((song, index) => `
        <article class="music-song-card">
            <img class="music-song-cover" src="${escapeHtml(song.thumbnail)}" alt="" loading="lazy">
            <div class="music-song-copy"><strong>${escapeHtml(song.title)}</strong><small>${escapeHtml(song.artist)}${song.duration ? ` · ${escapeHtml(song.duration)}` : ''}</small></div>
            <button class="music-like-btn active" type="button" data-liked-index="${index}" aria-label="Remove ${escapeHtml(song.title)} from liked songs">♥</button>
            <button class="music-play-btn" type="button" data-liked-play-index="${index}" aria-label="Play ${escapeHtml(song.title)}">▶</button>
        </article>
    `).join('');

    musicLikedList.querySelectorAll('[data-liked-play-index]').forEach(button => {
        button.addEventListener('click', () => {
            queue = getLikedSongs();
            playTrackAt(Number(button.dataset.likedPlayIndex));
        });
    });
    musicLikedList.querySelectorAll('[data-liked-index]').forEach(button => {
        button.addEventListener('click', () => toggleLike(likedSongs[Number(button.dataset.likedIndex)]));
    });
}

function switchMusicView(viewName) {
    musicView = viewName;
    const showingLiked = viewName === 'liked';
    if (musicHomeView) musicHomeView.hidden = showingLiked;
    if (musicLikedView) musicLikedView.hidden = !showingLiked;
    if (musicHomeTab) {
        musicHomeTab.classList.toggle('active', !showingLiked);
        musicHomeTab.setAttribute('aria-selected', String(!showingLiked));
    }
    if (musicLikedTab) {
        musicLikedTab.classList.toggle('active', showingLiked);
        musicLikedTab.setAttribute('aria-selected', String(showingLiked));
    }
    if (showingLiked) renderLikedSongs();
}

/* ==========================================================================
   Google (YouTube Data API v3) Integration for Live Suggestions
   Renders each suggestion strictly as "songname - singer name". Clicking
   a suggestion sends that exact "songname - singer name" string to our
   own backend (/api/search), which resolves and streams the full song —
   suggestions never play audio directly themselves.
   ========================================================================== */

// Set your Google API key (with the YouTube Data API v3 enabled) here,
// or provide it via VITE_GOOGLE_API_KEY in your .env file (preferred,
// picked up automatically by Vite), or via window.GOOGLE_API_KEY from
// config.js as a fallback for non-Vite/static deployments.
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || window.GOOGLE_API_KEY || '';

function formatSuggestionLabel(title, artist) {
    const cleanTitle = String(title || '').trim();
    const cleanArtist = String(artist || '').trim();
    return cleanArtist ? `${cleanTitle} - ${cleanArtist}` : cleanTitle;
}

async function fetchMusicSuggestions(query) {
    const requestId = ++suggestionRequestId;
    if (!query || query.trim().length < 2 || !inMusicSection()) {
        closeMusicSuggestions();
        return;
    }

    if (!GOOGLE_API_KEY) {
        console.warn('Google API key not configured; live suggestions are disabled.');
        closeMusicSuggestions();
        return;
    }

    const params = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        videoCategoryId: '10', // Music category
        maxResults: '6',
        q: `${query} song`,
        key: GOOGLE_API_KEY
    });
    const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;

    try {
        const response = await fetch(youtubeUrl);
        if (!response.ok) throw new Error('YouTube suggestions failed');

        const data = await response.json();
        if (requestId !== suggestionRequestId || !inMusicSection()) return;

        const suggestions = (data.items || [])
            .filter(item => item.id && item.id.videoId)
            .map(item => {
                const rawTitle = item.snippet?.title || '';
                const channel = item.snippet?.channelTitle || '';
                // Best-effort split of "Song - Artist" or "Artist - Song"
                // style YouTube titles; otherwise fall back to the channel
                // name as the artist.
                const dashSplit = rawTitle.split(/\s[-–—]\s/);
                let title = rawTitle;
                let artist = channel;
                if (dashSplit.length >= 2) {
                    [title, artist] = dashSplit;
                }
                return {
                    id: item.id.videoId,
                    title: title.trim(),
                    artist: artist.trim(),
                    thumbnail: item.snippet?.thumbnails?.default?.url || ''
                };
            });

        if (suggestions.length === 0) {
            closeMusicSuggestions();
            return;
        }

        if (suggestionBox) {
            suggestionBox.innerHTML = suggestions.map(track => `
                <button class="suggestion-item music-suggestion-item" type="button">
                    <div>
                        <strong>${escapeHtml(formatSuggestionLabel(track.title, track.artist))}</strong>
                    </div>
                </button>
            `).join('');

            suggestionBox.style.display = 'block';

            suggestionBox.querySelectorAll('.music-suggestion-item').forEach((item, index) => {
                item.addEventListener('click', () => {
                    const selectedTrack = suggestions[index];
                    const clickedQuery = formatSuggestionLabel(selectedTrack.title, selectedTrack.artist);

                    if (searchInput) searchInput.value = clickedQuery;
                    closeMusicSuggestions();

                    // Hand the exact clicked "songname - singer name" query
                    // to our own server so it can find and stream the song,
                    // exactly like a normal search submission.
                    searchMusic(clickedQuery).catch(error => console.error('Music search failed:', error));
                });
            });
        }
    } catch (error) {
        if (requestId === suggestionRequestId) closeMusicSuggestions();
        console.error('YouTube suggestions failed:', error);
    }
}

musicHomeTab?.addEventListener('click', () => switchMusicView('home'));
musicLikedTab?.addEventListener('click', () => switchMusicView('liked'));
musicSectionTab?.addEventListener('click', () => switchMusicView('home'));

async function playTrack(track) {
    currentTrack = track;
    currentIndex = queue.indexOf(track);
    if (currentIndex < 0) {
        queue = [track];
        currentIndex = 0;
    }
    await loadTrack(track);
}

async function playTrackAt(index) {
    if (!queue[index]) return;
    const selectedTrack = queue[index];
    const artistQueue = queue.filter(track => track.artist === selectedTrack.artist);
    if (artistQueue.length > 1) {
        queue = artistQueue;
        index = queue.findIndex(track => track.id === selectedTrack.id);
    }
    if (shuffleEnabled && queue.length > 1) {
        index = Math.floor(Math.random() * queue.length);
    }
    currentIndex = index;
    currentTrack = queue[index];
    await loadTrack(currentTrack);
}

async function loadTrack(track) {
    currentTrack = track;
    const requestId = ++streamRequestId;
    streamRequestController?.abort();
    streamRequestController = track.id ? new AbortController() : null;
    replaceAudioPlayer();
    isPlaying = false;
    if (musicPlayer) musicPlayer.hidden = false;
    updatePlayerControls();

    if (!track.id) {
        isPlaying = false;
        updatePlayerControls();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/stream?id=${encodeURIComponent(track.id)}`, {
            signal: streamRequestController.signal
        });
        if (requestId !== streamRequestId) return;
        if (!response.ok) throw new Error('Stream lookup failed');
        const data = await response.json();
        if (requestId !== streamRequestId) return;
        audio.src = data.url;
        await audio.play();
        if (requestId !== streamRequestId) {
            audio.pause();
            return;
        }
        isPlaying = true;
    } catch (error) {
        if (error.name === 'AbortError' || requestId !== streamRequestId) return;
        console.error('Track playback failed:', error);
        isPlaying = false;
    }
    updatePlayerControls();
}

async function togglePlayback() {
    if (!currentTrack) return;
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
    } else if (audio.src) {
        await audio.play();
        isPlaying = true;
    } else {
        await playTrack(currentTrack);
        return;
    }
    updatePlayerControls();
}

function openExpandedPlayer() {
    if (!currentTrack || !musicPlayerBackdrop) return;
    musicPlayerBackdrop.hidden = false;
    musicExpandedClose?.focus();
}

function closeExpandedPlayer() {
    if (musicPlayerBackdrop) musicPlayerBackdrop.hidden = true;
}

searchButton?.addEventListener('click', () => {
    const query = searchInput?.value.trim();
    if (!inMusicSection() || !query) return;
    searchMusic(query).catch(error => console.error('Music search failed:', error));
});

searchInput?.addEventListener('keydown', event => {
    if (inMusicSection() && event.key === 'Enter') {
        event.preventDefault();
        const query = searchInput.value.trim();
        if (query) searchMusic(query).catch(error => console.error('Music search failed:', error));
    }
});

searchInput?.addEventListener('input', (e) => {
    clearTimeout(suggestionTimer);
    const query = e.target.value.trim();

    if (!query) {
        closeMusicSuggestions();
        return;
    }

    if (inMusicSection()) {
        suggestionTimer = setTimeout(() => {
            fetchMusicSuggestions(query);
        }, 300);
    }
});

musicPlayerToggle?.addEventListener('click', () => {
    togglePlayback().catch(error => console.error('Playback toggle failed:', error));
});
musicPlayerPrevious?.addEventListener('click', () => {
    if (queue.length > 1) playTrackAt((currentIndex - 1 + queue.length) % queue.length);
});
musicPlayerNext?.addEventListener('click', () => {
    if (queue.length > 1) playTrackAt((currentIndex + 1) % queue.length);
});
musicPlayerSeek?.addEventListener('input', event => seekTo(event.target.value));
musicExpandedSeek?.addEventListener('input', event => seekTo(event.target.value));

musicPlayer?.addEventListener('click', event => {
    if (!event.target.closest('button, input')) openExpandedPlayer();
});
musicPlayerOpen?.addEventListener('click', openExpandedPlayer);
musicExpandedClose?.addEventListener('click', closeExpandedPlayer);
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && musicPlayerBackdrop && !musicPlayerBackdrop.hidden) closeExpandedPlayer();
});
musicPlayerBackdrop?.addEventListener('click', event => {
    if (event.target === musicPlayerBackdrop) closeExpandedPlayer();
});
musicExpandedToggle?.addEventListener('click', () => togglePlayback().catch(error => console.error(error)));
musicPrevious?.addEventListener('click', () => {
    if (queue.length > 1) playTrackAt((currentIndex - 1 + queue.length) % queue.length);
});
musicNext?.addEventListener('click', () => {
    if (queue.length > 1) playTrackAt((currentIndex + 1) % queue.length);
});
musicRepeat?.addEventListener('click', () => {
    repeatEnabled = !repeatEnabled;
    musicRepeat.classList.toggle('active', repeatEnabled);
    musicRepeat.setAttribute('aria-pressed', String(repeatEnabled));
    musicRepeat.setAttribute('aria-label', `Repeat ${repeatEnabled ? 'on' : 'off'}`);
});
musicShuffle?.addEventListener('click', () => {
    shuffleEnabled = !shuffleEnabled;
    musicShuffle.classList.toggle('active', shuffleEnabled);
    musicShuffle.setAttribute('aria-pressed', String(shuffleEnabled));
    musicShuffle.setAttribute('aria-label', `Shuffle ${shuffleEnabled ? 'on' : 'off'}`);
});

if ('mediaSession' in navigator) {
    const mediaActions = {
        play: () => togglePlayback(),
        pause: () => togglePlayback(),
        previoustrack: () => musicPrevious?.click(),
        nexttrack: () => musicNext?.click(),
        seekbackward: () => seekTo(Math.max(0, audio.currentTime - 10)),
        seekforward: () => seekTo(Math.min(audio.duration || 0, audio.currentTime + 10))
    };

    Object.entries(mediaActions).forEach(([action, handler]) => {
        try {
            navigator.mediaSession.setActionHandler(action, handler);
        } catch (error) {
            console.warn(`Media Session action not supported: ${action}`);
        }
    });
}

loadTrendingMusic();
startBackendStatusMonitor();

/* ==========================================================================
   Theme Switcher & Section Switcher
   ========================================================================== */

function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    const themeToggleLabel = document.getElementById('theme-toggle-label');

    const savedTheme = localStorage.getItem('myway_theme') || 'light';
    applyTheme(savedTheme);

    themeToggleBtn?.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });

    function applyTheme(theme) {
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (themeToggleIcon) themeToggleIcon.textContent = '☀️';
            if (themeToggleLabel) themeToggleLabel.textContent = 'Light Mode';
            if (themeColorMeta) themeColorMeta.setAttribute('content', '#121214');
        } else {
            document.documentElement.removeAttribute('data-theme');
            if (themeToggleIcon) themeToggleIcon.textContent = '🌙';
            if (themeToggleLabel) themeToggleLabel.textContent = 'Dark Mode';
            if (themeColorMeta) themeColorMeta.setAttribute('content', '#8A2BE2');
        }
        localStorage.setItem('myway_theme', theme);
    }
}

function initPrimaryNavigation() {
    const musicTab = document.getElementById('music-section-tab');
    const moviesTab = document.getElementById('movies-section-tab');
    const movieResults = document.getElementById('movie-results');
    const musicResults = document.getElementById('music-results');

    function activateMusic() {
        document.body.classList.add('music-section-active');
        musicTab?.classList.add('active');
        musicTab?.setAttribute('aria-selected', 'true');
        moviesTab?.classList.remove('active');
        moviesTab?.setAttribute('aria-selected', 'false');

        if (movieResults) movieResults.hidden = true;
        if (musicResults) musicResults.hidden = false;
    }

    function activateMovies() {
        document.body.classList.remove('music-section-active');
        moviesTab?.classList.add('active');
        moviesTab?.setAttribute('aria-selected', 'true');
        musicTab?.classList.remove('active');
        musicTab?.setAttribute('aria-selected', 'false');

        if (movieResults) movieResults.hidden = false;
        if (musicResults) musicResults.hidden = true;
    }

    musicTab?.addEventListener('click', activateMusic);
    moviesTab?.addEventListener('click', activateMovies);

    function syncToActiveTab() {
        if (musicTab?.classList.contains('active') || document.body.classList.contains('music-section-active')) {
            activateMusic();
        } else {
            activateMovies();
        }
    }

    // Sync the actual page state (body class + which <main> is visible)
    // to whichever tab the markup marks as active on load. Without this,
    // the Music tab can render as "active" while #movie-results is still
    // the one showing, #music-results stays hidden, the 3-part movies
    // navbar stays visible, and the music-only dark styling (e.g. the
    // theme-toggle button surface) never gets applied until the user
    // clicks Movies then Music again.
    syncToActiveTab();
    initPrimaryNavigation.lastSync = syncToActiveTab;
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initPrimaryNavigation();

    // Defensive re-sync: js/movies.js is a separate, independently
    // loaded classic script that renders its own default view and may
    // register its own DOMContentLoaded/async logic. If it runs after
    // (or asynchronously past) the point above and touches body classes
    // or the #movie-results/#music-results hidden state, the page can
    // visibly land on the wrong section on first load (movies navbar +
    // no music content) even though the Music tab is marked active in
    // the markup — until the user manually clicks a tab and forces a
    // fresh, correct sync. Re-running the same sync one tick later,
    // after the whole document (including all classic scripts and any
    // of their own load-time async work that resolves quickly) has
    // settled, closes that race without needing to touch movies.js.
    window.addEventListener('load', () => {
        initPrimaryNavigation.lastSync?.();
    });
});