const API_BASE_URL = window.MYWAY_API_BASE_URL || (location.port === '3000' ? '' : 'http://localhost:3000');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const musicResults = document.getElementById('music-results');
const musicPlayer = document.getElementById('music-player');
const musicPlayerTitle = document.getElementById('music-player-title');
const musicPlayerArtist = document.getElementById('music-player-artist');
const musicPlayerToggle = document.getElementById('music-player-toggle');

let currentTrack = null;
let isPlaying = false;
const audio = new Audio();
audio.preload = 'none';

audio.addEventListener('ended', () => {
    isPlaying = false;
    updatePlayerButton();
});

audio.addEventListener('error', () => {
    isPlaying = false;
    updatePlayerButton();
});

function inMusicSection() {
    return document.body.classList.contains('music-section-active');
}

function updatePlayerButton() {
    if (!musicPlayerToggle) return;
    musicPlayerToggle.textContent = isPlaying ? '❚❚' : '▶';
    musicPlayerToggle.setAttribute('aria-label', isPlaying ? 'Pause current track' : 'Play current track');
}

function renderSearchResults(videos) {
    const grid = document.querySelector('.music-album-grid');
    if (!grid) return;

    if (videos.length === 0) {
        grid.innerHTML = '<p class="music-search-message">No tracks found. Try another search.</p>';
        return;
    }

    grid.innerHTML = videos.map(video => `
        <article class="music-album-card">
            <img class="music-album-art" src="${escapeHtml(video.thumbnail)}" alt="" loading="lazy">
            <div class="music-album-info">
                <h4>${escapeHtml(video.title)}</h4>
                <p>${escapeHtml(video.artist)}${video.duration ? ` · ${escapeHtml(video.duration)}` : ''}</p>
                <button class="music-play-btn" type="button" data-video-id="${video.id}" data-track="${escapeHtml(video.title)}" data-artist="${escapeHtml(video.artist)}" aria-label="Play ${escapeHtml(video.title)}">▶</button>
            </div>
        </article>
    `).join('');

    grid.querySelectorAll('.music-play-btn').forEach(button => {
        button.addEventListener('click', () => playTrack({
            id: button.dataset.videoId,
            title: button.dataset.track,
            artist: button.dataset.artist
        }));
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
    const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Music search failed');
    }
    const data = await response.json();
    renderSearchResults(data.videos || []);
}

function bindCuratedTracks() {
    document.querySelectorAll('.music-play-btn:not([data-video-id])').forEach(button => {
        button.addEventListener('click', () => {
            musicPlayerTitle.textContent = button.dataset.track;
            musicPlayerArtist.textContent = button.dataset.artist;
            musicPlayer.hidden = false;
        });
    });
}

async function playTrack(track) {
    currentTrack = track;
    musicPlayerTitle.textContent = track.title;
    musicPlayerArtist.textContent = track.artist;
    musicPlayer.hidden = false;

    try {
        const response = await fetch(`${API_BASE_URL}/api/stream?id=${encodeURIComponent(track.id)}`);
        if (!response.ok) throw new Error('Stream lookup failed');
        const data = await response.json();
        audio.src = data.url;
        await audio.play();
        isPlaying = true;
    } catch (error) {
        console.error('Track playback failed:', error);
        isPlaying = false;
    }
    updatePlayerButton();
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
    updatePlayerButton();
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

musicPlayerToggle?.addEventListener('click', () => {
    togglePlayback().catch(error => console.error('Playback toggle failed:', error));
});

window.addEventListener('beforeunload', () => audio.pause());
bindCuratedTracks();
