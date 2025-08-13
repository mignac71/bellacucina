// Global scoreboard management for Bella Cucina

// Prosta pamięć rezerwowa, gdy localStorage jest niedostępne
let memoryScores = {};
let storageAvailable = true;

// Load scores from localStorage or initialize default
function loadScores() {
  if (storageAvailable) {
    try {
      const stored = localStorage.getItem('bellaScores');
      if (stored) {
        try {
          memoryScores = JSON.parse(stored) || {};
        } catch (e) {
          console.error('Błąd odczytu punktów:', e);
          memoryScores = {};
        }
      } else {
        memoryScores = {};
      }
    } catch (e) {
      console.error('localStorage niedostępne, używam wartości domyślnych:', e);
      storageAvailable = false;
      memoryScores = {};
    }
  }
  return memoryScores;
}

// Save scores back to localStorage
function saveScores(scores) {
  memoryScores = scores;
  if (storageAvailable) {
    try {
      localStorage.setItem('bellaScores', JSON.stringify(scores));
    } catch (e) {
      console.error('Błąd zapisu punktów do localStorage:', e);
      storageAvailable = false;
    }
  }
}

// Update scoreboard in the DOM
function renderScoreboard() {
  const scoreboardEl = document.getElementById('scoreboard');
  if (!scoreboardEl) return;
  const scores = loadScores();
  // Clear current contents
  scoreboardEl.innerHTML = '';
  // Create player elements
  Object.keys(scores).forEach((player) => {
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player';
    const nameEl = document.createElement('h3');
    nameEl.textContent = player;
    const pointsEl = document.createElement('div');
    pointsEl.className = 'points';
    pointsEl.textContent = scores[player];
    playerDiv.appendChild(nameEl);
    playerDiv.appendChild(pointsEl);
    scoreboardEl.appendChild(playerDiv);
  });
}

// Reset scores to zero
function resetScores() {
  const scores = loadScores();
  Object.keys(scores).forEach((p) => (scores[p] = 0));
  saveScores(scores);
  renderScoreboard();
}

// Completely remove all players from the registry
function resetPlayers() {
  memoryScores = {};
  if (storageAvailable) {
    try {
      localStorage.removeItem('bellaScores');
      localStorage.removeItem('bellaCurrentPlayer');
    } catch (e) {
      console.error('Błąd kasowania graczy z localStorage:', e);
      storageAvailable = false;
    }
  }
  renderScoreboard();
}

// Add a new player with zero points
function addPlayer(name) {
  const scores = loadScores();
  if (!scores[name]) {
    scores[name] = 0;
    saveScores(scores);
    renderScoreboard();
  }
}

// Initialize scoreboard and buttons when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  renderScoreboard();
  const resetBtn = document.getElementById('reset-scores');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Czy na pewno chcesz zresetować punkty?')) {
        resetScores();
      }
    });
  }

  // Hide fallback "Home" text if the Font Awesome home icon loads
  if (document.fonts && document.fonts.check('1em "Font Awesome 6 Free"')) {
    document.querySelectorAll('.home-link .home-text').forEach((el) => {
      el.style.display = 'none';
    });
  }
});
