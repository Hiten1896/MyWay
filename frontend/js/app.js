// frontend/js/app.js - MyWay Music Discovery Engine (powered by iTunes API)

const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const suggestionBox = document.getElementById('suggestion-box');
const musicResults = document.getElementById('music-results');
const musicSectionTab = document.getElementById('music-section-tab');
const musicPlayer = document.getElementById('music-player');
const musicPlayerArt = document.querySelector('.music-player-art');
const musicPlayerNowPlaying = document.querySelector('.music-player-nowplaying');
const musicPlayerTitle = document.getElementById('music-player-title');
const musicPlayerArtist = document.getElementById('music-player-artist');
const musicPlayerToggle = document.getElementById('music-player-toggle');
const musicPlayerPrevious = document.getElementById('music-player-previous');
const musicPlayerNext = document.getElementById('music-player-next');
const musicPlayerSeek = document.getElementById('music-player-seek');
const musicPlayerElapsed = document.getElementById('music-player-elapsed');
const musicPlayerDuration = document.getElementById('music-player-duration');
const musicPlayerLike = document.getElementById('music-player-like');
const musicPlayerBackdrop = document.getElementById('music-player-backdrop');
const musicExpandedClose = document.getElementById('music-expanded-close');
const musicExpandedTitle = document.getElementById('music-expanded-title');
const musicExpandedArtist = document.getElementById('music-expanded-artist');
const musicExpandedArt = document.getElementById('music-expanded-art');
const musicExpandedDuration = document.getElementById('music-expanded-duration');
const musicExpandedSeek = document.getElementById('music-expanded-seek');
const musicExpandedToggle = document.getElementById('music-expanded-toggle');
const musicExpandedLike = document.getElementById('music-expanded-like');
const musicPrevious = document.getElementById('music-previous');
const musicNext = document.getElementById('music-next');
const musicRepeat = document.getElementById('music-repeat');
const musicShuffle = document.getElementById('music-shuffle');
const musicHomeTab = document.getElementById('music-home-tab');
const musicLikedTab = document.getElementById('music-liked-tab');
const musicHomeView = document.getElementById('music-home-view');
const musicLikedView = document.getElementById('music-liked-view');
const musicLikedList = document.getElementById('music-liked-list');
const musicDiscoveryList = document.getElementById('music-discovery-list');
const musicQueue = document.getElementById('music-queue');
const musicLanguageFilters = document.getElementById('music-language-filters');
const musicVolume = document.querySelector('.music-player-volume input');
const toastEl = document.getElementById('toast');

// State
let currentTrack = null;
let queue = [];
let currentIndex = -1;
let isPlaying = false;
let repeatEnabled = false;
let shuffleEnabled = false;
let musicView = 'home'; // 'home' | 'liked'
let musicResultsMode = 'home'; // 'home' | 'results'
let suggestionRequestId = 0;
let suggestionTimer = null;
let upNextRequestId = 0;
let toastTimer = null;

// Audio instance
const audio = new Audio();
audio.preload = 'auto';
if (musicVolume) {
    audio.volume = Number(musicVolume.value || 70) / 100;
}

// -----------------------------------------------------------------------------
// Audio Player Event Listeners
// -----------------------------------------------------------------------------

audio.addEventListener('play', () => {
    isPlaying = true;
    updatePlayerControls();
    if (currentTrack) {
        loadUpNext(currentTrack.artist, currentTrack.id);
    }
});

audio.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayerControls();
});

audio.addEventListener('ended', () => {
    if (repeatEnabled && currentTrack) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
    }
    if (queue.length > 1) {
        const nextIndex = shuffleEnabled
            ? Math.floor(Math.random() * queue.length)
            : (currentIndex + 1) % queue.length;
        playTrackAt(nextIndex);
        return;
    }
    isPlaying = false;
    updatePlayerControls();
});

audio.addEventListener('timeupdate', () => {
    const duration = audio.duration || currentTrack?.previewSeconds || 30;
    const current = audio.currentTime || 0;

    if (currentTrack && current >= currentTrack.previewSeconds) {
        audio.pause();
        audio.currentTime = 0;
        return;
    }

    if (musicPlayerElapsed) musicPlayerElapsed.textContent = formatTime(current);
    if (musicPlayerDuration) musicPlayerDuration.textContent = formatTime(duration);
    if (musicExpandedDuration) musicExpandedDuration.textContent = formatTime(duration);

    const expandedTimeEl = document.querySelector('.music-expanded-time span:first-child');
    if (expandedTimeEl) expandedTimeEl.textContent = formatTime(current);

    [musicPlayerSeek, musicExpandedSeek].forEach(seek => {
        if (seek && document.activeElement !== seek) {
            seek.max = Math.floor(duration);
            seek.value = Math.floor(current);
        }
    });

    const progressFill = document.querySelector('.music-player-progress-fill');
    if (progressFill && duration > 0) {
        progressFill.style.width = `${(current / duration) * 100}%`;
    }
});

audio.addEventListener('loadedmetadata', () => {
    const duration = audio.duration || currentTrack?.previewSeconds || 30;
    if (musicPlayerDuration) musicPlayerDuration.textContent = formatTime(duration);
    if (musicExpandedDuration) musicExpandedDuration.textContent = formatTime(duration);
    [musicPlayerSeek, musicExpandedSeek].forEach(seek => {
        if (seek) {
            seek.max = Math.floor(duration);
            seek.value = 0;
        }
    });
});

audio.addEventListener('error', (e) => {
    console.error('Audio playback error:', e);
    isPlaying = false;
    updatePlayerControls();
    showToast('Could not play preview audio for this track.');
});

// -----------------------------------------------------------------------------
// Helpers & Utilities
// -----------------------------------------------------------------------------

function inMusicSection() {
    return document.body.classList.contains('music-section-active');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toastEl.classList.remove('show');
    }, 3000);
}

// Normalize iTunes API track object
function normalizeItunesTrack(item) {
    if (!item || !item.trackId) return null;
    const rawArtwork = item.artworkUrl100 || item.artworkUrl60 || item.artworkUrl30 || '';
    // Upgrade artwork to 600x600 for sharp rendering
    const hdArtwork = rawArtwork ? rawArtwork.replace(/\/\d+x\d+bb\./, '/600x600bb.') : '';
    const durationMs = Number(item.trackTimeMillis) || 30000;
    const durationSec = Math.floor(durationMs / 1000);
    const durationStr = `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`;

    return {
        id: String(item.trackId),
        title: item.trackName || 'Untitled Track',
        artist: item.artistName || 'Unknown Artist',
        album: item.collectionName || '',
        genre: item.primaryGenreName || 'Music',
        thumbnail: hdArtwork || rawArtwork,
        previewUrl: item.previewUrl || '',
        duration: durationStr,
        previewSeconds: 30,
        trackViewUrl: item.trackViewUrl || ''
    };
}

// Query iTunes API with CORS
async function queryItunes({ term, entity = 'song', limit = 24, country = 'US' }) {
    const params = new URLSearchParams({
        term,
        entity,
        limit: String(limit),
        country
    });
    const response = await fetch(`${ITUNES_SEARCH_URL}?${params}`);
    if (!response.ok) {
        throw new Error(`iTunes API returned status ${response.status}`);
    }
    const data = await response.json();
    return (data.results || [])
        .map(normalizeItunesTrack)
        .filter(track => track && track.previewUrl);
}

// -----------------------------------------------------------------------------
// Liked Songs Management (localStorage)
// -----------------------------------------------------------------------------

const LIKED_STORAGE_KEY = 'myway_music_liked';

function getLikedSongs() {
    try {
        return JSON.parse(localStorage.getItem(LIKED_STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function isLiked(track) {
    if (!track || !track.id) return false;
    return getLikedSongs().some(song => song.id === track.id);
}

function toggleLike(track) {
    if (!track || !track.id) return;
    const liked = getLikedSongs();
    const exists = liked.some(song => song.id === track.id);
    const updated = exists
        ? liked.filter(song => song.id !== track.id)
        : [track, ...liked];

    localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(updated));
    showToast(exists ? 'Removed from Liked Songs' : 'Added to Liked Songs ♥');

    updatePlayerControls();
    if (musicView === 'liked') renderLikedSongs();
    if (queue.length) renderSearchResults(queue);
}

function renderLikedSongs() {
    if (!musicLikedList) return;
    const likedSongs = getLikedSongs();

    if (!likedSongs.length) {
        musicLikedList.innerHTML = '<p class="music-empty-state">Songs you like will appear here. Tap the heart on any song to save it!</p>';
        return;
    }

    musicLikedList.innerHTML = likedSongs.map((song, index) => `
        <article class="music-song-card">
            <img class="music-song-cover" src="${escapeHtml(song.thumbnail)}" alt="${escapeHtml(song.title)}" loading="lazy">
            <div class="music-song-copy">
                <strong>${escapeHtml(song.title)}</strong>
                <small>${escapeHtml(song.artist)}${song.genre ? ` · ${escapeHtml(song.genre)}` : ''} · 30s Preview</small>
            </div>
            <button class="music-like-btn active" type="button" data-liked-index="${index}" aria-label="Remove ${escapeHtml(song.title)} from liked songs">♥</button>
            <button class="music-play-btn" type="button" data-liked-play-index="${index}" aria-label="Play ${escapeHtml(song.title)}">▶</button>
        </article>
    `).join('');

    musicLikedList.querySelectorAll('[data-liked-play-index]').forEach(btn => {
        btn.addEventListener('click', () => {
            queue = getLikedSongs();
            playTrackAt(Number(btn.dataset.likedPlayIndex));
        });
    });

    musicLikedList.querySelectorAll('[data-liked-index]').forEach(btn => {
        btn.addEventListener('click', () => {
            const track = likedSongs[Number(btn.dataset.likedIndex)];
            toggleLike(track);
        });
    });
}

// -----------------------------------------------------------------------------
// UI Updates & Player Controls
// -----------------------------------------------------------------------------

function updatePlayerButton() {
    const icon = isPlaying ? '❚❚' : '▶';
    const label = isPlaying ? 'Pause' : 'Play';
    [musicPlayerToggle, musicExpandedToggle].forEach(button => {
        if (button) {
            button.textContent = icon;
            button.setAttribute('aria-label', label);
        }
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
        album: currentTrack.album || 'MyWay Music Discovery',
        artwork: currentTrack.thumbnail ? [{ src: currentTrack.thumbnail, sizes: '600x600', type: 'image/jpeg' }] : []
    });
}

function updatePlayerControls() {
    updatePlayerButton();

    if (currentTrack) {
        if (musicPlayerTitle) musicPlayerTitle.textContent = currentTrack.title;
        if (musicPlayerArtist) musicPlayerArtist.textContent = currentTrack.artist;
        if (musicExpandedTitle) musicExpandedTitle.textContent = currentTrack.title;
        if (musicExpandedArtist) musicExpandedArtist.textContent = `${currentTrack.artist}${currentTrack.album ? ` — ${currentTrack.album}` : ''}`;

        if (musicPlayerArt) {
            if (currentTrack.thumbnail) {
                musicPlayerArt.style.backgroundImage = `url("${currentTrack.thumbnail}")`;
                musicPlayerArt.textContent = '';
            } else {
                musicPlayerArt.style.backgroundImage = '';
                musicPlayerArt.textContent = '♫';
            }
        }

        if (musicExpandedArt) {
            if (currentTrack.thumbnail) {
                musicExpandedArt.style.backgroundImage = `url("${currentTrack.thumbnail}")`;
                musicExpandedArt.textContent = '';
                musicExpandedArt.setAttribute('aria-label', `${currentTrack.title} artwork`);
            } else {
                musicExpandedArt.style.backgroundImage = '';
                musicExpandedArt.textContent = '♫';
            }
        }

        const liked = isLiked(currentTrack);
        [musicPlayerLike, musicExpandedLike].forEach(btn => {
            if (btn) {
                btn.classList.toggle('active', liked);
                btn.setAttribute('aria-pressed', String(liked));
                btn.setAttribute('aria-label', liked ? 'Unlike this song' : 'Like this song');
            }
        });

        updateMediaSession();
    }

    [musicPrevious, musicNext, musicPlayerPrevious, musicPlayerNext].forEach(button => {
        if (button) button.disabled = queue.length < 2;
    });
}

function seekTo(seconds) {
    const sec = Number(seconds);
    if (!Number.isFinite(sec)) return;
    audio.currentTime = sec;
}

// -----------------------------------------------------------------------------
// Playback Engine
// -----------------------------------------------------------------------------

async function playTrack(track) {
    if (!track || !track.previewUrl) return;
    currentTrack = track;
    currentIndex = queue.findIndex(t => t.id === track.id);
    if (currentIndex < 0) {
        queue = [track, ...queue];
        currentIndex = 0;
    }
    await startPlayback(track);
}

async function playTrackAt(index) {
    if (!queue[index]) return;
    currentIndex = index;
    currentTrack = queue[index];
    await startPlayback(currentTrack);
}

async function startPlayback(track) {
    if (!track) return;
    if (musicPlayer) musicPlayer.hidden = false;
    updatePlayerControls();

    try {
        if (audio.src !== track.previewUrl) {
            audio.src = track.previewUrl;
            audio.load();
        }
        await audio.play();
        isPlaying = true;
        updatePlayerControls();
    } catch (error) {
        console.warn('Audio auto-play failed or interrupted:', error);
        isPlaying = false;
        updatePlayerControls();
    }
}

async function togglePlayback() {
    if (!currentTrack) {
        if (queue.length > 0) {
            await playTrackAt(0);
        }
        return;
    }

    if (isPlaying) {
        audio.pause();
    } else {
        await audio.play().catch(err => console.error('Play error:', err));
    }
    updatePlayerControls();
}

// -----------------------------------------------------------------------------
// Views & Layout Rendering
// -----------------------------------------------------------------------------

function renderSearchResults(tracks) {
    if (!musicDiscoveryList) return;

    if (!tracks.length) {
        musicDiscoveryList.className = 'music-album-grid music-song-list';
        musicDiscoveryList.innerHTML = '<p class="music-empty-state">No music found. Try another search or filter!</p>';
        return;
    }

    musicDiscoveryList.className = 'music-song-list music-discovery-list';
    musicDiscoveryList.innerHTML = tracks.map((track, index) => `
        <article class="music-song-card">
            <img class="music-song-cover" src="${escapeHtml(track.thumbnail)}" alt="${escapeHtml(track.title)}" loading="lazy">
            <div class="music-song-copy">
                <strong>${escapeHtml(track.title)}</strong>
                <small>${escapeHtml(track.artist)}${track.genre ? ` · ${escapeHtml(track.genre)}` : ''} · 30s Preview</small>
            </div>
            <button class="music-like-btn ${isLiked(track) ? 'active' : ''}" type="button" data-like-index="${index}" aria-label="${isLiked(track) ? 'Remove' : 'Add'} ${escapeHtml(track.title)} ${isLiked(track) ? 'from' : 'to'} liked songs">${isLiked(track) ? '♥' : '♡'}</button>
            <button class="music-play-btn" type="button" data-play-index="${index}" aria-label="Play 30s preview of ${escapeHtml(track.title)}">▶</button>
        </article>
    `).join('');

    musicDiscoveryList.querySelectorAll('[data-play-index]').forEach(btn => {
        btn.addEventListener('click', () => {
            playTrackAt(Number(btn.dataset.playIndex));
        });
    });

    musicDiscoveryList.querySelectorAll('[data-like-index]').forEach(btn => {
        btn.addEventListener('click', () => {
            const track = tracks[Number(btn.dataset.likeIndex)];
            toggleLike(track);
        });
    });
}

function showMusicLoading() {
    if (!musicDiscoveryList) return;
    musicDiscoveryList.className = 'music-song-list music-discovery-list music-loading-grid';
    musicDiscoveryList.innerHTML = Array.from({ length: 8 }, () => `
        <div class="music-loading-card" aria-hidden="true">
            <span class="music-loading-cover"></span>
            <span class="music-loading-line"></span>
            <span class="music-loading-line short"></span>
        </div>
    `).join('');
}

function setMusicResultsMode(mode) {
    musicResultsMode = mode;
    if (musicLanguageFilters) musicLanguageFilters.hidden = mode !== 'home';
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
    if (showingLiked) {
        renderLikedSongs();
    }
}

// -----------------------------------------------------------------------------
// Up Next Sidebar (Artist Related Tracks)
// -----------------------------------------------------------------------------

async function loadUpNext(artist, currentId) {
    if (!musicQueue || !artist) return;
    const requestId = ++upNextRequestId;
    musicQueue.hidden = false;
    musicQueue.innerHTML = '<h3 id="queue-title">Up next</h3><p class="music-empty-state">Finding more from this artist...</p>';

    try {
        const tracks = await queryItunes({ term: artist, limit: 8, country: 'US' });
        if (requestId !== upNextRequestId) return;

        const filtered = tracks.filter(t => t.id !== currentId).slice(0, 4);

        if (!filtered.length) {
            musicQueue.innerHTML = `<h3 id="queue-title">Up next</h3><p class="music-empty-state">No other previews found for ${escapeHtml(artist)}.</p>`;
            return;
        }

        musicQueue.innerHTML = `
            <h3 id="queue-title">Up next · ${escapeHtml(artist)}</h3>
            ${filtered.map((t, idx) => `
                <button class="music-track" type="button" data-queue-idx="${idx}">
                    <span class="music-track-cover">${String(idx + 1).padStart(2, '0')}</span>
                    <span>
                        <strong>${escapeHtml(t.title)}</strong>
                        <small>${escapeHtml(t.artist)} · 30s</small>
                    </span>
                </button>
            `).join('')}
        `;

        musicQueue.querySelectorAll('[data-queue-idx]').forEach(btn => {
            btn.addEventListener('click', () => {
                const track = filtered[Number(btn.dataset.queueIdx)];
                if (track) playTrack(track);
            });
        });
    } catch (err) {
        if (requestId !== upNextRequestId) return;
        musicQueue.innerHTML = '<h3 id="queue-title">Up next</h3><p class="music-empty-state">Artist preview queue is temporarily unavailable.</p>';
    }
}

// -----------------------------------------------------------------------------
// Music Discovery Feeds (Trending & Mood Categories)
// -----------------------------------------------------------------------------

const MOOD_CONFIG = {
    all: { term: 'top hits 2025', country: 'US' },
    hindi: { term: 'bollywood hindi hits', country: 'IN' },
    punjabi: { term: 'punjabi hits', country: 'IN' },
    other: { term: 'tamil telugu indie hits', country: 'IN' }
};

async function loadTrendingMusic(mood = 'all') {
    setMusicResultsMode('home');
    showMusicLoading();
    const config = MOOD_CONFIG[mood] || MOOD_CONFIG.all;

    try {
        const tracks = await queryItunes({ term: config.term, limit: 24, country: config.country });
        queue = tracks;
        currentIndex = -1;
        renderSearchResults(queue);
    } catch (error) {
        console.error('Failed to load trending music:', error);
        if (musicDiscoveryList) {
            musicDiscoveryList.innerHTML = '<p class="music-empty-state">Unable to load discovery songs right now. Please check your internet connection.</p>';
        }
    }
}

async function searchMusic(query) {
    if (!query || !query.trim()) return;
    setMusicResultsMode('results');
    showMusicLoading();
    switchMusicView('home');

    try {
        // Search globally with fallback
        let tracks = await queryItunes({ term: query.trim(), limit: 25, country: 'US' });
        if (!tracks.length) {
            tracks = await queryItunes({ term: query.trim(), limit: 25, country: 'IN' });
        }

        queue = tracks;
        currentIndex = -1;
        renderSearchResults(queue);
    } catch (error) {
        console.error('Music search failed:', error);
        if (musicDiscoveryList) {
            musicDiscoveryList.innerHTML = `<p class="music-empty-state">${escapeHtml(error.message || 'Music search failed.')}</p>`;
        }
    }
}

// Expose global search for Voice Recognition in movies.js
window.searchMusicGlobal = (query) => {
    if (searchInput) searchInput.value = query;
    searchMusic(query);
};

// -----------------------------------------------------------------------------
// Live Search Suggestions (Debounced)
// -----------------------------------------------------------------------------

function closeMusicSuggestions() {
    if (!suggestionBox) return;
    suggestionBox.innerHTML = '';
    suggestionBox.style.display = 'none';
}

async function fetchMusicSuggestions(query) {
    const requestId = ++suggestionRequestId;
    if (!query || query.trim().length < 2 || !inMusicSection()) {
        closeMusicSuggestions();
        return;
    }

    try {
        const suggestions = await queryItunes({ term: query.trim(), limit: 6, country: 'IN' });
        if (requestId !== suggestionRequestId || !inMusicSection()) return;

        if (!suggestions.length) {
            closeMusicSuggestions();
            return;
        }

        if (suggestionBox) {
            suggestionBox.innerHTML = suggestions.map((track, idx) => `
                <button class="suggestion-item music-suggestion-item" type="button" data-sugg-index="${idx}">
                    <img src="${escapeHtml(track.thumbnail)}" class="music-suggestion-thumb" alt="" style="width:36px;height:36px;border-radius:4px;margin-right:10px;object-fit:cover;">
                    <div style="text-align:left;">
                        <strong>${escapeHtml(track.title)}</strong>
                        <small style="display:block;color:var(--color-text-muted);font-size:0.75rem;">${escapeHtml(track.artist)}${track.album ? ` · ${escapeHtml(track.album)}` : ''} (30s preview)</small>
                    </div>
                </button>
            `).join('');

            suggestionBox.style.display = 'block';

            suggestionBox.querySelectorAll('.music-suggestion-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    const selected = suggestions[Number(btn.dataset.suggIndex)];
                    if (selected) {
                        if (searchInput) searchInput.value = `${selected.title} - ${selected.artist}`;
                        closeMusicSuggestions();
                        playTrack(selected);
                    }
                });
            });
        }
    } catch (err) {
        if (requestId === suggestionRequestId) closeMusicSuggestions();
    }
}

// -----------------------------------------------------------------------------
// Expanded Player Sheet Modal
// -----------------------------------------------------------------------------

function openExpandedPlayer() {
    if (musicPlayerBackdrop) {
        musicPlayerBackdrop.hidden = false;
    }
}

function closeExpandedPlayer() {
    if (musicPlayerBackdrop) {
        musicPlayerBackdrop.hidden = true;
    }
}

// -----------------------------------------------------------------------------
// Event Wiring
// -----------------------------------------------------------------------------

// Mood buttons
document.querySelectorAll('.music-mood').forEach(moodButton => {
    moodButton.addEventListener('click', () => {
        document.querySelectorAll('.music-mood').forEach(b => b.classList.remove('active'));
        moodButton.classList.add('active');
        const mood = moodButton.dataset.language || 'all';
        loadTrendingMusic(mood);
    });
});

// Search input handling
searchInput?.addEventListener('input', (e) => {
    if (!inMusicSection()) return;
    clearTimeout(suggestionTimer);
    const query = e.target.value.trim();

    if (!query) {
        closeMusicSuggestions();
        return;
    }

    suggestionTimer = setTimeout(() => {
        fetchMusicSuggestions(query);
    }, 300);
});

searchInput?.addEventListener('keydown', (e) => {
    if (!inMusicSection()) return;
    if (e.key === 'Enter') {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
            closeMusicSuggestions();
            searchMusic(query);
        }
    } else if (e.key === 'Escape') {
        closeMusicSuggestions();
    }
});

searchButton?.addEventListener('click', () => {
    if (!inMusicSection()) return;
    const query = searchInput?.value.trim();
    if (query) {
        closeMusicSuggestions();
        searchMusic(query);
    }
});

// Tab navigation
musicHomeTab?.addEventListener('click', () => {
    switchMusicView('home');
    if (musicResultsMode !== 'home') loadTrendingMusic();
});

musicLikedTab?.addEventListener('click', () => switchMusicView('liked'));
musicSectionTab?.addEventListener('click', () => switchMusicView('home'));

// Player controls
musicPlayerToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayback();
});

musicExpandedToggle?.addEventListener('click', () => togglePlayback());

musicPlayerPrevious?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (queue.length > 1) {
        playTrackAt((currentIndex - 1 + queue.length) % queue.length);
    }
});

musicPrevious?.addEventListener('click', () => {
    if (queue.length > 1) {
        playTrackAt((currentIndex - 1 + queue.length) % queue.length);
    }
});

musicPlayerNext?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (queue.length > 1) {
        playTrackAt((currentIndex + 1) % queue.length);
    }
});

musicNext?.addEventListener('click', () => {
    if (queue.length > 1) {
        playTrackAt((currentIndex + 1) % queue.length);
    }
});

musicPlayerLike?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentTrack) toggleLike(currentTrack);
});

musicExpandedLike?.addEventListener('click', () => {
    if (currentTrack) toggleLike(currentTrack);
});

musicRepeat?.addEventListener('click', () => {
    repeatEnabled = !repeatEnabled;
    musicRepeat.classList.toggle('active', repeatEnabled);
    musicRepeat.setAttribute('aria-pressed', String(repeatEnabled));
    showToast(repeatEnabled ? 'Repeat 30s preview enabled' : 'Repeat disabled');
});

musicShuffle?.addEventListener('click', () => {
    shuffleEnabled = !shuffleEnabled;
    musicShuffle.classList.toggle('active', shuffleEnabled);
    musicShuffle.setAttribute('aria-pressed', String(shuffleEnabled));
    showToast(shuffleEnabled ? 'Shuffle queue enabled' : 'Shuffle disabled');
});

// Seek sliders
musicPlayerSeek?.addEventListener('input', (e) => seekTo(e.target.value));
musicExpandedSeek?.addEventListener('input', (e) => seekTo(e.target.value));

// Volume slider
musicVolume?.addEventListener('input', (e) => {
    audio.volume = Number(e.target.value) / 100;
});

// Click mini-player to open expanded sheet
musicPlayerNowPlaying?.addEventListener('click', openExpandedPlayer);
musicPlayerArt?.addEventListener('click', openExpandedPlayer);

// Expanded player close
musicExpandedClose?.addEventListener('click', closeExpandedPlayer);
musicPlayerBackdrop?.addEventListener('click', (e) => {
    if (e.target === musicPlayerBackdrop) closeExpandedPlayer();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && musicPlayerBackdrop && !musicPlayerBackdrop.hidden) {
        closeExpandedPlayer();
    }
});

// MediaSession integration
if ('mediaSession' in navigator) {
    const actions = {
        play: () => togglePlayback(),
        pause: () => togglePlayback(),
        previoustrack: () => musicPrevious?.click(),
        nexttrack: () => musicNext?.click(),
        seekbackward: () => seekTo(Math.max(0, audio.currentTime - 5)),
        seekforward: () => seekTo(Math.min(audio.duration || 30, audio.currentTime + 5))
    };

    Object.entries(actions).forEach(([action, handler]) => {
        try {
            navigator.mediaSession.setActionHandler(action, handler);
        } catch {}
    });
}

// -----------------------------------------------------------------------------
// Initial Load
// -----------------------------------------------------------------------------
loadTrendingMusic('all');