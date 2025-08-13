// Game scripts for Bella Cucina

let recipesData = [];
let ingredientsPairs = [];
let currentPlayer = null;
const PLAYER_KEY = 'bellaCurrentPlayer';

// --- Speech synthesis helpers for Italian pronunciation ---
let ITALIAN_VOICE = null;

function bestItalianVoice(voices) {
  const preferNames = ['Siri', 'Enhanced', 'Federica', 'Alice', 'Luca', 'Silvia', 'Paolo'];
  const itVoices = voices.filter((v) => (v.lang || '').toLowerCase().startsWith('it'));
  if (!itVoices.length) return null;
  itVoices.sort((a, b) => {
    const aIndex = preferNames.findIndex((name) => (a.name || '').includes(name));
    const bIndex = preferNames.findIndex((name) => (b.name || '').includes(name));
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
  return itVoices[0];
}

function loadItalianVoice(callback) {
  if (!('speechSynthesis' in window)) {
    callback(null);
    return;
  }
  const synth = window.speechSynthesis;
  const selectVoice = () => {
    const voices = synth.getVoices();
    if (!voices || !voices.length) {
      callback(null);
      return;
    }
    let savedName = null;
    try {
      savedName = localStorage.getItem('bella_it_voice');
    } catch (e) {
      console.warn('localStorage unavailable, cannot load voice preference:', e);
    }
    let chosen = null;
    if (savedName) {
      chosen = voices.find((v) => v.name === savedName);
    }
    if (!chosen) {
      chosen = bestItalianVoice(voices);
    }
    ITALIAN_VOICE = chosen;
    if (chosen) {
      try {
        localStorage.setItem('bella_it_voice', chosen.name);
      } catch (e) {
        console.warn('localStorage unavailable, cannot save voice preference:', e);
      }
    }
    callback(chosen);
  };
  if (synth.getVoices().length) {
    selectVoice();
  } else {
    synth.onvoiceschanged = selectVoice;
  }
}

function pronounceItalian(word) {
  if (!('speechSynthesis' in window)) {
    alert('Twoja przeglądarka nie obsługuje syntezy mowy.');
    return;
  }
  const synth = window.speechSynthesis;
  const speakNow = () => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'it-IT';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    if (ITALIAN_VOICE) {
      utterance.voice = ITALIAN_VOICE;
    }
    synth.cancel();
    setTimeout(() => synth.speak(utterance), 50);
  };
  if (!ITALIAN_VOICE) {
    loadItalianVoice(() => speakNow());
  } else {
    speakNow();
  }
}

function createItalianWordElement(word) {
  const span = document.createElement('span');
  span.className = 'it-word';
  span.append(document.createTextNode(word));
  const icon = document.createElement('i');
  icon.className = 'fas fa-volume-up speak-icon';
  icon.addEventListener('click', (e) => {
    e.stopPropagation();
    pronounceItalian(word);
  });
  span.appendChild(icon);
  return span;
}

function isItalianWord(word) {
  return ingredientsPairs.some((p) => p.it === word);
}

// Utility: shuffle array
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Load recipes and extract ingredient pairs from embedded global variable
function initGameData() {
  if (!Array.isArray(window.recipesData)) {
    console.error('Dane przepisów nie są dostępne.');
    return;
  }
  recipesData = window.recipesData;
  const pairs = new Map();
  recipesData.forEach((rec) => {
    rec.ingredients.forEach((ing) => {
      const key = `${ing.it}|${ing.pl}`;
      if (!pairs.has(key)) pairs.set(key, ing);
    });
  });
  ingredientsPairs = Array.from(pairs.values());
}

// Scoreboard helper: add points to current player
function addPoints(points) {
  if (!currentPlayer) return;
  const scores = loadScores();
  scores[currentPlayer] = (scores[currentPlayer] || 0) + points;
  saveScores(scores);
  renderScoreboard();
}

// Set current player from radio input
function updateCurrentPlayer() {
  const selected = document.querySelector('input[name="current-player"]:checked');
  if (selected) {
    currentPlayer = selected.value;
    try {
      localStorage.setItem(PLAYER_KEY, currentPlayer);
    } catch (e) {
      console.error('Nie można zapisać bieżącego gracza:', e);
    }
  }
}

// Render player selection options
function renderPlayerOptions() {
  const container = document.getElementById('player-options');
  if (!container) return;
  const scores = loadScores();
  const players = Object.keys(scores);
  container.innerHTML = '';
  players.forEach((player, idx) => {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'current-player';
    radio.value = player;
    if ((currentPlayer === null && idx === 0) || currentPlayer === player) {
      radio.checked = true;
      currentPlayer = player;
    }
    radio.addEventListener('change', updateCurrentPlayer);
    label.appendChild(radio);
    label.appendChild(document.createTextNode(player));
    container.appendChild(label);
  });
}

// Show/hide game menu for mobile-friendly gameplay
function hideGameMenu() {
  const controls = document.querySelector('.game-controls');
  const scoreboard = document.getElementById('scoreboard');
  const backLink = document.querySelector('.back-link');
  const hero = document.querySelector('.hero');
  const pageTitle = document.querySelector('.page-title');
  if (controls) controls.style.display = 'none';
  if (scoreboard) scoreboard.style.display = 'none';
  if (backLink) backLink.style.display = 'none';
  if (hero) hero.style.display = 'none';
  if (pageTitle) pageTitle.style.display = 'none';
}

function showGameMenu() {
  const controls = document.querySelector('.game-controls');
  const scoreboard = document.getElementById('scoreboard');
  const backLink = document.querySelector('.back-link');
  const hero = document.querySelector('.hero');
  const pageTitle = document.querySelector('.page-title');
  if (controls) controls.style.display = '';
  if (scoreboard) scoreboard.style.display = '';
  if (backLink) backLink.style.display = '';
  if (hero) hero.style.display = '';
  if (pageTitle) pageTitle.style.display = '';
  const container = document.getElementById('game-container');
  if (container) container.innerHTML = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function addExitButton(container) {
  const exitBtn = document.createElement('button');
  exitBtn.className = 'exit-btn';
  exitBtn.textContent = 'Powrót do menu';
  exitBtn.addEventListener('click', showGameMenu);
  container.appendChild(exitBtn);
}

// Initialize game page after recipe data has been loaded via fetch.
// Called from game.html once `window.recipesData` is available.
window.initGamePage = function () {
  initGameData();
  let storedPlayer = null;
  try {
    storedPlayer = localStorage.getItem(PLAYER_KEY);
  } catch (e) {
    console.error('localStorage niedostępne:', e);
  }
  const scores = loadScores();
  if (!storedPlayer) {
    do {
      storedPlayer = prompt('Podaj swój nick:');
      if (storedPlayer) storedPlayer = storedPlayer.trim();
    } while (!storedPlayer);
    addPlayer(storedPlayer);
    try {
      localStorage.setItem(PLAYER_KEY, storedPlayer);
    } catch (e) {
      console.error('Nie można zapisać gracza:', e);
    }
  } else if (!scores[storedPlayer]) {
    addPlayer(storedPlayer);
  }
  currentPlayer = storedPlayer;
  renderScoreboard();
  renderPlayerOptions();
  // Game buttons
  document.querySelectorAll('.game-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      updateCurrentPlayer();
      hideGameMenu();
      const game = btn.getAttribute('data-game');
      if (game === 'memory') {
        startMemoryGame();
      } else if (game === 'ingredients') {
        startIngredientGame();
      } else if (game === 'translation') {
        startTranslationGame();
      }
    });
  });

  const addBtn = document.getElementById('add-player-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const input = document.getElementById('new-player-name');
      const name = input.value.trim();
      if (name) {
        addPlayer(name);
        currentPlayer = name;
        try {
          localStorage.setItem(PLAYER_KEY, name);
        } catch (e) {
          console.error('Nie można zapisać gracza:', e);
        }
        renderPlayerOptions();
        input.value = '';
      }
    });
  }
};

// MEMORY GAME
function startMemoryGame() {
  const container = document.getElementById('game-container');
  container.innerHTML = '';
  // Title
  const title = document.createElement('h2');
  title.textContent = 'Gra pamięciowa – dopasuj włoskie i polskie słowa';
  container.appendChild(title);
  // Build deck: select random 8 pairs
  const numPairs = 8;
  const pairs = shuffle([...ingredientsPairs]).slice(0, numPairs);
  const deck = [];
  pairs.forEach((pair) => {
    deck.push({ id: pair.it + '_it', text: pair.it, match: pair.pl, lang: 'it' });
    deck.push({ id: pair.pl + '_pl', text: pair.pl, match: pair.it, lang: 'pl' });
  });
  shuffle(deck);
  // Create grid container
  const grid = document.createElement('div');
  grid.className = 'memory-grid';
  // Determine columns: 4 or 5 depending on pair count
  const cols = 4;
  grid.style.gridTemplateColumns = `repeat(${cols}, 80px)`;
  container.appendChild(grid);
  let firstCard = null;
  let secondCard = null;
  let lockBoard = false;
  let matchedCount = 0;

  deck.forEach((cardData) => {
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.textContent = '';
    card.dataset.text = cardData.text;
    card.dataset.match = cardData.match;
    card.dataset.revealed = 'false';
    card.dataset.lang = cardData.lang;
    card.addEventListener('click', () => {
      if (lockBoard || card.dataset.revealed === 'true') return;
      revealCard(card);
      if (!firstCard) {
        firstCard = card;
      } else {
        secondCard = card;
        checkMatch();
      }
    });
    grid.appendChild(card);
  });

  addExitButton(container);

  function revealCard(card) {
    card.classList.add('revealed');
    card.dataset.revealed = 'true';
    if (card.dataset.lang === 'it') {
      card.innerHTML = '';
      card.appendChild(createItalianWordElement(card.dataset.text));
    } else {
      card.textContent = card.dataset.text;
    }
  }

  function hideCard(card) {
    card.classList.remove('revealed');
    card.textContent = '';
    card.dataset.revealed = 'false';
  }

  function markMatched(cardA, cardB) {
    cardA.classList.remove('revealed');
    cardB.classList.remove('revealed');
    cardA.classList.add('matched');
    cardB.classList.add('matched');
    cardA.dataset.revealed = 'true';
    cardB.dataset.revealed = 'true';
  }

  function checkMatch() {
    lockBoard = true;
    if (
      firstCard.dataset.text === secondCard.dataset.match &&
      secondCard.dataset.text === firstCard.dataset.match
    ) {
      // match
      setTimeout(() => {
        markMatched(firstCard, secondCard);
        matchedCount++;
        addPoints(1); // 1 point per match
        resetPair();
        if (matchedCount === numPairs) {
          setTimeout(() => {
            alert('Brawo! Ukończyłeś grę.');
            showGameMenu();
          }, 200);
        }
      }, 300);
    } else {
      // no match
      setTimeout(() => {
        hideCard(firstCard);
        hideCard(secondCard);
        resetPair();
      }, 700);
    }
  }

  function resetPair() {
    [firstCard, secondCard] = [null, null];
    lockBoard = false;
  }
}

// INGREDIENT SELECTION GAME
function startIngredientGame() {
  const container = document.getElementById('game-container');
  container.innerHTML = '';
  const title = document.createElement('h2');
  title.textContent = 'Dobierz składniki – wybierz co należy do przepisu';
  container.appendChild(title);
  // Start first round
  newIngredientRound(container);
}

function newIngredientRound(container) {
  // Choose a random recipe
  const recipe = recipesData[Math.floor(Math.random() * recipesData.length)];
  // Collect correct ingredients (unique Italian names)
  const corrects = recipe.ingredients.map((i) => i.it);
  // Select decoys: choose 5 decoys not in corrects
  const decoys = [];
  const candidates = shuffle([...ingredientsPairs]);
  for (let pair of candidates) {
    if (!corrects.includes(pair.it)) {
      decoys.push(pair.it);
      if (decoys.length >= Math.min(5, ingredientsPairs.length - corrects.length)) break;
    }
  }
  // Build options and shuffle
  const options = [...corrects.map((w) => ({ text: w, correct: true })), ...decoys.map((w) => ({ text: w, correct: false }))];
  shuffle(options);
  // Create game wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'ingredient-game';
  const question = document.createElement('div');
  question.className = 'question';
  question.textContent = 'Które składniki należą do przepisu: ';
  question.appendChild(createItalianWordElement(recipe.italian_name));
  question.appendChild(document.createTextNode(` / ${recipe.polish_name}?`));
  wrapper.appendChild(question);
  const optsDiv = document.createElement('div');
  optsDiv.className = 'options';
  options.forEach((opt) => {
    const btn = document.createElement('div');
    btn.className = 'option';
    btn.dataset.correct = opt.correct ? 'true' : 'false';
    btn.dataset.selected = 'false';
    const content = createItalianWordElement(opt.text);
    btn.appendChild(content);
    btn.addEventListener('click', () => {
      if (btn.dataset.selected === 'true') {
        btn.dataset.selected = 'false';
        btn.classList.remove('selected');
      } else {
        btn.dataset.selected = 'true';
        btn.classList.add('selected');
      }
    });
    optsDiv.appendChild(btn);
  });
  wrapper.appendChild(optsDiv);
  const submit = document.createElement('button');
  submit.className = 'submit-btn';
  submit.textContent = 'Sprawdź';
  submit.addEventListener('click', () => {
    evaluateIngredientRound(wrapper, options);
  });
  wrapper.appendChild(submit);
  container.innerHTML = '';
  container.appendChild(wrapper);
  addExitButton(container);
}

function evaluateIngredientRound(wrapper, options) {
  let pointsThisRound = 0;
  const optionEls = wrapper.querySelectorAll('.option');
  optionEls.forEach((el) => {
    const selected = el.dataset.selected === 'true';
    const correct = el.dataset.correct === 'true';
    if (selected && correct) {
      pointsThisRound += 1;
      el.style.backgroundColor = 'var(--color-green)';
      el.style.color = 'var(--color-white)';
    } else if (selected && !correct) {
      el.style.backgroundColor = 'var(--color-red)';
      el.style.color = 'var(--color-white)';
      el.style.textDecoration = 'line-through';
    } else if (!selected && correct) {
      // Missed correct option
      el.style.backgroundColor = '#ffd900';
      el.style.color = '#333';
    }
    // disable further clicks
    el.style.pointerEvents = 'none';
  });
  addPoints(pointsThisRound);
  const message = document.createElement('p');
  message.style.textAlign = 'center';
  message.style.marginTop = '10px';
  message.textContent = `Zdobyt(e) punkt(y): ${pointsThisRound}`;
  wrapper.appendChild(message);
  const nextBtn = document.createElement('button');
  nextBtn.className = 'submit-btn';
  nextBtn.textContent = 'Następny przepis';
  nextBtn.addEventListener('click', () => {
    newIngredientRound(wrapper.parentElement);
  });
  wrapper.appendChild(nextBtn);
}

// TRANSLATION GAME
function startTranslationGame() {
  const container = document.getElementById('game-container');
  container.innerHTML = '';
  const title = document.createElement('h2');
  title.textContent = 'Tłumaczenie – wybierz prawidłowe tłumaczenie';
  container.appendChild(title);
  // Start first round
  newTranslationRound(container);
}

function newTranslationRound(container) {
  const pair = ingredientsPairs[Math.floor(Math.random() * ingredientsPairs.length)];
  // Decide direction: 50% Italian->Polish, 50% Polish->Italian
  const direction = Math.random() < 0.5 ? 'it2pl' : 'pl2it';
  let questionWord, instructionText, correctAnswer;
  if (direction === 'it2pl') {
    // Italian → Polish
    questionWord = pair.it;
    instructionText = 'Przetłumacz na polski:';
    correctAnswer = pair.pl;
  } else {
    // Polish → Italian
    questionWord = pair.pl;
    instructionText = 'Przetłumacz na włoski:';
    correctAnswer = pair.it;
  }
  // Build answers: include correct answer and three random wrong answers
  const answers = [correctAnswer];
  const candidates = shuffle([...ingredientsPairs]);
  for (let ing of candidates) {
    const candidate = direction === 'it2pl' ? ing.pl : ing.it;
    if (candidate !== correctAnswer && !answers.includes(candidate)) {
      answers.push(candidate);
    }
    if (answers.length >= 4) break;
  }
  shuffle(answers);
  // Build UI
  const wrapper = document.createElement('div');
  wrapper.className = 'translation-game';

  const flagsDiv = document.createElement('div');
  flagsDiv.className = 'flags';
  if (direction === 'it2pl') {
    flagsDiv.innerHTML = '<span class="flag">🇮🇹</span><span class="arrow">→</span><span class="flag">🇵🇱</span>';
  } else {
    flagsDiv.innerHTML = '<span class="flag">🇵🇱</span><span class="arrow">→</span><span class="flag">🇮🇹</span>';
  }
  wrapper.appendChild(flagsDiv);

  const questionEl = document.createElement('div');
  questionEl.className = 'question';
  questionEl.textContent = instructionText;
  wrapper.appendChild(questionEl);

  const wordBox = document.createElement('div');
  wordBox.className = 'word-box';
  if (direction === 'it2pl') {
    wordBox.appendChild(createItalianWordElement(questionWord));
  } else {
    wordBox.textContent = questionWord;
  }
  wrapper.appendChild(wordBox);

  const answersDiv = document.createElement('div');
  answersDiv.className = 'answers';
  answers.forEach((ans) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    if (direction === 'pl2it') {
      btn.appendChild(createItalianWordElement(ans));
    } else {
      btn.textContent = ans;
    }
    btn.addEventListener('click', () => {
      evaluateTranslationAnswer(btn, ans, correctAnswer, wrapper);
    });
    answersDiv.appendChild(btn);
  });
  wrapper.appendChild(answersDiv);
  container.innerHTML = '';
  container.appendChild(wrapper);
  addExitButton(container);

  // Speaker icons are added to Italian words; clicking them pronounces the word.
}

function evaluateTranslationAnswer(btn, chosen, correct, wrapper) {
  const buttons = wrapper.querySelectorAll('.answer-btn');
  buttons.forEach((b) => {
    b.disabled = true;
    if (b.textContent === correct) {
      b.classList.add('correct');
    }
  });
  let points = 0;
  if (chosen === correct) {
    btn.classList.add('correct');
    points = 1;
  } else {
    btn.classList.add('wrong');
  }
  addPoints(points);
  const result = document.createElement('p');
  result.style.textAlign = 'center';
  result.style.marginTop = '10px';
  if (points > 0) {
    result.textContent = 'Poprawna odpowiedź! +1 punkt';
  } else {
    result.textContent = 'Błędna odpowiedź. Prawidłowo: ';
    if (isItalianWord(correct)) {
      result.appendChild(createItalianWordElement(correct));
    } else {
      result.appendChild(document.createTextNode(correct));
    }
  }
  wrapper.appendChild(result);
  const nextBtn = document.createElement('button');
  nextBtn.className = 'submit-btn';
  nextBtn.textContent = 'Następne słowo';
  nextBtn.addEventListener('click', () => {
    newTranslationRound(wrapper.parentElement);
  });
  wrapper.appendChild(nextBtn);
}