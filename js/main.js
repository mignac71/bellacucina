// Global scoreboard management for Bella Cucina

// Prosta pamięć rezerwowa, gdy localStorage jest niedostępne
let memoryScores = { Kasia: 0, Michał: 0 };
let storageAvailable = true;

// Load scores from localStorage or initialize default
function loadScores() {
  if (storageAvailable) {
    try {
      const stored = localStorage.getItem('bellaScores');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // ensure both players exist
          memoryScores = {
            Kasia: parsed.Kasia ?? 0,
            Michał: parsed['Michał'] ?? 0,
          };
        } catch (e) {
          console.error('Błąd odczytu punktów:', e);
          memoryScores = { Kasia: 0, Michał: 0 };
        }
      } else {
        memoryScores = { Kasia: 0, Michał: 0 };
      }
    } catch (e) {
      console.error('localStorage niedostępne, używam wartości domyślnych:', e);
      storageAvailable = false;
      memoryScores = { Kasia: 0, Michał: 0 };
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
  ['Kasia', 'Michał'].forEach((player) => {
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
  const scores = { Kasia: 0, Michał: 0 };
  saveScores(scores);
  renderScoreboard();
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
});
