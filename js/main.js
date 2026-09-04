{
// --- CONFIGURATION ---
const API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
const API_BASE_URL = import.meta.env.VITE_TMDB_API_BASE_URL || 'https://api.themoviedb.org/3/';
const IMAGE_BASE_URL = import.meta.env.VITE_TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = import.meta.env.VITE_TMDB_BACKDROP_BASE_URL || 'https://image.tmdb.org/t/p/w780';
const PROFILE_BASE_URL = import.meta.env.VITE_TMDB_PROFILE_BASE_URL || 'https://image.tmdb.org/t/p/w185';

// --- DOM Elements ---
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const micButton = document.getElementById('mic-button'); 
const suggestionBox = document.getElementById('suggestion-box');
const homeTab = document.getElementById('home-tab');
const categoriesTab = document.getElementById('categories-tab');
const watchlistTab = document.getElementById('watchlist-tab');
const homeView = document.getElementById('home-view');
const categoriesView = document.getElementById('categories-view');
const searchView = document.getElementById('search-view');
const watchlistView = document.getElementById('watchlist-view');
const categoryIndexBar = document.getElementById('category-index-bar');
const categoryMainContent = document.getElementById('category-main-content');
const indexContent = document.getElementById('index-content');
const movieModal = document.getElementById('movie-modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const toastEl = document.getElementById('toast');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeToggleIcon = document.getElementById('theme-toggle-icon');
const moviesSectionTab = document.getElementById('movies-section-tab');
const musicSectionTab = document.getElementById('music-section-tab');
const pageNav = document.querySelector('.section-page-nav');
const movieResults = document.getElementById('movie-results');
const musicResults = document.getElementById('music-results');
const musicPlayer = document.getElementById('music-player');
const musicPlayerToggle = document.getElementById('music-player-toggle');
const musicPlayerTitle = document.getElementById('music-player-title');
const musicPlayerArtist = document.getElementById('music-player-artist');

// --- STATE ---
let currentFocus = -1; 
let genreMap = {}; 
let currentView = 'home';
let currentSection = 'movies';
let homeLoaded = false;
let categoriesLoaded = false;
let toastTimer = null;
let triggerElement = null; // Accessibility: stores element that opened modal

// Pagination State
let categoryState = {}; // { [genre_id]: { enPage: 1, hiPage: 1, loadedIds: Set } }
let searchState = { query: '', enPage: 1, hiPage: 1, loadedIds: new Set() };

// --- CATEGORIES DEFINITION (Renamed to reflect /discover popularity logic accurately) ---
const CATEGORIES_CONFIG = [
    { name: "Action", genre_id: 28 },
    { name: "Adventure", genre_id: 12 },
    { name: "Comedy", genre_id: 35 },
    { name: "Drama", genre_id: 18 }, 
    { name: "Horror", genre_id: 27 },
    { name: "Romance", genre_id: 10749 }, 
    { name: "Thriller", genre_id: 53 },
    { name: "Crime", genre_id: 80 },
    { name: "Sci-Fi", genre_id: 878 }, 
    { name: "Animation", genre_id: 16 },
];

const DISCOVER_BASE_URL = `${API_BASE_URL}discover/movie?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false`;
const MAX_RETRIES = 3;

function slugify(text) {
    return text.toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') 
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// --- DARK MODE THEME MANAGEMENT ---
function initTheme() {
    // Default is always Light Mode, regardless of the OS/browser color
    // scheme preference, unless the user has explicitly toggled it
    // before (saved in localStorage).
    const savedTheme = localStorage.getItem('myWay_theme') || 'light';
    setTheme(savedTheme);
}

function setTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeToggleIcon) themeToggleIcon.textContent = 'â˜€ï¸';
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (themeToggleIcon) themeToggleIcon.textContent = 'ðŸŒ™';
    }
    localStorage.setItem('myWay_theme', theme);
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        setTheme(current === 'dark' ? 'light' : 'dark');
    });
}

// --- WATCHLIST LOGIC ---
const WATCHLIST_STORAGE_KEY = 'myWay_watchlist_v1';
let currentWatchlist = new Set();
let watchlistData = {};

function loadWatchlistFromStorage() {
    try {
        const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
        watchlistData = raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.error('Error reading watchlist from localStorage:', error);
        watchlistData = {};
    }
    currentWatchlist = new Set(Object.keys(watchlistData).map(id => parseInt(id)));
}

function saveWatchlistToStorage() {
    try {
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlistData));
    } catch (error) {
        console.error('Error saving watchlist to localStorage:', error);
        showToast('Could not save â€” storage full or disabled.');
    }
}

function updateLikeButtons() {
    document.querySelectorAll('.like-btn').forEach(likeBtn => {
        const movieId = parseInt(likeBtn.dataset.id);
        likeBtn.classList.toggle('liked', currentWatchlist.has(movieId));
    });
    const modalBtn = document.getElementById('modal-watchlist-btn');
    if (modalBtn) {
        const liked = currentWatchlist.has(parseInt(modalBtn.dataset.id));
        modalBtn.classList.toggle('liked', liked);
        modalBtn.textContent = liked ? 'âœ“ In Watchlist' : '+ Add to Watchlist';
    }
}

function toggleWatchlist(movie) {
    const movieId = parseInt(movie.id);

    if (currentWatchlist.has(movieId)) {
        currentWatchlist.delete(movieId);
        delete watchlistData[movieId];
        showToast('Removed from Watchlist');
    } else {
        currentWatchlist.add(movieId);
        watchlistData[movieId] = {
            id: movieId,
            title: movie.title,
            poster_path: movie.poster_path,
            release_date: movie.release_date,
            vote_average: movie.vote_average,
            genre_ids: movie.genre_ids || (movie.genres ? movie.genres.map(g => g.id) : [])
        };
        showToast('Added to Watchlist');
    }

    saveWatchlistToStorage();
    updateLikeButtons();

    if (currentView === 'watchlist') {
        renderWatchlist();
    }
}

function isLiked(movieId) {
    return currentWatchlist.has(parseInt(movieId));
}

function renderWatchlist() {
    const list = Object.values(watchlistData).sort((a, b) => a.title.localeCompare(b.title));

    watchlistView.innerHTML = '';
    if (list.length === 0) {
        watchlistView.innerHTML = '<div class="message">Your watchlist is empty. Tap the heart icon on any movie to add it here.</div>';
    } else {
        displayMovies(list, "My Watchlist", watchlistView, true, 'watchlist-results');
    }
}

// --- API UTILITY FUNCTIONS (WITH HTTP 429 RATE LIMIT RETRY) ---

async function fetchWithBackoff(url) {
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response = await fetch(url);
            if (response.status === 429) {
                // Wait longer on rate limit, then retry
                const waitTime = Math.pow(2, i + 1) * 1000; // 2s, 4s, 8s
                console.warn(`Rate limited (429). Waiting ${waitTime}ms before retry ${i + 1}...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            if (response.ok) return response;
            if (i < MAX_RETRIES - 1) await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        } catch (error) {
            console.error(`Fetch attempt ${i + 1} failed for ${url}:`, error);
            if (i < MAX_RETRIES - 1) await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
    throw new Error('Failed to fetch data after multiple retries.');
}

async function fetchGenreMap() {
    const url = `${API_BASE_URL}genre/movie/list?api_key=${API_KEY}&language=en-US`;
    try {
        const response = await fetchWithBackoff(url);
        const data = await response.json();
        if (data.genres) {
            genreMap = data.genres.reduce((map, genre) => {
                map[genre.id] = genre.name;
                return map;
            }, {});
        }
    } catch (error) {
        console.error("Failed to fetch genre map:", error);
    }
}

async function fetchMovieDetailsByID(tmdbID) {
    const url = `${API_BASE_URL}movie/${tmdbID}?api_key=${API_KEY}`; 
    try {
        const response = await fetchWithBackoff(url);
        return await response.json(); 
    } catch (error) {
        console.error(`Error fetching details for ID ${tmdbID}:`, error);
        return null;
    }
}

async function fetchMovieFullDetails(tmdbID) {
    const url = `${API_BASE_URL}movie/${tmdbID}?api_key=${API_KEY}&append_to_response=credits,videos`;
    try {
        const response = await fetchWithBackoff(url);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching full details for ID ${tmdbID}:`, error);
        return null;
    }
}

// --- UI HELPERS & SKELETON LOADERS ---

function requireApiKey(container) {
    if (API_KEY) return true;
    container.innerHTML = `
        <div class="message error">
            <strong>Missing TMDB API key.</strong><br>
            Add <code>VITE_TMDB_API_KEY</code> to your <code>.env</code> file and reload the page.
        </div>`;
    return false;
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function debounce(fn, delayMs) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delayMs);
    };
}

function showToast(message) {
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function findTrailerKey(videos) {
    if (!videos || !Array.isArray(videos.results)) return null;
    const trailer = videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer')
        || videos.results.find(v => v.site === 'YouTube');
    return trailer ? trailer.key : null;
}

function renderSkeletonCards(container, count = 4) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('skeleton-wrapper-temp', 'category-grid');
    for (let i = 0; i < count; i++) {
        const card = document.createElement('div');
        card.classList.add('skeleton-card');
        card.innerHTML = `
            <div class="skeleton-poster"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
        `;
        wrapper.appendChild(card);
    }
    container.appendChild(wrapper);
    return wrapper;
}

function openTrailerModal(key) {
    const trailerModal = document.getElementById('trailer-modal');
    const trailerIframe = document.getElementById('trailer-iframe');
    trailerIframe.src = `https://www.youtube.com/embed/${key}?autoplay=1`;
    trailerModal.classList.add('open');
}

function closeTrailerModal() {
    const trailerModal = document.getElementById('trailer-modal');
    const trailerIframe = document.getElementById('trailer-iframe');
    trailerIframe.src = '';
    trailerModal.classList.remove('open');
}

// --- ACCESSIBLE MOVIE DETAIL MODAL WITH FOCUS TRAP ---

async function openMovieModal(movieId) {
    triggerElement = document.activeElement;
    movieModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    modalBody.innerHTML = `
        <div class="modal-header">
            <h2 id="modal-title-text" class="modal-title">Loading details...</h2>
        </div>
        <div class="message animate-pulse" style="box-shadow:none; margin:30px auto;">Fetching movie details...</div>
    `;

    const movie = await fetchMovieFullDetails(movieId);

    if (!movieModal.classList.contains('open')) return;

    if (!movie || movie.success === false) {
        modalBody.innerHTML = `
            <div class="modal-header">
                <h2 id="modal-title-text" class="modal-title">Error</h2>
            </div>
            <div class="message error" style="box-shadow:none; margin:30px auto;">Could not load movie details. Please try again.</div>
        `;
        return;
    }
    renderModalContent(movie);

    // Move focus into modal
    setTimeout(() => {
        const focusable = movieModal.querySelectorAll('button, a, input, [tabindex="0"]');
        if (focusable.length > 0) focusable[0].focus();
    }, 50);
}

function closeMovieModal() {
    movieModal.classList.remove('open');
    document.body.style.overflow = '';
    if (triggerElement && typeof triggerElement.focus === 'function') {
        triggerElement.focus();
    }
}

function renderModalContent(movie) {
    const poster = movie.poster_path
        ? IMAGE_BASE_URL + movie.poster_path
        : 'https://placehold.co/400x600/D1D5DB/6B7280?text=POSTER+N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
    const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null;
    const genrePills = (movie.genres || []).map(g => `<span class="genre-pill">${escapeHtml(g.name)}</span>`).join('');
    const liked = isLiked(movie.id);
    const trailerKey = findTrailerKey(movie.videos);
    const cast = (movie.credits && Array.isArray(movie.credits.cast)) ? movie.credits.cast.slice(0, 8) : [];

    modalBody.innerHTML = `
        <div class="modal-header">
            <img class="modal-poster" src="${poster}" alt="${escapeHtml(movie.title)} poster"
                 onerror="this.onerror=null;this.src='https://placehold.co/400x600/D1D5DB/6B7280?text=POSTER+N/A';">
            <div class="modal-info">
                <h2 id="modal-title-text" class="modal-title">${escapeHtml(movie.title)}</h2>
                ${movie.tagline ? `<p class="modal-tagline">"${escapeHtml(movie.tagline)}"</p>` : ''}
                <div class="modal-meta">
                    <div class="rating-box">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        ${rating}
                    </div>
                    <span class="genre-pill">${year}</span>
                    ${runtime ? `<span class="genre-pill">${runtime}</span>` : ''}
                    ${genrePills}
                </div>
                <p class="modal-overview">${movie.overview ? escapeHtml(movie.overview) : 'No overview available.'}</p>
                <div class="modal-actions">
                    <button id="modal-watchlist-btn" class="modal-watchlist-btn ${liked ? 'liked' : ''}" data-id="${movie.id}">${liked ? 'âœ“ In Watchlist' : '+ Add to Watchlist'}</button>
                    ${trailerKey ? `<button class="modal-trailer-btn" onclick="openTrailerModal('${trailerKey}')">â–¶ Watch Trailer</button>` : ''}
                </div>
            </div>
        </div>
        
        <div id="trailer-modal" class="modal-overlay" style="z-index: 100;">
            <div class="modal-card" style="max-width: 800px; padding: 0;">
                <button class="modal-close-btn" onclick="closeTrailerModal()">&times;</button>
                <div id="trailer-body" style="padding-top: 56.25%; position: relative;">
                    <iframe id="trailer-iframe" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allowfullscreen></iframe>
                </div>
            </div>
        </div>

        ${cast.length > 0 ? `
        <div class="modal-cast-section">
            <div class="modal-cast-title">Top Cast</div>
            <div class="cast-scroll">
                ${cast.map(actor => `
                    <div class="cast-member">
                        <img src="${actor.profile_path ? PROFILE_BASE_URL + actor.profile_path : 'https://placehold.co/185x185/D1D5DB/6B7280?text=%3F'}"
                             alt="${escapeHtml(actor.name)}" loading="lazy"
                             onerror="this.onerror=null;this.src='https://placehold.co/185x185/D1D5DB/6B7280?text=%3F';">
                        <div class="cast-name">${escapeHtml(actor.name)}</div>
                        <div class="cast-character">${escapeHtml(actor.character || '')}</div>
                    </div>
                `).join('')}
            </div>
        </div>` : ''}
    `;

    document.getElementById('modal-watchlist-btn').addEventListener('click', () => {
        toggleWatchlist(movie);
    });
}

modalClose.addEventListener('click', closeMovieModal);
movieModal.addEventListener('click', (e) => {
    if (e.target === movieModal) closeMovieModal();
});

// Focus Trap Keyboard Listener
movieModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && movieModal.classList.contains('open')) {
        closeMovieModal();
        return;
    }
    if (e.key === 'Tab' && movieModal.classList.contains('open')) {
        const focusables = Array.from(movieModal.querySelectorAll('button, a, input, [tabindex="0"]')).filter(el => !el.disabled && el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }
});

/**
 * Interleaves two arrays of movies in a strict 1:1 ratio.
 */
function interleaveMovies(listA, listB, limit) {
    const mixedMovies = [];
    let indexA = 0;
    let indexB = 0;

    while (mixedMovies.length < limit) {
        if (indexA < listA.length) {
            const movieA = listA[indexA++];
            if (!mixedMovies.some(m => m.id === movieA.id)) {
                mixedMovies.push(movieA);
            }
        }

        if (mixedMovies.length < limit && indexB < listB.length) {
            const movieB = listB[indexB++];
            if (!mixedMovies.some(m => m.id === movieB.id)) {
                mixedMovies.push(movieB);
            }
        }
        
        if (indexA >= listA.length && indexB >= listB.length) {
            break;
        }
    }
    return mixedMovies.slice(0, limit);
}

// --- CONTENT FETCHERS ---

async function fetchSpotlightContent(onlyRecent = false) {
    if (homeLoaded && !onlyRecent) return;
    if (!requireApiKey(homeView)) return;

    homeView.innerHTML = '<div class="message animate-pulse">Building the 50/50 Mixed Spotlight...</div>';

    try {
        const trendingUrl = `${API_BASE_URL}trending/movie/day?api_key=${API_KEY}`;
        const data = await fetchWithBackoff(trendingUrl).then(r => r.json());
        const results = data.results || [];

        // Client-side filtering
        let filteredResults = results;
        if (onlyRecent) {
            const cutoff = new Date('2025-01-01');
            filteredResults = filteredResults.filter(m => m.release_date && new Date(m.release_date) >= cutoff);
        }

        const englishMovies = filteredResults.filter(m => m.original_language === 'en').slice(0, 12);
        const hindiMovies = filteredResults.filter(m => m.original_language === 'hi').slice(0, 12);

        const spotlightMovies = interleaveMovies(hindiMovies, englishMovies, 12);

        homeView.innerHTML = '';
        if (spotlightMovies.length > 0) {
            displayMovies(spotlightMovies, "Movies of the Day", homeView);
            homeLoaded = true;
        } else {
            homeView.innerHTML = '<div class="message error">Could not load any Spotlight movies.</div>';
        }

    } catch (error) {
        console.error('An error occurred during Spotlight load:', error);
        if (error.message === 'HTTP_429_RATE_LIMIT') {
            homeView.innerHTML = '<div class="message error">Too many requests to TMDB. Please wait a moment and try again.</div>';
        } else {
            homeView.innerHTML = '<div class="message error">An error occurred while fetching the Spotlight.</div>';
        }
    }
}

async function fetchCategoryContent() {
    if (categoriesLoaded) return;
    if (!requireApiKey(categoryMainContent)) return;

    categoryMainContent.innerHTML = '<div class="message animate-pulse">Loading all balanced genre categories...</div>';
    indexContent.innerHTML = '';

    try {
        const allCategoryData = [];
        for (let i = 0; i < CATEGORIES_CONFIG.length; i++) {
            const category = CATEGORIES_CONFIG[i];
            const url = `${DISCOVER_BASE_URL}&with_genres=${category.genre_id}&primary_release_date.gte=2025-01-01&page=1`;

            try {
                const response = await fetchWithBackoff(url);
                const data = await response.json();
                allCategoryData.push({
                    name: category.name,
                    genre_id: category.genre_id,
                    movies: data.results ? data.results.slice(0, 12) : []
                });
            } catch (error) {
                console.error(`Error fetching content for ${category.name}:`, error);
                allCategoryData.push({ name: category.name, genre_id: category.genre_id, movies: [], error: true });
            }

            // Small delay between requests to avoid rate limiting
            if (i < CATEGORIES_CONFIG.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        
        categoryMainContent.innerHTML = ''; 
        
        let indexHtml = `<div class="index-header">GENRES</div>`;
        const indexLinks = [];
        let contentLoaded = false;
        
        allCategoryData.forEach(category => {
            const id = slugify(category.name);
            
            if (category.movies.length > 0) {
                indexLinks.push(`<a href="#section-${id}" class="index-item">${category.name}</a>`);
                const categoryTitle = `${category.name}`; 
                displayMovies(category.movies, categoryTitle, categoryMainContent, false, id);
                contentLoaded = true;

                // Initialize category pagination state
                const loadedSet = new Set(category.movies.map(m => m.id));
                categoryState[category.genre_id] = {
                    name: category.name,
                    idSlug: id,
                    title: categoryTitle,
                    page: 1,
                    loadedIds: loadedSet
                };

                // Add "Load More" button under category section
                const gridContainer = categoryMainContent.querySelector(`.grid-${id}`);
                if (gridContainer) {
                    const loadMoreWrap = document.createElement('div');
                    loadMoreWrap.classList.add('load-more-wrapper');
                    loadMoreWrap.id = `load-more-wrap-${id}`;
                    loadMoreWrap.innerHTML = `<button class="load-more-btn" data-genre-id="${category.genre_id}">Load More ${category.name}</button>`;
                    gridContainer.after(loadMoreWrap);

                    loadMoreWrap.querySelector('button').addEventListener('click', () => {
                        loadMoreCategoryPage(category.genre_id);
                    });
                }
            } 
        });

        if (contentLoaded) {
            indexContent.innerHTML = indexHtml + indexLinks.join('');
            categoryIndexBar.classList.remove('hidden');
            categoriesLoaded = true;
            setupIndexObserver();
        } else {
             categoryMainContent.innerHTML = '<div class="message">No trending data could be loaded for any category.</div>';
             categoryIndexBar.classList.add('hidden');
        }
        
    } catch (error) {
        console.error('An error occurred during category load:', error);
        if (error.message === 'HTTP_429_RATE_LIMIT') {
            categoryMainContent.innerHTML = '<div class="message error">Too many requests to TMDB. Please wait a moment and try again.</div>';
        } else {
            categoryMainContent.innerHTML = '<div class="message error">An unexpected error occurred while fetching categories.</div>';
        }
        categoryIndexBar.classList.add('hidden');
    }
}

async function loadMoreCategoryPage(genreId) {
    const state = categoryState[genreId];
    if (!state) return;

    const gridContainer = categoryMainContent.querySelector(`.grid-${state.idSlug}`);
    const loadMoreWrap = document.getElementById(`load-more-wrap-${state.idSlug}`);
    const btn = loadMoreWrap ? loadMoreWrap.querySelector('button') : null;

    if (!gridContainer || !btn) return;

    btn.disabled = true;
    btn.textContent = 'Loading...';

    // Render skeleton loaders inside grid
    const skeletonWrapper = renderSkeletonCards(gridContainer, 4);

    state.page += 1;

    const url = `${DISCOVER_BASE_URL}&with_genres=${genreId}&primary_release_date.gte=2025-01-01&page=${state.page}`;

    try {
        const data = await fetchWithBackoff(url).then(r => r.json()).catch(() => ({ results: [] }));
        const freshMovies = (data.results || []).filter(m => !state.loadedIds.has(m.id));

        // Remove skeleton loader
        skeletonWrapper.remove();

        if (freshMovies.length > 0) {
            freshMovies.forEach(m => state.loadedIds.add(m.id));
            appendMoviesToGrid(freshMovies, gridContainer);
            btn.disabled = false;
            btn.textContent = `Load More ${state.name}`;
        } else {
            btn.disabled = true;
            btn.textContent = 'No More Movies Available';
        }

    } catch (error) {
        console.error(`Error loading page for category ${genreId}:`, error);
        skeletonWrapper.remove();
        btn.disabled = false;
        btn.textContent = 'Try Again';
    }
}

function setupIndexObserver() {
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -80% 0px', 
        threshold: 0
    };

    const indexItems = indexContent.querySelectorAll('.index-item');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const linkHash = `#${entry.target.id}`; 
            const link = indexContent.querySelector(`a[href="${linkHash}"]`);
            
            if (entry.isIntersecting) {
                indexItems.forEach(l => l.classList.remove('active-category'));
                if (link) {
                    link.classList.add('active-category');
                }
            }
        });
    }, observerOptions);

    categoryMainContent.querySelectorAll('.section-title').forEach(element => {
        observer.observe(element);
    });

    indexItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// --- VIEW MANAGEMENT ---

function renderView(viewName) {
    currentSection = 'movies';
    currentView = viewName;

    document.querySelectorAll('.page-nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTabBtn = document.querySelector(`[data-view="${viewName}"]`);
    if (activeTabBtn) activeTabBtn.classList.add('active');

    homeView.classList.add('hidden');
    categoriesView.classList.add('hidden');
    searchView.classList.add('hidden');
    watchlistView.classList.add('hidden');
    
    if (viewName !== 'categories' || window.innerWidth < 1024) {
        categoryIndexBar.classList.add('hidden');
    } else if (viewName === 'categories') {
        categoryIndexBar.classList.remove('hidden');
    }

    searchInput.value = '';
    closeAllLists();
    
    if (viewName === 'home') {
        homeView.classList.remove('hidden');
        fetchSpotlightContent();
    } else if (viewName === 'categories') {
        categoriesView.classList.remove('hidden');
        fetchCategoryContent();
    } else if (viewName === 'watchlist') {
        watchlistView.classList.remove('hidden');
        renderWatchlist();
    }
}

homeTab.addEventListener('click', () => renderView('home'));
categoriesTab.addEventListener('click', () => renderView('categories'));
watchlistTab.addEventListener('click', () => renderView('watchlist'));

function switchSection(sectionName) {
    currentSection = sectionName;
    const isMusic = sectionName === 'music';

    moviesSectionTab.classList.toggle('active', !isMusic);
    musicSectionTab.classList.toggle('active', isMusic);
    moviesSectionTab.setAttribute('aria-selected', String(!isMusic));
    musicSectionTab.setAttribute('aria-selected', String(isMusic));
    moviesSectionTab.toggleAttribute('aria-current', !isMusic);
    musicSectionTab.toggleAttribute('aria-current', isMusic);
    document.body.classList.toggle('music-section-active', isMusic);
    pageNav.hidden = isMusic;
    movieResults.hidden = isMusic;
    musicResults.hidden = !isMusic;
    if (!isMusic) musicPlayer.hidden = true;
    searchInput.placeholder = isMusic ? 'Search for song...' : 'Search for a movie title...';
    closeAllLists();
    searchInput.value = '';
}

moviesSectionTab.addEventListener('click', () => {
    switchSection('movies');
    renderView(currentView);
});
musicSectionTab.addEventListener('click', () => switchSection('music'));

document.querySelectorAll('.music-mood').forEach(moodButton => {
    moodButton.addEventListener('click', () => {
        document.querySelectorAll('.music-mood').forEach(button => button.classList.remove('active'));
        moodButton.classList.add('active');
    });
});

// --- GENERAL SEARCH LOGIC WITH PAGINATION ---

async function searchMovies(query) {
    closeAllLists();
    
    homeView.classList.add('hidden');
    categoriesView.classList.add('hidden');
    watchlistView.classList.add('hidden');
    searchView.classList.remove('hidden');
    searchView.innerHTML = '';
    categoryIndexBar.classList.add('hidden'); 

    document.querySelectorAll('.page-nav-tab').forEach(tab => tab.classList.remove('active'));

    if (!requireApiKey(searchView)) return;

    searchState = {
        query: query,
        enPage: 1,
        hiPage: 1,
        loadedIds: new Set()
    };

    const titleSlug = 'search-results';
    displayMovies([], `Search Results for "${query}"`, searchView, true, titleSlug);

    const gridContainer = searchView.querySelector(`.grid-${titleSlug}`);
    const skeletonWrapper = renderSkeletonCards(gridContainer, 6);

    const searchUrlEn = `${API_BASE_URL}search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`; 
    const searchUrlHi = `${API_BASE_URL}search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=hi-IN&page=1`; 

    try {
        const [enResponse, hiResponse] = await Promise.all([
            fetchWithBackoff(searchUrlEn).then(r => r.json()),
            fetchWithBackoff(searchUrlHi).then(r => r.json())
        ]);

        const enResults = enResponse.results ? enResponse.results.slice(0, 5) : [];
        const hiResults = hiResponse.results ? hiResponse.results.slice(0, 5) : [];
        
        const combinedResults = interleaveMovies(hiResults, enResults, 10); 

        skeletonWrapper.remove();

        if (combinedResults.length > 0) {
            const detailPromises = combinedResults
                .filter(movie => movie.id)
                .map(movie => fetchMovieDetailsByID(movie.id));
            
            const detailedMovies = (await Promise.all(detailPromises)).filter(data => data !== null);

            if (detailedMovies.length > 0) {
                detailedMovies.forEach(m => searchState.loadedIds.add(m.id));
                appendMoviesToGrid(detailedMovies, gridContainer);

                // Add "Load More" button for search
                const loadMoreWrap = document.createElement('div');
                loadMoreWrap.classList.add('load-more-wrapper');
                loadMoreWrap.id = 'load-more-wrap-search';
                loadMoreWrap.innerHTML = `<button class="load-more-btn" id="search-load-more-btn">Load More Results</button>`;
                gridContainer.after(loadMoreWrap);

                loadMoreWrap.querySelector('button').addEventListener('click', loadMoreSearchResults);
            } else {
                searchView.innerHTML = `<div class="message error">No detailed results found for "${query}".</div>`;
            }

        } else {
            searchView.innerHTML = `<div class="message error">No mixed results found for "${query}". Try a different search term.</div>`;
        }

    } catch (error) {
        console.error('Error fetching search data:', error);
        skeletonWrapper.remove();
        if (error.message === 'HTTP_429_RATE_LIMIT') {
            searchView.innerHTML = '<div class="message error">Too many requests to TMDB. Please wait a moment and try again.</div>';
        } else {
            searchView.innerHTML = '<div class="message error">An unexpected error occurred. Check your network connection.</div>';
        }
    }
}

async function loadMoreSearchResults() {
    const loadMoreWrap = document.getElementById('load-more-wrap-search');
    const btn = loadMoreWrap ? loadMoreWrap.querySelector('button') : null;
    const gridContainer = searchView.querySelector('.category-grid');

    if (!gridContainer || !btn || !searchState.query) return;

    btn.disabled = true;
    btn.textContent = 'Loading...';

    const skeletonWrapper = renderSkeletonCards(gridContainer, 4);

    searchState.enPage += 1;
    searchState.hiPage += 1;

    const searchUrlEn = `${API_BASE_URL}search/movie?api_key=${API_KEY}&query=${encodeURIComponent(searchState.query)}&language=en-US&page=${searchState.enPage}`;
    const searchUrlHi = `${API_BASE_URL}search/movie?api_key=${API_KEY}&query=${encodeURIComponent(searchState.query)}&language=hi-IN&page=${searchState.hiPage}`;

    try {
        const [enResponse, hiResponse] = await Promise.all([
            fetchWithBackoff(searchUrlEn).then(r => r.json()).catch(() => ({ results: [] })),
            fetchWithBackoff(searchUrlHi).then(r => r.json()).catch(() => ({ results: [] }))
        ]);

        const enResults = enResponse.results || [];
        const hiResults = hiResponse.results || [];

        const combined = interleaveMovies(hiResults, enResults, 10);
        const freshCombined = combined.filter(m => !searchState.loadedIds.has(m.id));

        skeletonWrapper.remove();

        if (freshCombined.length > 0) {
            const detailPromises = freshCombined.map(movie => fetchMovieDetailsByID(movie.id));
            const detailedMovies = (await Promise.all(detailPromises)).filter(data => data !== null);

            if (detailedMovies.length > 0) {
                detailedMovies.forEach(m => searchState.loadedIds.add(m.id));
                appendMoviesToGrid(detailedMovies, gridContainer);
                btn.disabled = false;
                btn.textContent = 'Load More Results';
            } else {
                btn.disabled = true;
                btn.textContent = 'No More Results';
            }
        } else {
            btn.disabled = true;
            btn.textContent = 'No More Results';
        }

    } catch (error) {
        console.error('Error loading more search results:', error);
        skeletonWrapper.remove();
        btn.disabled = false;
        btn.textContent = error.message === 'HTTP_429_RATE_LIMIT' ? 'Rate limited â€” Retry in a moment' : 'Try Again';
    }
}

function displayMovies(movies, title, container, isSingleSearch = false, customId = null) {
    const titleSlug = customId || slugify(title);

    if (container !== categoryMainContent) {
         container.innerHTML = ''; 
    }

    let titleElement = container.querySelector(`#section-${titleSlug}`);
    if (!titleElement) {
        titleElement = document.createElement('h2');
        titleElement.classList.add('section-title');
        titleElement.textContent = title.replace(/<[^>]*>?/gm, ''); 
        titleElement.id = `section-${titleSlug}`;
        container.appendChild(titleElement);
    }

    let gridContainer = container.querySelector(`.grid-${titleSlug}`);
    if (!gridContainer) {
        gridContainer = document.createElement('div');
        gridContainer.classList.add('category-grid', `grid-${titleSlug}`);
        container.appendChild(gridContainer);
    } else {
        if (isSingleSearch) gridContainer.innerHTML = '';
    }

    if (movies && movies.length > 0) {
        appendMoviesToGrid(movies, gridContainer);
    }
}

function appendMoviesToGrid(movies, gridContainer) {
    movies.forEach(movie => {
        const movieCard = document.createElement('div');
        movieCard.classList.add('movie-card');
        movieCard.setAttribute('tabindex', '0'); // Accessible keyboard focus

        const posterPath = movie.poster_path;
        const poster = posterPath
            ? IMAGE_BASE_URL + posterPath
            : 'https://placehold.co/400x600/D1D5DB/6B7280?text=POSTER+N/A'; 
        
        const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        
        let genreName = 'N/A';
        if (movie.genres && movie.genres.length > 0) {
            genreName = movie.genres[0].name;
        } else if (movie.genre_ids && movie.genre_ids.length > 0) {
            genreName = genreMap[movie.genre_ids[0]] || 'N/A';
        }
        
        const likedClass = isLiked(movie.id) ? 'liked' : '';
        const safeTitle = escapeHtml(movie.title || 'Untitled');

        const posterHtml = `
            <div class="poster-container">
                <img src="${poster}" alt="${safeTitle} poster" 
                     onerror="this.onerror=null;this.src='https://placehold.co/400x600/D1D5DB/6B7280?text=POSTER+N/A';" 
                     loading="lazy">
                <button class="like-btn ${likedClass}" data-id="${movie.id}" title="Add to Watchlist" aria-label="Add ${safeTitle} to Watchlist">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
            </div>`;

        const infoHtml = `
            <div class="movie-info">
                <h3 class="movie-title" title="${safeTitle}">${safeTitle}</h3>
                <p class="movie-release"><span class="label">Released:</span> ${releaseYear}</p>
                <div class="card-details">
                    <p class="movie-genre"><span class="label">Genre:</span> ${escapeHtml(genreName)}</p>
                    <div class="rating-box">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" class="lucide lucide-star"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        ${rating}
                    </div>
                </div>
            </div>`;

        movieCard.innerHTML = posterHtml + infoHtml;
        gridContainer.appendChild(movieCard);

        movieCard.addEventListener('click', () => {
            openMovieModal(movie.id);
        });

        movieCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                openMovieModal(movie.id);
            }
        });

        const likeBtn = movieCard.querySelector('.like-btn');
        likeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            toggleWatchlist(movie);
        });
    });
}

// --- AUTOSUGGEST LOGIC ---
async function fetchSuggestions(query) {
    if (query.length < 3 || !API_KEY) { closeAllLists(); return; }

    const searchUrl = `${API_BASE_URL}search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=1`;
    
    try {
        const response = await fetchWithBackoff(searchUrl);
        const data = await response.json();
        
        if (data.results) {
            const suggestions = data.results.slice(0, 5); 
            displaySuggestions(suggestions, query);
        } else {
            closeAllLists();
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        closeAllLists();
    }
}

function displaySuggestions(suggestions, query) {
    closeAllLists(); 
    currentFocus = -1;

    suggestions.forEach(movie => {
        const item = document.createElement('div');
        item.classList.add('suggestion-item');
        
        const titleText = movie.title || 'Untitled Movie';
        
        const startIndex = titleText.toLowerCase().indexOf(query.toLowerCase());
        let highlightedTitle;
        if (startIndex > -1) {
            const endIndex = startIndex + query.length;
            const pre = titleText.substring(0, startIndex);
            const match = titleText.substring(startIndex, endIndex);
            const post = titleText.substring(endIndex);
            highlightedTitle = `${escapeHtml(pre)}<span class="highlight">${escapeHtml(match)}</span>${escapeHtml(post)}`;
        } else {
            highlightedTitle = escapeHtml(titleText);
        }

        const releaseYear = movie.release_date ? `(${movie.release_date.split('-')[0]})` : '';
        
        item.innerHTML = `${highlightedTitle} <span>${releaseYear}</span>`;
        
        item.addEventListener('click', function(e) {
            searchInput.value = titleText;
            searchMovies(titleText);
            closeAllLists();
        });
        
        suggestionBox.appendChild(item);
    });

    if (suggestions.length > 0) {
        suggestionBox.style.display = 'block';
    }
}

function closeAllLists(elmnt) {
    while (suggestionBox.firstChild) {
        suggestionBox.removeChild(suggestionBox.firstChild);
    }
    suggestionBox.style.display = 'none';
    currentFocus = -1;
}

function addActive(items) {
    if (!items || items.length === 0) return false;
    removeActive(items);
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (items.length - 1);
    items[currentFocus].classList.add('active');
    items[currentFocus].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function removeActive(items) {
    items.forEach(item => item.classList.remove('active'));
}

function isMoviesSectionActive() {
    return !document.body.classList.contains('music-section-active') && !movieResults.hidden;
}

// --- EVENT LISTENERS ---

const debouncedFetchSuggestions = debounce((value) => fetchSuggestions(value), 300);

searchInput.addEventListener('input', function() {
    if (!isMoviesSectionActive()) return;
    debouncedFetchSuggestions(this.value);
});

searchInput.addEventListener('keydown', function(e) {
    if (!isMoviesSectionActive()) return;
    let items = suggestionBox.querySelectorAll('.suggestion-item');
    if (e.key === 'ArrowDown') {
        currentFocus++;
        addActive(items);
    } else if (e.key === 'ArrowUp') {
        currentFocus--;
        addActive(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentFocus > -1) {
            items[currentFocus].click();
        } else if (this.value.trim() !== '') {
            searchMovies(this.value.trim());
        }
    } else if (e.key === 'Escape') {
        closeAllLists();
    }
});

searchButton.addEventListener('click', () => {
    if (!isMoviesSectionActive()) return;
    const query = searchInput.value.trim();
    if (query) {
        searchMovies(query);
    }
});

document.addEventListener('click', function (e) {
    if (e.target !== searchInput && e.target !== suggestionBox && !suggestionBox.contains(e.target)) {
        closeAllLists();
    }
});

// --- VOICE SEARCH LOGIC ---

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    micButton.addEventListener('click', () => {
        if (micButton.classList.contains('listening')) {
            recognition.stop();
        } else {
            try {
                recognition.start();
                micButton.classList.add('listening');
            } catch (error) {
                console.error('Speech recognition error:', error);
                micButton.classList.remove('listening');
            }
        }
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        searchInput.value = transcript.trim();
        if (currentSection === 'music') {
            if (typeof window.searchMusicGlobal === 'function') {
                window.searchMusicGlobal(transcript.trim());
            }
        } else {
            searchMovies(transcript.trim());
        }
    };

    recognition.onend = () => {
        micButton.classList.remove('listening');
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        micButton.classList.remove('listening');
    };
} else {
    micButton.style.display = 'none';
    console.warn('Speech Recognition API not supported in this browser.');
}

// Mirrors the hidden #music-player-seek range onto the slim mobile
// progress bar under the mini-player, and onto the desktop scrub
// bar's time labels, Spotify-style.
(function syncMiniPlayerProgress() {
    const seek = document.getElementById('music-player-seek');
    const fill = document.querySelector('.music-player-progress-fill');
    const elapsedEl = document.getElementById('music-player-elapsed');
    const durationEl = document.getElementById('music-player-duration');
    if (!seek || !fill) return;

    function formatTime(totalSeconds) {
        if (!isFinite(totalSeconds) || totalSeconds < 0) return '--:--';
        const m = Math.floor(totalSeconds / 60);
        const s = Math.floor(totalSeconds % 60);
        return m + ':' + String(s).padStart(2, '0');
    }

    function update() {
        const max = Number(seek.max) || 0;
        const val = Number(seek.value) || 0;
        const pct = max > 0 ? (val / max) * 100 : 0;
        fill.style.width = pct + '%';
        if (elapsedEl) elapsedEl.textContent = formatTime(val);
        if (durationEl) durationEl.textContent = max > 0 ? formatTime(max) : '--:--';
    }

    new MutationObserver(update).observe(seek, { attributes: true, attributeFilter: ['value', 'max'] });
    seek.addEventListener('input', update);
    update();
})();

// Prevent the new mini-player controls (like / queue / volume) from
// bubbling into any click-to-expand handler bound to #music-player.
(function guardMiniPlayerControls() {
    const guardIds = ['music-player-like'];
    guardIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', e => e.stopPropagation());
    });
    const volume = document.querySelector('.music-player-volume input');
    if (volume) volume.addEventListener('click', e => e.stopPropagation());
})();

// --- INITIALIZATION ---

async function init() {
    initTheme();
    loadWatchlistFromStorage();
    if (API_KEY) {
        await fetchGenreMap();
    }
    renderView('home');
    switchSection('music');
}

init();
}

{
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
let toastTimer = null;

// Audio instance
const audio = new Audio();
audio.preload = 'auto';
audio.crossOrigin = 'anonymous';
if (musicVolume) {
    audio.volume = Number(musicVolume.value || 70) / 100;
}

// -----------------------------------------------------------------------------
// Audio Player Event Listeners
// -----------------------------------------------------------------------------

audio.addEventListener('play', () => {
    isPlaying = true;
    updatePlayerControls();
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
    if (audio.error?.code === MediaError.MEDIA_ERR_ABORTED) return;
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
    showToast(exists ? 'Removed from Liked Songs' : 'Added to Liked Songs â™¥');

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
                <small>${escapeHtml(song.artist)}${song.genre ? ` Â· ${escapeHtml(song.genre)}` : ''} Â· 30s Preview</small>
            </div>
            <button class="music-like-btn active" type="button" data-liked-index="${index}" aria-label="Remove ${escapeHtml(song.title)} from liked songs">â™¥</button>
            <button class="music-play-btn" type="button" data-liked-play-index="${index}" aria-label="Play ${escapeHtml(song.title)}">â–¶</button>
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
    const icon = isPlaying ? 'âšâš' : 'â–¶';
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
        if (musicExpandedArtist) musicExpandedArtist.textContent = `${currentTrack.artist}${currentTrack.album ? ` â€” ${currentTrack.album}` : ''}`;

        if (musicPlayerArt) {
            if (currentTrack.thumbnail) {
                musicPlayerArt.style.backgroundImage = `url("${currentTrack.thumbnail}")`;
                musicPlayerArt.textContent = '';
            } else {
                musicPlayerArt.style.backgroundImage = '';
                musicPlayerArt.textContent = 'â™«';
            }
        }

        if (musicExpandedArt) {
            if (currentTrack.thumbnail) {
                musicExpandedArt.style.backgroundImage = `url("${currentTrack.thumbnail}")`;
                musicExpandedArt.textContent = '';
                musicExpandedArt.setAttribute('aria-label', `${currentTrack.title} artwork`);
            } else {
                musicExpandedArt.style.backgroundImage = '';
                musicExpandedArt.textContent = 'â™«';
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
            audio.removeAttribute('src');
            audio.replaceChildren();
            const source = document.createElement('source');
            source.src = track.previewUrl;
            source.type = 'audio/mp4';
            audio.appendChild(source);
            audio.load();
        }
        if (audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
            await new Promise((resolve, reject) => {
                const onReady = () => {
                    cleanup();
                    resolve();
                };
                const onError = () => {
                    cleanup();
                    reject(new Error('Preview source could not be decoded.'));
                };
                const cleanup = () => {
                    audio.removeEventListener('canplay', onReady);
                    audio.removeEventListener('error', onError);
                };
                audio.addEventListener('canplay', onReady, { once: true });
                audio.addEventListener('error', onError, { once: true });
            });
        }
        await audio.play();
        isPlaying = true;
        updatePlayerControls();
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.warn('Audio auto-play failed or interrupted:', error);
        }
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
                <small>${escapeHtml(track.artist)}${track.genre ? ` Â· ${escapeHtml(track.genre)}` : ''} Â· 30s Preview</small>
            </div>
            <button class="music-like-btn ${isLiked(track) ? 'active' : ''}" type="button" data-like-index="${index}" aria-label="${isLiked(track) ? 'Remove' : 'Add'} ${escapeHtml(track.title)} ${isLiked(track) ? 'from' : 'to'} liked songs">${isLiked(track) ? 'â™¥' : 'â™¡'}</button>
            <button class="music-play-btn" type="button" data-play-index="${index}" aria-label="Play 30s preview of ${escapeHtml(track.title)}">â–¶</button>
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
// Music Discovery Feeds (Trending & Mood Categories)
// -----------------------------------------------------------------------------

const MOOD_CONFIG = {
    all: { terms: ['global top songs 2026', 'international pop hits 2026'], country: 'US' },
    hindi: { terms: ['latest bollywood songs 2026', 'hindi film hits 2026'], country: 'IN' },
    punjabi: { terms: ['latest punjabi songs 2026', 'punjabi pop hits 2026'], country: 'IN' },
    other: { terms: ['latest tamil telugu songs 2026', 'indian regional hits 2026'], country: 'IN' }
};

function getDailyMusicTerm(term) {
    return `${term} ${new Date().toISOString().slice(0, 10)}`;
}

function mergeUniqueTracks(...trackLists) {
    const tracksById = new Map();
    const artworkKeys = new Set();
    trackLists.flat().forEach(track => {
        if (!track?.id || tracksById.has(track.id)) return;
        const artworkKey = track.thumbnail || `${track.artist}:${track.title}`;
        if (artworkKeys.has(artworkKey)) return;
        tracksById.set(track.id, track);
        artworkKeys.add(artworkKey);
    });
    return [...tracksById.values()];
}

async function loadTrendingMusic(mood = 'all') {
    setMusicResultsMode('home');
    showMusicLoading();
    const config = MOOD_CONFIG[mood] || MOOD_CONFIG.all;

    try {
        const searches = config.searches || config.terms.map((term, index) => ({
            term: index === 0 ? getDailyMusicTerm(term) : term,
            country: config.country
        }));
        const trackGroups = await Promise.all(
            searches.map(search => queryItunes({ term: search.term, limit: 30, country: search.country }))
        );
        queue = mergeUniqueTracks(...trackGroups).slice(0, 20);
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
                        <small style="display:block;color:var(--color-text-muted);font-size:0.75rem;">${escapeHtml(track.artist)}${track.album ? ` Â· ${escapeHtml(track.album)}` : ''} (30s preview)</small>
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
}

