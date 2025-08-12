// Recipes page script

let allRecipes = [];

// Mapping of internal category codes to display names (Polish labels)
const categoryLabels = {
  'pasta': 'PASTA',
  'risotto': 'RISOTTO',
  'zupa': 'ZUPY',
  'mięso': 'MIĘSO',
  'ryby': 'RYBY',
  'przystawka': 'PRZYSTAWKI',
  'deser': 'DESERY'
};

// Mapping of category codes to image file names located in images/categories
const categoryImages = {
  'pasta': 'categories/pasta.png',
  'risotto': 'categories/ryz.png',
  'zupa': 'categories/zupa.png',
  'mięso': 'categories/mieso.png',
  'ryby': 'categories/ryby.png',
  'przystawka': 'categories/przystawka.png',
  'deser': 'categories/deser.png'
};

// Generic cooking instructions per category in Italian and Polish. Placeholders
// {it} and {pl} will be replaced with the recipe names. These provide
// ogólny opis przygotowania dla każdej grupy dań.
const categoryInstructions = {
  'pasta': {
    it: 'Cuoci la pasta al dente e prepara il condimento appropriato, quindi mescola con {it} e servi con formaggio grattugiato.',
    pl: 'Ugotuj makaron al dente i przygotuj odpowiedni sos, następnie wymieszaj z daniem {pl} i podawaj z tartym serem.'
  },
  'risotto': {
    it: 'Tosta il riso in burro o olio, aggiungi brodo poco a poco mescolando fino a quando il risotto {it} diventa cremoso.',
    pl: 'Podsmaż ryż na maśle lub oliwie, następnie dodawaj bulion stopniowo, mieszając aż risotto {pl} stanie się kremowe.'
  },
  'zupa': {
    it: 'Prepara un soffritto di verdure, aggiungi brodo e ingredienti del {it}, quindi cuoci finché tutto è tenero.',
    pl: 'Przygotuj podsmażkę z warzyw, dodaj bulion i składniki {pl}, następnie gotuj aż wszystkie składniki będą miękkie.'
  },
  'mięso': {
    it: 'Rosola la carne con aromi e cuocila lentamente nel sugo fino a quando il {it} sarà tenero e saporito.',
    pl: 'Obsmaż mięso z przyprawami i gotuj powoli w sosie aż {pl} będzie miękkie i aromatyczne.'
  },
  'ryby': {
    it: 'Cuoci il pesce alla griglia o in padella con olio, aglio e erbe aromatiche; servi il {it} con contorni leggeri.',
    pl: 'Usmaż lub ugrilluj rybę na oliwie z czosnkiem i ziołami; podawaj {pl} z lekkimi dodatkami.'
  },
  'przystawka': {
    it: 'Preparare gli ingredienti freschi, assemblare il piatto {it} e servire a temperatura ambiente.',
    pl: 'Przygotuj świeże składniki, ułóż danie {pl} i podawaj w temperaturze pokojowej.'
  },
  'deser': {
    it: 'Prepara la crema, monta gli strati e lascia raffreddare il dessert {it} in frigorifero prima di servire.',
    pl: 'Przygotuj krem, ułóż warstwy i schłódź deser {pl} w lodówce przed podaniem.'
  }
};

// --- Speech synthesis voice selection ---
// Global variable to store selected Italian voice
let ITALIAN_VOICE = null;

// Pick the best available Italian voice based on preferred names (Siri/Enhanced) and language
function bestItalianVoice(voices) {
  const preferNames = ['Siri', 'Enhanced', 'Federica', 'Alice', 'Luca', 'Silvia', 'Paolo'];
  const itVoices = voices.filter(v => (v.lang || '').toLowerCase().startsWith('it'));
  if (!itVoices.length) return null;
  // sort by preference: voices containing one of preferNames come first
  itVoices.sort((a, b) => {
    const aIndex = preferNames.findIndex(name => (a.name || '').includes(name));
    const bIndex = preferNames.findIndex(name => (b.name || '').includes(name));
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
  return itVoices[0];
}

// Load voices (asynchronously if necessary) and select the best Italian voice. Accepts a callback to run after selection.
function loadItalianVoice(callback) {
  if (!('speechSynthesis' in window)) {
    callback(null);
    return;
  }
  const synth = window.speechSynthesis;
  // If voices are already available, pick and return
  const selectVoice = () => {
    const voices = synth.getVoices();
    if (!voices || !voices.length) {
      callback(null);
      return;
    }
    // Try to load saved voice from localStorage
    const savedName = localStorage.getItem('bella_it_voice');
    let chosen = null;
    if (savedName) {
      chosen = voices.find(v => v.name === savedName);
    }
    if (!chosen) {
      chosen = bestItalianVoice(voices);
    }
    ITALIAN_VOICE = chosen;
    if (chosen) {
      localStorage.setItem('bella_it_voice', chosen.name);
    }
    callback(chosen);
  };

  // Some browsers (e.g., Safari) asynchronously load voices and trigger voiceschanged
  if (synth.getVoices().length !== 0) {
    selectVoice();
  } else {
    synth.onvoiceschanged = () => {
      selectVoice();
    };
  }
}

// On DOM ready, preload Italian voice so it is ready for later utterances
document.addEventListener('DOMContentLoaded', () => {
  loadItalianVoice(() => {});
});

// Initialize recipe list from embedded global variable
function loadRecipes() {
  if (Array.isArray(window.recipesData)) {
    allRecipes = window.recipesData;
    displayRecipes();
  } else {
    console.error('Dane przepisów nie są dostępne.');
  }
}

// Filter and render recipes based on search text and category
function displayRecipes() {
  const listEl = document.getElementById('recipe-list');
  if (!listEl) return;
  const searchText = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
  const filterCategory = document.getElementById('category-filter')?.value || 'all';

  // Clear list
  listEl.innerHTML = '';

  // Filter recipes by search text and category filter
  const filtered = allRecipes.filter((recipe) => {
    const matchesName =
      recipe.italian_name.toLowerCase().includes(searchText) ||
      recipe.polish_name.toLowerCase().includes(searchText);
    const matchesCategory = filterCategory === 'all' || recipe.category === filterCategory;
    return matchesName && matchesCategory;
  });

  // Group recipes by category
  const grouped = {};
  filtered.forEach((rec) => {
    const cat = rec.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(rec);
  });

  // Determine order of categories: use keys defined in categoryLabels mapping
  const categoryOrder = Object.keys(categoryLabels);

  categoryOrder.forEach((cat) => {
    if (!grouped[cat] || grouped[cat].length === 0) return;
    // Section container for each category
    const section = document.createElement('section');
    section.className = 'category-section';

    // Category header with image
    const header = document.createElement('div');
    header.className = 'category-header';
    const img = document.createElement('img');
    img.src = `images/${categoryImages[cat]}`;
    img.alt = categoryLabels[cat];
    img.className = 'category-image';
    header.appendChild(img);
    const h3 = document.createElement('h3');
    h3.textContent = categoryLabels[cat];
    header.appendChild(h3);
    section.appendChild(header);

    // List of recipes in this category
    grouped[cat].forEach((recipe) => {
      const detailsEl = document.createElement('details');
      detailsEl.className = 'recipe-item';
      // Save Italian name for pronunciation on toggle
      detailsEl.setAttribute('data-title', recipe.italian_name);

      const summaryEl = document.createElement('summary');
      summaryEl.className = 'recipe-summary';
      // Create a title span containing Italian and Polish names. We no longer
      // display images on individual recipe rows; only category headers have images.
      const titleSpan = document.createElement('span');
      titleSpan.innerHTML = `<strong>${recipe.italian_name}</strong> / ${recipe.polish_name}`;
      summaryEl.appendChild(titleSpan);
      detailsEl.appendChild(summaryEl);

      const contentDiv = document.createElement('div');
      contentDiv.className = 'ingredients-list';
      const list = document.createElement('ul');
      recipe.ingredients.forEach((ing) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="it-name" data-word="${ing.it}" title="Kliknij, aby odsłuchać wymowę">${ing.it}</span> – ${ing.pl}`;
        list.appendChild(li);
      });
      contentDiv.appendChild(list);
      // Add detailed cooking description. Prefer recipe‑specific instructions if available;
      // otherwise fall back to generic category description. Each Italian
      // description is wrapped in a span with class it-desc to allow
      // pronunciation on click. The Polish description is displayed
      // normally. Note: recipe.id is guaranteed to exist.
      let itDesc;
      let plDesc;
      if (window.recipeInstructions && window.recipeInstructions[recipe.id]) {
        const details = window.recipeInstructions[recipe.id];
        itDesc = details.it;
        plDesc = details.pl;
      } else {
        const instr = categoryInstructions[recipe.category];
        if (instr) {
          itDesc = instr.it.replace('{it}', recipe.italian_name);
          plDesc = instr.pl.replace('{pl}', recipe.polish_name);
        }
      }
      if (itDesc && plDesc) {
        const descP = document.createElement('p');
        descP.className = 'recipe-description';
        // Use data-desc attribute to store Italian text for TTS if needed
        descP.innerHTML = `<em>Przygotowanie:</em> <span class="it-desc" data-text="${itDesc}">${itDesc}</span><br><span class="pl-desc">${plDesc}</span>`;
        contentDiv.appendChild(descP);
      }

      // If the recipe has a photo defined, display it under the description.
      // We also show a small attribution line referencing the source of the image.
      if (recipe.image) {
        const imgEl = document.createElement('img');
        imgEl.src = recipe.image;
        imgEl.alt = recipe.italian_name;
        imgEl.className = 'recipe-photo';
        contentDiv.appendChild(imgEl);
        // Add source line if provided
        if (recipe.source) {
          const sourceEl = document.createElement('div');
          sourceEl.className = 'image-source';
          sourceEl.textContent = recipe.source;
          contentDiv.appendChild(sourceEl);
        }
      }
      detailsEl.appendChild(contentDiv);

      // Add toggle event to pronounce the recipe title when opened
      detailsEl.addEventListener('toggle', (ev) => {
        if (detailsEl.open) {
          const title = detailsEl.getAttribute('data-title');
          pronounceItalian(title);
        }
      });

      section.appendChild(detailsEl);
    });
    listEl.appendChild(section);
  });

  // After DOM is built, attach event listeners to ingredient names
  attachPronounceEvents();

  // Attach pronunciation to Italian descriptions. Each .it-desc element
  // will read its text aloud when clicked. Using a separate handler
  // avoids pronouncing immediately upon render.
  const descElems = document.querySelectorAll('.it-desc');
  descElems.forEach((elem) => {
    elem.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const text = elem.dataset.text || elem.textContent;
      pronounceItalian(text);
    });
  });
}

// Attach pronunciation event listeners to buttons
function attachPronounceEvents() {
  // Rejestrujemy zdarzenia na każdym elemencie z klasą it-name. Po kliknięciu
  // odtwarzamy włoską wymowę zapisanej frazy. Zatrzymujemy propagację, żeby
  // zapobiec składaniu szczegółów bezpośrednio.
  const names = document.querySelectorAll('.it-name');
  names.forEach((span) => {
    span.addEventListener('click', (e) => {
      e.stopPropagation();
      const word = span.getAttribute('data-word');
      pronounceItalian(word);
    });
  });
}

// Pronounce a given Italian word using Web Speech API
function pronounceItalian(word) {
  if (!('speechSynthesis' in window)) {
    alert('Twoja przeglądarka nie obsługuje syntezy mowy.');
    return;
  }
  const synth = window.speechSynthesis;
  // Ensure we have a voice loaded; if not, load asynchronously and speak after
  const speakNow = () => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'it-IT';
    // fine‑tune rate and pitch for more natural sound on mobile
    // Slightly slower rate and neutral pitch yield a more natural
    // pronunciation on some devices (e.g., iOS). Feel free to adjust
    // these values if you prefer a different cadence.
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    if (ITALIAN_VOICE) {
      utterance.voice = ITALIAN_VOICE;
    }
    // Cancel any queued speech, then speak after slight delay to avoid interruptions
    synth.cancel();
    setTimeout(() => synth.speak(utterance), 50);
  };
  if (!ITALIAN_VOICE) {
    loadItalianVoice(() => speakNow());
  } else {
    speakNow();
  }
}

// Search and filter listeners
document.addEventListener('DOMContentLoaded', () => {
  loadRecipes();
  const searchInput = document.getElementById('search-input');
  const categorySelect = document.getElementById('category-filter');
  if (searchInput) {
    searchInput.addEventListener('input', displayRecipes);
  }
  if (categorySelect) {
    categorySelect.addEventListener('change', displayRecipes);
  }
});