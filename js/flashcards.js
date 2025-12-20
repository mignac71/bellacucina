// Flashcards module for Bella Cucina
// Provides spaced repetition learning for Italian culinary vocabulary

let allWords = [];
let currentDeck = [];
let currentIndex = 0;
let flashcardStats = {};

const FLASHCARD_STATS_KEY = 'bellaFlashcardStats';

// Load flashcard statistics from localStorage
function loadFlashcardStats() {
    try {
        const saved = localStorage.getItem(FLASHCARD_STATS_KEY);
        if (saved) {
            flashcardStats = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading flashcard stats:', e);
        flashcardStats = {};
    }
    return flashcardStats;
}

// Save flashcard statistics
function saveFlashcardStats() {
    try {
        localStorage.setItem(FLASHCARD_STATS_KEY, JSON.stringify(flashcardStats));
    } catch (e) {
        console.error('Error saving flashcard stats:', e);
    }
}

// Extract unique words from recipes data
function extractWords() {
    if (!Array.isArray(window.recipesData)) {
        console.error('Recipe data not available');
        return [];
    }

    const wordMap = new Map();
    window.recipesData.forEach(recipe => {
        recipe.ingredients.forEach(ing => {
            const key = `${ing.it}|${ing.pl}`;
            if (!wordMap.has(key)) {
                wordMap.set(key, { it: ing.it, pl: ing.pl });
            }
        });
    });

    return Array.from(wordMap.values());
}

// Shuffle array using Fisher-Yates algorithm
function shuffle(arr) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// Get deck based on mode
function getDeck(mode) {
    loadFlashcardStats();

    switch (mode) {
        case 'difficult':
            // Words with more wrong answers than right
            return allWords.filter(word => {
                const stats = flashcardStats[word.it] || { right: 0, wrong: 0 };
                return stats.wrong > stats.right;
            });
        case 'new':
            // Words never practiced
            return allWords.filter(word => !flashcardStats[word.it]);
        default:
            return allWords;
    }
}

// Initialize flashcards module
function initFlashcards() {
    allWords = extractWords();
    loadFlashcardStats();

    // Set up deck
    currentDeck = shuffle(getDeck('all'));
    currentIndex = 0;

    // Set up event listeners
    const flashcard = document.getElementById('flashcard');
    if (flashcard) {
        flashcard.addEventListener('click', flipCard);
    }

    const knowBtn = document.getElementById('btn-know');
    if (knowBtn) {
        knowBtn.addEventListener('click', () => markWord(true));
    }

    const dontKnowBtn = document.getElementById('btn-dont-know');
    if (dontKnowBtn) {
        dontKnowBtn.addEventListener('click', () => markWord(false));
    }

    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const mode = btn.dataset.mode;
            currentDeck = shuffle(getDeck(mode));
            currentIndex = 0;

            if (currentDeck.length === 0) {
                showEmptyDeckMessage(mode);
            } else {
                showCard();
            }
        });
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            flipCard();
        } else if (e.key === 'ArrowRight' || e.key === 'k') {
            markWord(true);
        } else if (e.key === 'ArrowLeft' || e.key === 'j') {
            markWord(false);
        }
    });

    // Show first card
    if (currentDeck.length > 0) {
        showCard();
    } else {
        showEmptyDeckMessage('all');
    }
}

// Show current card
function showCard() {
    if (currentIndex >= currentDeck.length) {
        showCompletionMessage();
        return;
    }

    const word = currentDeck[currentIndex];
    const frontWord = document.getElementById('flashcard-front-word');
    const backWord = document.getElementById('flashcard-back-word');
    const flashcard = document.getElementById('flashcard');

    // Update card content
    frontWord.textContent = word.it;
    backWord.textContent = word.pl;

    // Reset flip state
    flashcard.classList.remove('flipped');

    // Update progress
    updateProgress();
}

// Flip card
function flipCard() {
    const flashcard = document.getElementById('flashcard');
    flashcard.classList.toggle('flipped');

    // Pronounce Italian word when showing front
    if (!flashcard.classList.contains('flipped')) {
        const word = currentDeck[currentIndex];
        if (word && typeof pronounceItalian === 'function') {
            pronounceItalian(word.it);
        }
    }
}

// Mark word as known or unknown
function markWord(known) {
    const word = currentDeck[currentIndex];
    if (!word) return;

    // Update statistics
    if (!flashcardStats[word.it]) {
        flashcardStats[word.it] = { right: 0, wrong: 0 };
    }

    if (known) {
        flashcardStats[word.it].right++;
        // Record for global progress
        if (typeof recordAnswer === 'function') {
            recordAnswer(true, word.it);
        }
    } else {
        flashcardStats[word.it].wrong++;
        if (typeof recordAnswer === 'function') {
            recordAnswer(false, word.it);
        }
    }

    saveFlashcardStats();

    // Animate button
    const btn = known ? document.getElementById('btn-know') : document.getElementById('btn-dont-know');
    btn.classList.add('animate-pulse');
    setTimeout(() => btn.classList.remove('animate-pulse'), 500);

    // Next card
    currentIndex++;
    showCard();
}

// Update progress display
function updateProgress() {
    const progressEl = document.getElementById('flashcard-progress');
    if (!progressEl) return;

    const known = Object.values(flashcardStats).filter(s => s.right > s.wrong).length;
    const total = allWords.length;

    progressEl.innerHTML = `
    <strong>${currentIndex + 1}</strong> / ${currentDeck.length} 
    <span style="margin-left: 20px;">📚 Opanowane: ${known} / ${total}</span>
  `;
}

// Show completion message
function showCompletionMessage() {
    const container = document.getElementById('flashcards-container');
    const known = Object.values(flashcardStats).filter(s => s.right > s.wrong).length;

    container.innerHTML = `
    <div class="results-card" style="margin: 40px auto;">
      <h2>🎉 Gratulacje!</h2>
      <p class="results-message">Ukończyłeś tę sesję fiszek!</p>
      <div class="results-score">${known}</div>
      <p>słówek opanowanych</p>
      <button class="submit-btn" onclick="location.reload()">
        Zacznij od nowa
      </button>
    </div>
  `;

    // Record game played
    if (typeof recordGamePlayed === 'function') {
        recordGamePlayed();
    }
}

// Show empty deck message
function showEmptyDeckMessage(mode) {
    const wrapper = document.getElementById('flashcard-wrapper');
    let message = '';

    switch (mode) {
        case 'difficult':
            message = 'Brak trudnych słówek! Wszystko idzie świetnie! 🌟';
            break;
        case 'new':
            message = 'Wszystkie słówka zostały już przećwiczone! 🎓';
            break;
        default:
            message = 'Brak słówek do nauki.';
    }

    wrapper.innerHTML = `
    <div class="flashcard">
      <div class="flashcard-front" style="background: linear-gradient(135deg, #667eea, #764ba2);">
        <div class="flashcard-word">${message}</div>
      </div>
    </div>
  `;

    document.getElementById('flashcard-progress').textContent = '';
}

// Speech synthesis for Italian pronunciation
function pronounceItalian(word) {
    if (!('speechSynthesis' in window)) return;

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'it-IT';
    utterance.rate = 0.9;

    synth.cancel();
    setTimeout(() => synth.speak(utterance), 50);
}

// Export for global access
window.initFlashcards = initFlashcards;
