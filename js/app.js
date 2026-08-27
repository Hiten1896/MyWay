const API_BASE_URL = window.MYWAY_API_BASE_URL
    || (location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://<your-render-service>.onrender.com');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const suggestionBox = document.getElementById('suggestion-box');
const musicResults = document.getElementById('music-results');
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

let currentTrack = null;
let queue = [];
let currentIndex = -1;
let isPlaying = false;
let repeatEnabled = false;
let shuffleEnabled = false;
let suggestionRequestId = 0;
let suggestionTimer = null;
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
        musicExpandedDuration.textContent = formatTime(duration);
        [musicPlayerSeek, musicExpandedSeek].forEach(seek => {
            seek.max = duration;
            seek.value = 0;
        });
    });

    player.addEventListener('timeupdate', () => {
        if (player !== audio || !player.duration) return;
        const position = Math.floor(player.currentTime);
        [musicPlayerSeek, musicExpandedSeek].forEach(seek => {
            if (document.activeElement !== seek) seek.value = position;
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
}

function updatePlayerControls() {
    updatePlayerButton();
    if (currentTrack) {
        musicPlayerTitle.textContent = currentTrack.title;
        musicPlayerArtist.textContent = currentTrack.artist;
        musicExpandedTitle.textContent = currentTrack.title;
        musicExpandedArtist.textContent = currentTrack.artist;
        musicExpandedArt.style.backgroundImage = currentTrack.thumbnail ? `url("${currentTrack.thumbnail}")` : '';
        musicExpandedArt.textContent = currentTrack.thumbnail ? '' : '♫';
        musicExpandedArt.setAttribute('aria-label', `${currentTrack.title} artwork`);
    }
    [musicPrevious, musicNext, musicPlayerPrevious, musicPlayerNext].forEach(button => {
        button.disabled = queue.length < 2;
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

    grid.querySelectorAll('.music-play-btn').forEach((button, index) => {
        button.addEventListener('click', () => playTrackAt(index));
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
    queue = data.videos || [];
    currentIndex = -1;
    renderSearchResults(queue);
}

function closeMusicSuggestions() {
    if (!suggestionBox) return;
    suggestionBox.innerHTML = '';
    suggestionBox.style.display = 'none';
}

async function fetchMusicSuggestions(query) {
    const requestId = ++suggestionRequestId;
    if (!query || !inMusicSection()) {
        closeMusicSuggestions();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Music suggestions failed');
        const data = await response.json();
        if (requestId !== suggestionRequestId || !inMusicSection()) return;

        const suggestions = (data.videos || []).slice(0, 6);
        suggestionBox.innerHTML = suggestions.map(video => `
            <button class="suggestion-item music-suggestion-item" type="button">
                <strong>${escapeHtml(video.title)}</strong>
                <span>${escapeHtml(video.artist)}${video.duration ? ` · ${escapeHtml(video.duration)}` : ''}</span>
            </button>
        `).join('');
        suggestionBox.style.display = suggestions.length ? 'block' : 'none';

        suggestionBox.querySelectorAll('.music-suggestion-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                queue = suggestions;
                searchInput.value = suggestions[index].title;
                closeMusicSuggestions();
                playTrackAt(index);
            });
        });
    } catch (error) {
        if (requestId === suggestionRequestId) closeMusicSuggestions();
        console.error('Music suggestions failed:', error);
    }
}

function bindCuratedTracks() {
    document.querySelectorAll('.music-play-btn:not([data-video-id])').forEach(button => {
        button.addEventListener('click', () => {
            currentTrack = { title: button.dataset.track, artist: button.dataset.artist };
            musicPlayer.hidden = false;
            updatePlayerControls();
        });
    });
}

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
    musicPlayer.hidden = false;
    updatePlayerControls();

    if (!track.id) {
        isPlaying = false;
        updatePlayerControls();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/stream?id=${encodeURIComponent(track.id)}`, {
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
    if (!currentTrack) return;
    musicPlayerBackdrop.hidden = false;
    musicExpandedClose.focus();
}

function closeExpandedPlayer() {
    musicPlayerBackdrop.hidden = true;
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

searchInput?.addEventListener('input', () => {
    if (!inMusicSection()) return;
    clearTimeout(suggestionTimer);
    suggestionTimer = setTimeout(() => fetchMusicSuggestions(searchInput.value.trim()), 300);
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
    if (event.key === 'Escape' && !musicPlayerBackdrop.hidden) closeExpandedPlayer();
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

window.addEventListener('beforeunload', () => audio.pause());
bindCuratedTracks();
