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
      } else if (game === 'marathon') {
        startMarathonGame();
      } else if (game === 'restaurant') {
        startRestaurantGame();
      } else if (game === 'fillblank') {
        startFillBlankGame();
      } else if (game === 'steps') {
        startStepsGame();
      } else if (game === 'guessrecipe') {
        startGuessRecipeGame();
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
  const titleIt = document.createElement('div');
  titleIt.className = 'recipe-title-it';
  titleIt.textContent = recipe.italian_name;
  wrapper.appendChild(titleIt);
  const titlePl = document.createElement('div');
  titlePl.className = 'recipe-title-pl';
  titlePl.textContent = recipe.polish_name;
  wrapper.appendChild(titlePl);
  const question = document.createElement('div');
  question.className = 'question';
  question.textContent = 'Które składniki należą do przepisu?';
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
    evaluateIngredientRound(wrapper, options, recipe.italian_name);
  });
  wrapper.appendChild(submit);
  container.innerHTML = '';
  container.appendChild(wrapper);
  addExitButton(container);
}

function evaluateIngredientRound(wrapper, options, italianName) {
  pronounceItalian(italianName);
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

// --- Restaurant role-play game ---
const restaurantDialoguesPool = [
  {
    question: 'Buongiorno! Desidera ordinare qualcosa da bere?',
    question_pl: 'Dzień dobry! Czy chce Pan/Pani zamówić coś do picia?',
    answers: [
      { text: "Sì, un bicchiere d'acqua, per favore.", translation: 'Tak, poproszę szklankę wody.' },
      { text: "Dov'è il bagno?", translation: 'Gdzie jest łazienka?' },
      { text: 'No, il conto per favore.', translation: 'Nie, poproszę rachunek.' },
    ],
    correct: 0,
  },
  {
    question: 'È pronto per ordinare?',
    question_pl: 'Czy jest Pan/Pani gotowy złożyć zamówienie?',
    answers: [
      { text: 'Sì, vorrei la lasagna.', translation: 'Tak, poproszę lasagne.' },
      { text: 'No, solo il conto.', translation: 'Nie, tylko rachunek.' },
      { text: 'A che ora chiudete?', translation: 'O której zamykacie?' },
    ],
    correct: 0,
  },
  {
    question: 'Tutto bene con il pasto?',
    question_pl: 'Czy wszystko w porządku z posiłkiem?',
    answers: [
      { text: 'Sì, è delizioso, grazie!', translation: 'Tak, jest pyszne, dziękuję!' },
      { text: 'Vorrei un taxi.', translation: 'Chciałbym taksówkę.' },
      { text: 'Dove posso pagare?', translation: 'Gdzie mogę zapłacić?' },
    ],
    correct: 0,
  },
  {
    question: 'Le porto il conto?',
    question_pl: 'Czy przynieść rachunek?',
    answers: [
      { text: 'Sì, il conto per favore.', translation: 'Tak, poproszę rachunek.' },
      { text: 'Un altro dolce, per favore.', translation: 'Jeszcze jeden deser, proszę.' },
      { text: "Una bottiglia d'olio, grazie.", translation: 'Butelkę oliwy, dziękuję.' },
    ],
    correct: 0,
  },
  {
    question: 'Gradirebbe vedere il menu dei dolci?',
    question_pl: 'Czy chciałby/chciałaby Pan/Pani zobaczyć menu deserów?',
    answers: [
      { text: 'Sì, per favore.', translation: 'Tak, poproszę.' },
      { text: 'No, sono sazio.', translation: 'Nie, jestem syty.' },
      { text: 'Quanto costa il pane?', translation: 'Ile kosztuje chleb?' },
    ],
    correct: 0,
  },
  {
    question: 'Avete una prenotazione?',
    question_pl: 'Czy mają Państwo rezerwację?',
    answers: [
      { text: 'Sì, a nome Rossi.', translation: 'Tak, na nazwisko Rossi.' },
      { text: 'No, un tavolo per due, per favore.', translation: 'Nie, stolik dla dwóch, proszę.' },
      { text: 'Sì, per domani.', translation: 'Tak, na jutro.' },
    ],
    correct: 1,
  },
  {
    question: 'Come desidera la bistecca?',
    question_pl: 'Jak ma być wysmażony stek?',
    answers: [
      { text: 'Media, per favore.', translation: 'Średnio, proszę.' },
      { text: 'Vorrei una pizza.', translation: 'Poproszę pizzę.' },
      { text: 'Non ho fame.', translation: 'Nie jestem głodny.' },
    ],
    correct: 0,
  },
  {
    question: "Posso portarle qualcos'altro?",
    question_pl: 'Czy mogę przynieść coś jeszcze?',
    answers: [
      { text: 'No, grazie. Va bene così.', translation: 'Nie, dziękuję. Tak jest dobrze.' },
      { text: 'Sì, dove sono i bagni?', translation: 'Tak, gdzie są toalety?' },
      { text: 'Andiamo al cinema.', translation: 'Idziemy do kina.' },
    ],
    correct: 0,
  },
  {
    question: 'Preferisce sedersi dentro o fuori?',
    question_pl: 'Woli Pan/Pani usiąść w środku czy na zewnątrz?',
    answers: [
      { text: 'Dentro, per favore.', translation: 'W środku, proszę.' },
      { text: 'Fuori, grazie.', translation: 'Na zewnątrz, dziękuję.' },
      { text: 'Non so nuotare.', translation: 'Nie umiem pływać.' },
    ],
    correct: 0,
  },
  {
    question: 'Vuole del pane?',
    question_pl: 'Czy chce Pan/Pani trochę chleba?',
    answers: [
      { text: 'Sì, grazie.', translation: 'Tak, dziękuję.' },
      { text: 'No, arrivederci.', translation: 'Nie, do widzenia.' },
      { text: 'Ho due fratelli.', translation: 'Mam dwóch braci.' },
    ],
    correct: 0,
  },
  {
    question: 'Acqua naturale o frizzante?',
    question_pl: 'Woda niegazowana czy gazowana?',
    answers: [
      { text: 'Naturale, per favore.', translation: 'Niegazowaną, proszę.' },
      { text: 'Con ghiaccio.', translation: 'Z lodem.' },
      { text: 'Ho perso il treno.', translation: 'Spóźniłem się na pociąg.' },
    ],
    correct: 0,
  },
  {
    question: 'Vorrebbe provare la specialità della casa?',
    question_pl: 'Czy chciałby/chciałaby Pan/Pani spróbować specjału domu?',
    answers: [
      { text: 'Certo, perché no?', translation: 'Oczywiście, czemu nie?' },
      { text: 'Devo fare i compiti.', translation: 'Muszę odrobić zadanie domowe.' },
      { text: 'Non mangio pesce.', translation: 'Nie jem ryb.' },
    ],
    correct: 0,
  },
  {
    question: 'Ha qualche allergia?',
    question_pl: 'Czy ma Pan/Pani jakieś alergie?',
    answers: [
      { text: 'Sì, sono allergico alle noci.', translation: 'Tak, mam alergię na orzechy.' },
      { text: 'No, sono in vacanza.', translation: 'Nie, jestem na wakacjach.' },
      { text: 'Vivo a Roma.', translation: 'Mieszkam w Rzymie.' },
    ],
    correct: 0,
  },
  {
    question: 'Desidera un contorno?',
    question_pl: 'Czy chce Pan/Pani dodatek?',
    answers: [
      { text: 'Sì, delle patate al forno.', translation: 'Tak, pieczone ziemniaki.' },
      { text: 'Ho perso il portafoglio.', translation: 'Zgubiłem portfel.' },
      { text: 'Parli più lentamente.', translation: 'Proszę mówić wolniej.' },
    ],
    correct: 0,
  },
  {
    question: 'Posso togliere il piatto?',
    question_pl: 'Czy mogę zabrać talerz?',
    answers: [
      { text: 'Sì, ho finito, grazie.', translation: 'Tak, skończyłem, dziękuję.' },
      { text: 'Ancora no, sto mangiando.', translation: 'Jeszcze nie, jem.' },
      { text: 'Dove siamo?', translation: 'Gdzie jesteśmy?' },
    ],
    correct: 0,
  },
  {
    question: 'Vuole vedere la carta dei vini?',
    question_pl: 'Czy chce Pan/Pani zobaczyć kartę win?',
    answers: [
      { text: 'Sì, grazie.', translation: 'Tak, dziękuję.' },
      { text: 'No, non bevo vino.', translation: 'Nie, nie piję wina.' },
      { text: 'Che ore sono?', translation: 'Która jest godzina?' },
    ],
    correct: 0,
  },
  {
    question: 'Quante persone siete?',
    question_pl: 'Ile osób jest w Państwa grupie?',
    answers: [
      { text: 'Siamo in quattro.', translation: 'Jest nas czworo.' },
      { text: 'Mi chiamo Marco.', translation: 'Nazywam się Marco.' },
      { text: 'Voglio andare a casa.', translation: 'Chcę iść do domu.' },
    ],
    correct: 0,
  },
  {
    question: 'Desidera un caffè?',
    question_pl: 'Czy chciałby/chciałaby Pan/Pani kawę?',
    answers: [
      { text: 'Sì, un espresso, grazie.', translation: 'Tak, espresso, dziękuję.' },
      { text: 'Prendo il treno.', translation: 'Pojadę pociągiem.' },
      { text: 'Mi piace il cinema.', translation: 'Lubię kino.' },
    ],
    correct: 0,
  },
  {
    question: 'Ha gradito il dessert?',
    question_pl: 'Czy smakował deser?',
    answers: [
      { text: 'Sì, era squisito!', translation: 'Tak, był wyśmienity!' },
      { text: 'Preferisco stare a casa.', translation: 'Wolę zostać w domu.' },
      { text: 'Non parlo inglese.', translation: 'Nie mówię po angielsku.' },
    ],
    correct: 0,
  },
  {
    question: 'Desidera ordinare un antipasto?',
    question_pl: 'Czy chce Pan/Pani zamówić przystawkę?',
    answers: [
      { text: 'Sì, una bruschetta, per favore.', translation: 'Tak, poproszę bruschettę.' },
      { text: 'Mi piace leggere libri.', translation: 'Lubię czytać książki.' },
      { text: 'No, il conto, per favore.', translation: 'Nie, poproszę rachunek.' },
    ],
    correct: 0,
  },
];

let restaurantDialogues = [];
let restaurantStep = 0;
let restaurantCorrect = 0;

function startRestaurantGame() {
  restaurantStep = 0;
  restaurantCorrect = 0;
  restaurantDialogues = shuffle([...restaurantDialoguesPool]).slice(0, 5);
  const container = document.getElementById('game-container');
  container.innerHTML = '';
  showRestaurantRound(container);
}

function showRestaurantRound(container) {
  const dialog = restaurantDialogues[restaurantStep];
  const wrapper = document.createElement('div');
  wrapper.className = 'restaurant-game';

  const questionEl = document.createElement('div');
  questionEl.className = 'question';
  questionEl.appendChild(createItalianWordElement(dialog.question));
  const qTrans = document.createElement('div');
  qTrans.className = 'translation';
  qTrans.textContent = dialog.question_pl;
  questionEl.appendChild(qTrans);
  wrapper.appendChild(questionEl);

  const answersDiv = document.createElement('div');
  answersDiv.className = 'answers';
  dialog.answers.forEach((ans, idx) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.appendChild(createItalianWordElement(ans.text));
    btn.addEventListener('click', () => {
      evaluateRestaurantAnswer(btn, idx, dialog, wrapper, container);
    });
    answersDiv.appendChild(btn);
  });
  wrapper.appendChild(answersDiv);

  container.innerHTML = '';
  container.appendChild(wrapper);
  addExitButton(container);
  pronounceItalian(dialog.question);
}

function evaluateRestaurantAnswer(btn, idx, dialog, wrapper, container) {
  const buttons = wrapper.querySelectorAll('.answer-btn');
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === dialog.correct) {
      b.classList.add('correct');
    }
    if (b === btn && idx !== dialog.correct) {
      b.classList.add('wrong');
    }
    const trans = document.createElement('div');
    trans.className = 'translation';
    trans.textContent = dialog.answers[i].translation;
    b.appendChild(trans);
  });

  let points = 0;
  if (idx === dialog.correct) {
    points = 1;
    restaurantCorrect++;
  }
  addPoints(points);

  const result = document.createElement('p');
  result.style.marginTop = '10px';
  result.textContent =
    points > 0 ? 'Poprawna odpowiedź! +1 punkt' : 'Błędna odpowiedź.';
  wrapper.appendChild(result);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'submit-btn';
  nextBtn.textContent =
    restaurantStep < restaurantDialogues.length - 1 ? 'Następna scena' : 'Zakończ';
  nextBtn.addEventListener('click', () => {
    restaurantStep++;
    if (restaurantStep < restaurantDialogues.length) {
      showRestaurantRound(container);
    } else {
      showRestaurantSummary(container);
    }
  });
  wrapper.appendChild(nextBtn);
}

function showRestaurantSummary(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'restaurant-summary';

  const scoreInfo = document.createElement('p');
  scoreInfo.style.textAlign = 'center';
  scoreInfo.textContent = `Zdobyte punkty: ${restaurantCorrect} / ${restaurantDialogues.length}`;
  wrapper.appendChild(scoreInfo);

  const heading = document.createElement('h3');
  heading.textContent = 'Poznane zwroty';
  wrapper.appendChild(heading);

  const list = document.createElement('ul');
  restaurantDialogues.forEach((d) => {
    const li = document.createElement('li');
    li.appendChild(createItalianWordElement(d.answers[d.correct].text));
    const trans = document.createElement('span');
    trans.className = 'translation';
    trans.textContent = ' – ' + d.answers[d.correct].translation;
    li.appendChild(trans);
    list.appendChild(li);
  });
  wrapper.appendChild(list);

  container.innerHTML = '';
  container.appendChild(wrapper);
  addExitButton(container);
}

// ============================================
// MARATHON GAME - Translation with timer
// ============================================

let marathonTimer = null;
let marathonTimeLeft = 60;
let marathonScore = 0;
let marathonStreak = 0;

function startMarathonGame() {
  const container = document.getElementById('game-container');
  container.innerHTML = '';

  marathonTimeLeft = 60;
  marathonScore = 0;
  marathonStreak = 0;

  const title = document.createElement('h2');
  title.textContent = 'Maraton Tłumaczeniowy – 60 sekund!';
  container.appendChild(title);

  // Timer display
  const timerDiv = document.createElement('div');
  timerDiv.className = 'timer-container';
  timerDiv.innerHTML = `
    <div class="timer-display" id="marathon-timer">60</div>
    <div class="timer-bar">
      <div class="timer-fill" id="marathon-timer-bar" style="width: 100%"></div>
    </div>
  `;
  container.appendChild(timerDiv);

  // Stats display
  const statsDiv = document.createElement('div');
  statsDiv.className = 'marathon-stats';
  statsDiv.innerHTML = `
    <div class="marathon-stat">
      <div class="marathon-stat-value" id="marathon-score">0</div>
      <div class="marathon-stat-label">Punkty</div>
    </div>
    <div class="marathon-stat">
      <div class="marathon-stat-value" id="marathon-streak">0</div>
      <div class="marathon-stat-label">Seria</div>
    </div>
  `;
  container.appendChild(statsDiv);

  // Game area
  const gameArea = document.createElement('div');
  gameArea.id = 'marathon-game-area';
  gameArea.className = 'translation-game';
  container.appendChild(gameArea);

  // Start timer
  marathonTimer = setInterval(updateMarathonTimer, 1000);

  // Show first question
  showMarathonQuestion();

  addExitButton(container);

  // Record game played
  if (typeof recordGamePlayed === 'function') {
    recordGamePlayed();
  }
}

function updateMarathonTimer() {
  marathonTimeLeft--;

  const timerDisplay = document.getElementById('marathon-timer');
  const timerBar = document.getElementById('marathon-timer-bar');

  if (timerDisplay) {
    timerDisplay.textContent = marathonTimeLeft;
    if (marathonTimeLeft <= 10) {
      timerDisplay.classList.add('warning');
      timerBar.classList.add('low');
    }
  }

  if (timerBar) {
    timerBar.style.width = `${(marathonTimeLeft / 60) * 100}%`;
  }

  if (marathonTimeLeft <= 0) {
    clearInterval(marathonTimer);
    showMarathonResults();
  }
}

function showMarathonQuestion() {
  const gameArea = document.getElementById('marathon-game-area');
  if (!gameArea) return;

  const pair = ingredientsPairs[Math.floor(Math.random() * ingredientsPairs.length)];
  const direction = Math.random() < 0.5 ? 'it2pl' : 'pl2it';

  let questionWord, correctAnswer;
  if (direction === 'it2pl') {
    questionWord = pair.it;
    correctAnswer = pair.pl;
  } else {
    questionWord = pair.pl;
    correctAnswer = pair.it;
  }

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

  gameArea.innerHTML = `
    <div class="flags">
      <span class="flag">${direction === 'it2pl' ? '🇮🇹' : '🇵🇱'}</span>
      <span class="arrow">→</span>
      <span class="flag">${direction === 'it2pl' ? '🇵🇱' : '🇮🇹'}</span>
    </div>
    <div class="word-box">${questionWord}</div>
    <div class="answers" id="marathon-answers"></div>
  `;

  const answersDiv = document.getElementById('marathon-answers');
  answers.forEach((ans) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = ans;
    btn.addEventListener('click', () => {
      handleMarathonAnswer(ans, correctAnswer, btn);
    });
    answersDiv.appendChild(btn);
  });
}

function handleMarathonAnswer(chosen, correct, btnEl) {
  const scoreEl = document.getElementById('marathon-score');
  const streakEl = document.getElementById('marathon-streak');

  if (chosen === correct) {
    marathonScore++;
    marathonStreak++;
    btnEl.classList.add('correct');
    addPoints(1);
    if (typeof recordAnswer === 'function') {
      recordAnswer(true, correct);
    }
  } else {
    marathonStreak = 0;
    btnEl.classList.add('wrong');
    if (typeof recordAnswer === 'function') {
      recordAnswer(false, correct);
    }
  }

  if (scoreEl) scoreEl.textContent = marathonScore;
  if (streakEl) streakEl.textContent = marathonStreak;

  // Quick transition to next question
  setTimeout(showMarathonQuestion, 300);
}

function showMarathonResults() {
  const container = document.getElementById('game-container');
  container.innerHTML = `
    <div class="results-overlay">
      <div class="results-card">
        <h2>⏱️ Czas minął!</h2>
        <div class="results-score">${marathonScore}</div>
        <p class="results-message">punktów w 60 sekund</p>
        <p>Najdłuższa seria: ${marathonStreak}</p>
        <button class="submit-btn" onclick="startMarathonGame()">Zagraj ponownie</button>
        <button class="exit-btn" onclick="showGameMenu()" style="margin-top: 10px;">Wróć do menu</button>
      </div>
    </div>
  `;
}

// ============================================
// FILL THE BLANK GAME
// ============================================

const fillBlankSentences = [
  { sentence: "Vorrei ordinare ___, per favore.", options: ["la pizza", "il treno", "la finestra", "il libro"], correct: 0, translation: "Chciałbym zamówić pizzę, proszę." },
  { sentence: "Posso avere il ___, per favore?", options: ["conto", "palazzo", "treno", "giardino"], correct: 0, translation: "Czy mogę prosić o rachunek?" },
  { sentence: "Vorrei un bicchiere di ___.", options: ["vino rosso", "carta", "telefono", "cappello"], correct: 0, translation: "Poproszę kieliszek czerwonego wina." },
  { sentence: "La ___ è deliziosa!", options: ["pasta", "strada", "macchina", "porta"], correct: 0, translation: "Makaron jest pyszny!" },
  { sentence: "Avete ___ vegetariane?", options: ["opzioni", "scarpe", "chiavi", "borse"], correct: 0, translation: "Czy macie opcje wegetariańskie?" },
  { sentence: "Il ___ è molto buono qui.", options: ["caffè", "treno", "teatro", "museo"], correct: 0, translation: "Kawa jest tutaj bardzo dobra." },
  { sentence: "Vorrei prenotare un ___ per due.", options: ["tavolo", "biglietto", "vestito", "libro"], correct: 0, translation: "Chciałbym zarezerwować stolik dla dwóch." },
  { sentence: "Quanto costa il ___?", options: ["piatto del giorno", "ponte", "fiume", "monte"], correct: 0, translation: "Ile kosztuje danie dnia?" }
];

function startFillBlankGame() {
  const container = document.getElementById('game-container');
  container.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = 'Uzupełnij Zdanie';
  container.appendChild(title);

  showFillBlankRound(container, 0, 0);
}

function showFillBlankRound(container, index, score) {
  if (index >= fillBlankSentences.length) {
    showFillBlankResults(container, score);
    return;
  }

  const item = fillBlankSentences[index];
  const shuffledOptions = shuffle([...item.options]);

  const wrapper = document.createElement('div');
  wrapper.className = 'fill-blank-game animate-fade-in';

  wrapper.innerHTML = `
    <div class="flashcard-progress">${index + 1} / ${fillBlankSentences.length}</div>
    <div class="fill-blank-sentence">
      ${item.sentence.replace('___', '<span class="fill-blank-gap" id="blank-gap">?</span>')}
    </div>
    <div class="answers" id="fill-answers"></div>
  `;

  container.innerHTML = '';
  container.appendChild(wrapper);

  const answersDiv = document.getElementById('fill-answers');
  shuffledOptions.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      handleFillBlankAnswer(container, index, score, opt, item, btn);
    });
    answersDiv.appendChild(btn);
  });

  addExitButton(container);
}

function handleFillBlankAnswer(container, index, score, chosen, item, btnEl) {
  const correctAnswer = item.options[item.correct];
  const gap = document.getElementById('blank-gap');
  const buttons = document.querySelectorAll('#fill-answers .answer-btn');

  buttons.forEach(b => {
    b.disabled = true;
    if (b.textContent === correctAnswer) {
      b.classList.add('correct');
    }
  });

  let newScore = score;
  if (chosen === correctAnswer) {
    btnEl.classList.add('correct');
    gap.textContent = correctAnswer;
    gap.style.background = 'rgba(0, 146, 70, 0.3)';
    newScore++;
    addPoints(1);
  } else {
    btnEl.classList.add('wrong');
    gap.textContent = correctAnswer;
    gap.style.background = 'rgba(206, 43, 55, 0.3)';
  }

  // Show translation
  const transP = document.createElement('p');
  transP.style.marginTop = '15px';
  transP.style.fontStyle = 'italic';
  transP.textContent = item.translation;
  document.querySelector('.fill-blank-sentence').appendChild(transP);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'submit-btn';
  nextBtn.textContent = index < fillBlankSentences.length - 1 ? 'Następne' : 'Zobacz wynik';
  nextBtn.addEventListener('click', () => {
    showFillBlankRound(container, index + 1, newScore);
  });
  document.querySelector('.fill-blank-game').appendChild(nextBtn);
}

function showFillBlankResults(container, score) {
  container.innerHTML = `
    <div class="results-card" style="margin: 40px auto;">
      <h2>🎉 Ukończono!</h2>
      <div class="results-score">${score} / ${fillBlankSentences.length}</div>
      <p class="results-message">poprawnych odpowiedzi</p>
      <button class="submit-btn" onclick="startFillBlankGame()">Zagraj ponownie</button>
    </div>
  `;
  addExitButton(container);

  if (typeof recordGamePlayed === 'function') {
    recordGamePlayed();
  }
}

// ============================================
// STEPS GAME - Arrange recipe steps
// ============================================

const recipeSteps = [
  {
    name: "Spaghetti Carbonara",
    steps: [
      { it: "Taglia il guanciale a dadini.", pl: "Pokrój guanciale w kostkę." },
      { it: "Rosola il guanciale in padella.", pl: "Podsmaż guanciale na patelni." },
      { it: "Monta i tuorli con il pecorino.", pl: "Ubij żółtka z pecorino." },
      { it: "Cuoci la pasta al dente.", pl: "Ugotuj makaron al dente." },
      { it: "Unisci la pasta al guanciale.", pl: "Połącz makaron z guanciale." },
      { it: "Aggiungi la crema di uova.", pl: "Dodaj krem z jajek." }
    ]
  },
  {
    name: "Tiramisù",
    steps: [
      { it: "Separa i tuorli dagli albumi.", pl: "Oddziel żółtka od białek." },
      { it: "Sbatti i tuorli con lo zucchero.", pl: "Ubij żółtka z cukrem." },
      { it: "Incorpora il mascarpone.", pl: "Dodaj mascarpone." },
      { it: "Monta gli albumi a neve.", pl: "Ubij białka na pianę." },
      { it: "Inzuppa i savoiardi nel caffè.", pl: "Namocz biszkopty w kawie." },
      { it: "Alterna strati di crema e biscotti.", pl: "Układaj warstwy kremu i biszkoptów." }
    ]
  }
];

function startStepsGame() {
  const container = document.getElementById('game-container');
  container.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = 'Ułóż Kroki Przepisu';
  container.appendChild(title);

  const recipe = recipeSteps[Math.floor(Math.random() * recipeSteps.length)];
  showStepsRound(container, recipe);
}

function showStepsRound(container, recipe) {
  const wrapper = document.createElement('div');
  wrapper.className = 'step-game animate-fade-in';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'step-game-title';
  titleDiv.innerHTML = `<h3>${recipe.name}</h3><p>Przeciągnij kroki w odpowiedniej kolejności</p>`;
  wrapper.appendChild(titleDiv);

  const stepsContainer = document.createElement('div');
  stepsContainer.className = 'steps-container';
  stepsContainer.id = 'steps-container';

  // Shuffle steps
  const shuffledSteps = shuffle(recipe.steps.map((s, i) => ({ ...s, correctOrder: i })));

  shuffledSteps.forEach((step, idx) => {
    const stepEl = document.createElement('div');
    stepEl.className = 'step-item';
    stepEl.draggable = true;
    stepEl.dataset.correctOrder = step.correctOrder;
    stepEl.innerHTML = `
      <span class="step-number">${idx + 1}</span>
      <span class="step-text">${step.it}</span>
      <span class="step-handle"><i class="fas fa-grip-lines"></i></span>
    `;

    // Drag and drop handlers
    stepEl.addEventListener('dragstart', handleDragStart);
    stepEl.addEventListener('dragover', handleDragOver);
    stepEl.addEventListener('drop', handleDrop);
    stepEl.addEventListener('dragend', handleDragEnd);

    stepsContainer.appendChild(stepEl);
  });

  wrapper.appendChild(stepsContainer);

  const checkBtn = document.createElement('button');
  checkBtn.className = 'submit-btn';
  checkBtn.textContent = 'Sprawdź kolejność';
  checkBtn.addEventListener('click', () => checkStepsOrder(recipe));
  wrapper.appendChild(checkBtn);

  container.innerHTML = '';
  container.appendChild(wrapper);
  addExitButton(container);
}

let draggedElement = null;

function handleDragStart(e) {
  draggedElement = e.target.closest('.step-item');
  draggedElement.classList.add('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e) {
  e.preventDefault();
  const target = e.target.closest('.step-item');
  if (target && draggedElement && target !== draggedElement) {
    const container = document.getElementById('steps-container');
    const allItems = [...container.querySelectorAll('.step-item')];
    const draggedIdx = allItems.indexOf(draggedElement);
    const targetIdx = allItems.indexOf(target);

    if (draggedIdx < targetIdx) {
      target.parentNode.insertBefore(draggedElement, target.nextSibling);
    } else {
      target.parentNode.insertBefore(draggedElement, target);
    }

    // Update numbers
    updateStepNumbers();
  }
}

function handleDragEnd(e) {
  if (draggedElement) {
    draggedElement.classList.remove('dragging');
    draggedElement = null;
  }
}

function updateStepNumbers() {
  const items = document.querySelectorAll('.step-item');
  items.forEach((item, idx) => {
    item.querySelector('.step-number').textContent = idx + 1;
  });
}

function checkStepsOrder(recipe) {
  const items = document.querySelectorAll('.step-item');
  let correctCount = 0;

  items.forEach((item, idx) => {
    const correctOrder = parseInt(item.dataset.correctOrder);
    if (correctOrder === idx) {
      item.classList.add('correct');
      correctCount++;
    } else {
      item.classList.add('incorrect');
    }
    item.draggable = false;
  });

  addPoints(correctCount);

  const resultP = document.createElement('p');
  resultP.style.textAlign = 'center';
  resultP.style.marginTop = '15px';
  resultP.textContent = `Poprawnie: ${correctCount} / ${recipe.steps.length}`;
  document.querySelector('.step-game').appendChild(resultP);

  const againBtn = document.createElement('button');
  againBtn.className = 'submit-btn';
  againBtn.textContent = 'Inny przepis';
  againBtn.addEventListener('click', startStepsGame);
  document.querySelector('.step-game').appendChild(againBtn);

  if (typeof recordGamePlayed === 'function') {
    recordGamePlayed();
  }
}

// ============================================
// GUESS RECIPE GAME
// ============================================

function startGuessRecipeGame() {
  const container = document.getElementById('game-container');
  container.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = 'Zgadnij Przepis';
  container.appendChild(title);

  showGuessRecipeRound(container, 0, 0);
}

function showGuessRecipeRound(container, round, score) {
  if (round >= 5) {
    showGuessRecipeResults(container, score);
    return;
  }

  // Pick a random recipe
  const correctRecipe = recipesData[Math.floor(Math.random() * recipesData.length)];

  // Get 3-5 ingredients from this recipe
  const ingredients = shuffle(correctRecipe.ingredients).slice(0, Math.min(5, correctRecipe.ingredients.length));

  // Get 3 wrong recipes as options
  const wrongRecipes = shuffle(recipesData.filter(r => r.id !== correctRecipe.id)).slice(0, 3);
  const options = shuffle([correctRecipe, ...wrongRecipes]);

  const wrapper = document.createElement('div');
  wrapper.className = 'guess-recipe-game animate-fade-in';

  wrapper.innerHTML = `
    <div class="flashcard-progress">Runda ${round + 1} / 5</div>
    <p>Który przepis można przygotować z tych składników?</p>
    <div class="ingredients-display" id="ingredients-display"></div>
    <div class="recipe-options" id="recipe-options"></div>
  `;

  container.innerHTML = '';
  container.appendChild(wrapper);

  // Add ingredients
  const ingredientsDiv = document.getElementById('ingredients-display');
  ingredients.forEach(ing => {
    const chip = document.createElement('span');
    chip.className = 'ingredient-chip';
    chip.textContent = ing.it;
    chip.title = ing.pl;
    ingredientsDiv.appendChild(chip);
  });

  // Add options
  const optionsDiv = document.getElementById('recipe-options');
  options.forEach(recipe => {
    const btn = document.createElement('button');
    btn.className = 'recipe-option';
    btn.innerHTML = `<strong>${recipe.italian_name}</strong><br><span style="font-size: 0.9em;">${recipe.polish_name}</span>`;
    btn.addEventListener('click', () => {
      handleGuessRecipeAnswer(container, round, score, recipe.id, correctRecipe, btn);
    });
    optionsDiv.appendChild(btn);
  });

  addExitButton(container);
}

function handleGuessRecipeAnswer(container, round, score, chosenId, correctRecipe, btnEl) {
  const buttons = document.querySelectorAll('.recipe-option');
  let newScore = score;

  buttons.forEach(b => {
    b.disabled = true;
    if (b.innerHTML.includes(correctRecipe.italian_name)) {
      b.classList.add('correct');
    }
  });

  if (chosenId === correctRecipe.id) {
    btnEl.classList.add('correct');
    newScore++;
    addPoints(1);
  } else {
    btnEl.classList.add('incorrect');
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'submit-btn';
  nextBtn.textContent = round < 4 ? 'Następna runda' : 'Zobacz wynik';
  nextBtn.addEventListener('click', () => {
    showGuessRecipeRound(container, round + 1, newScore);
  });
  document.querySelector('.guess-recipe-game').appendChild(nextBtn);
}

function showGuessRecipeResults(container, score) {
  container.innerHTML = `
    <div class="results-card" style="margin: 40px auto;">
      <h2>🍽️ Koniec gry!</h2>
      <div class="results-score">${score} / 5</div>
      <p class="results-message">przepisów rozpoznanych</p>
      <button class="submit-btn" onclick="startGuessRecipeGame()">Zagraj ponownie</button>
    </div>
  `;
  addExitButton(container);

  if (typeof recordGamePlayed === 'function') {
    recordGamePlayed();
  }
}
