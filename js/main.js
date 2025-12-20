// Global scoreboard management for Bella Cucina

// ============================================
// DARK MODE MANAGEMENT
// ============================================

const DARK_MODE_KEY = 'bellaDarkMode';

function initDarkMode() {
  const savedMode = localStorage.getItem(DARK_MODE_KEY);
  if (savedMode === 'true') {
    document.documentElement.classList.add('dark');
  }
  updateDarkModeIcon();
}

function toggleDarkMode() {
  const html = document.documentElement;
  html.classList.toggle('dark');
  const isDark = html.classList.contains('dark');
  localStorage.setItem(DARK_MODE_KEY, isDark);
  updateDarkModeIcon();
}

function updateDarkModeIcon() {
  const icon = document.querySelector('.theme-toggle-icon');
  if (icon) {
    const isDark = document.documentElement.classList.contains('dark');
    icon.textContent = isDark ? '🌙' : '☀️';
  }
}

// ============================================
// PROGRESS TRACKING SYSTEM
// ============================================

const PROGRESS_KEY = 'bellaProgress';

function getProgress() {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading progress:', e);
  }
  return {
    viewedRecipes: [],
    correctAnswers: 0,
    totalAnswers: 0,
    gamesPlayed: 0,
    wordsLearned: []
  };
}

function saveProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Error saving progress:', e);
  }
}

function markRecipeViewed(recipeId) {
  const progress = getProgress();
  if (!progress.viewedRecipes.includes(recipeId)) {
    progress.viewedRecipes.push(recipeId);
    saveProgress(progress);
    renderProgress();
  }
}

function recordAnswer(isCorrect, word) {
  const progress = getProgress();
  progress.totalAnswers++;
  if (isCorrect) {
    progress.correctAnswers++;
    if (word && !progress.wordsLearned.includes(word)) {
      progress.wordsLearned.push(word);
    }
  }
  saveProgress(progress);
  renderProgress();
}

function recordGamePlayed() {
  const progress = getProgress();
  progress.gamesPlayed++;
  saveProgress(progress);
}

function getProgressPercentage() {
  const progress = getProgress();
  // Assume total of 100 recipes and 500 words to learn
  const recipeProgress = Math.min(progress.viewedRecipes.length / 100, 1);
  const wordProgress = Math.min(progress.wordsLearned.length / 200, 1);
  const accuracyProgress = progress.totalAnswers > 0
    ? progress.correctAnswers / progress.totalAnswers
    : 0;

  // Weighted average: 30% recipes, 50% words, 20% accuracy
  return Math.round((recipeProgress * 30 + wordProgress * 50 + accuracyProgress * 20));
}

function renderProgress() {
  const container = document.getElementById('progress-display');
  if (!container) return;

  const progress = getProgress();
  const percentage = getProgressPercentage();

  container.innerHTML = `
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${percentage}%"></div>
    </div>
    <div class="progress-stats">
      <div class="progress-stat">
        <div class="progress-stat-value">${progress.viewedRecipes.length}</div>
        <div>Przepisów</div>
      </div>
      <div class="progress-stat">
        <div class="progress-stat-value">${progress.wordsLearned.length}</div>
        <div>Słówek</div>
      </div>
      <div class="progress-stat">
        <div class="progress-stat-value">${progress.gamesPlayed}</div>
        <div>Gier</div>
      </div>
    </div>
  `;
}

// Export functions for use in other scripts
window.markRecipeViewed = markRecipeViewed;
window.recordAnswer = recordAnswer;
window.recordGamePlayed = recordGamePlayed;
window.getProgress = getProgress;
window.toggleDarkMode = toggleDarkMode;

// ============================================
// SCOREBOARD MANAGEMENT
// ============================================
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
  // Initialize dark mode
  initDarkMode();

  // Initialize progress display
  renderProgress();

  // Theme toggle button
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleDarkMode);
  }

  renderScoreboard();
  const resetBtn = document.getElementById('reset-scores');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Czy na pewno chcesz zresetować punkty?')) {
        resetScores();
      }
    });
  }

  const resetPlayersBtn = document.getElementById('reset-players');
  if (resetPlayersBtn) {
    resetPlayersBtn.addEventListener('click', () => {
      if (confirm('Czy na pewno chcesz skasować rejestr graczy?')) {
        resetPlayers();
      }
    });
  }
});
