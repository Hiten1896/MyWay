let suggestionTimer = null;
const searchInput = document.getElementById('music-search-input'); // Replace with your actual input ID

searchInput?.addEventListener('input', (e) => {
    clearTimeout(suggestionTimer);
    const query = e.target.value.trim();

    if (!query) {
        const suggestionBox = document.getElementById('search-suggestions');
        if (suggestionBox) suggestionBox.innerHTML = '';
        return;
    }

    suggestionTimer = setTimeout(() => {
        // Trigger your existing iTunes suggestion fetch function here
        if (typeof fetchMusicSuggestions === 'function') {
            fetchMusicSuggestions(query);
        }
    }, 300);
});