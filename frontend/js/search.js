// frontend/js/search.js

const searchInput = document.getElementById('search-input');
const suggestionsBox = document.getElementById('suggestions-box');
let debounceTimer;

// 1. Fetch live suggestions from iTunes API
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim();

  clearTimeout(debounceTimer);
  if (!query) {
    suggestionsBox.innerHTML = '';
    suggestionsBox.style.display = 'none';
    return;
  }

  // Debounce API calls by 300ms
  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`);
      const data = await res.json();
      renderSuggestions(data.results || []);
    } catch (err) {
      console.error('Error fetching iTunes suggestions:', err);
    }
  }, 300);
});

// 2. Render live suggestion dropdown items
function renderSuggestions(tracks) {
  suggestionsBox.innerHTML = '';
  if (tracks.length === 0) {
    suggestionsBox.style.display = 'none';
    return;
  }

  tracks.forEach((track) => {
    const li = document.createElement('li');
    li.style.cssText = 'display:flex; align-items:center; padding:8px; cursor:pointer; border-bottom:1px solid #eee;';
    
    li.innerHTML = `
      <img src="${track.artworkUrl60}" width="40" height="40" style="border-radius:4px; margin-right:10px;">
      <div>
        <div style="font-weight:bold; font-size:14px;">${track.trackName}</div>
        <div style="font-size:12px; color:#666;">${track.artistName}</div>
      </div>
    `;

    // 3. When clicked, pass query to backend for full song lookup
    li.addEventListener('click', () => {
      const fullQuery = `${track.trackName} ${track.artistName}`;
      suggestionsBox.style.display = 'none';
      searchInput.value = fullQuery;
      
      sendQueryToServer(fullQuery, track);
    });

    suggestionsBox.appendChild(li);
  });

  suggestionsBox.style.display = 'block';
}

// 4. Send clicked query to Express backend
async function sendQueryToServer(query, trackDetails) {
  try {
    const res = await fetch('/api/get-full-song', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        trackName: trackDetails.trackName,
        artistName: trackDetails.artistName,
      }),
    });

    const data = await res.json();
    console.log('Full song response from server:', data);
    
    if (data.streamUrl) {
      // Play full song audio or load stream URL
      playFullTrack(data.streamUrl);
    }
  } catch (err) {
    console.error('Failed to get full song from server:', err);
  }
}

function playFullTrack(url) {
  // Logic to attach stream URL to your <audio> tag or audio player UI
  console.log('Now playing full track:', url);
}