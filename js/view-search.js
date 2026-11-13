/* Buscador de canciones con filtros avanzados */
(function () {
  'use strict';

  const U = window.U;
  const UI = window.UI;

  const searchState = {
    query: '',
    key: '',
    category: '',
    author: '',
    difficulty: '',
    bpmMin: '',
    bpmMax: '',
    tags: [],
    favorites: false,
    sort: 'relevance',
  };

  function normalize(value) {
    return U.normalize(value);
  }

  function matchesText(song, words) {
    if (!words.length) return true;
    const haystack = normalize([
      song.title, song.author, song.category, song.key,
      (song.tags || []).join(' '), song.notes, song.content,
    ].join(' '));
    return words.every((word) => haystack.indexOf(word) !== -1);
  }

  function snippet(song, words) {
    if (!words.length) return '';
    const lines = String(song.content || '').split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line || line.startsWith('[')) continue;
      const normalizedLine = normalize(line);
      if (words.every((word) => normalizedLine.indexOf(word) !== -1)) {
        return line.length > 110 ? line.slice(0, 110) + '…' : line;
      }
    }
    return '';
  }

  function highlight(text, query) {
    const escaped = U.esc(text);
    const clean = query.trim();
    if (!clean) return escaped;
    try {
      const pattern = new RegExp('(' + clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      return escaped.replace(pattern, '<mark>$1</mark>');
    } catch (error) {
      return escaped;
    }
  }

  function scoreSong(song, query) {
    if (!query) return 0;
    const title = normalize(song.title);
    if (title === query) return 5;
    if (title.startsWith(query)) return 4;
    if (title.indexOf(query) !== -1) return 3;
    if (normalize(song.author || '').indexOf(query) !== -1) return 2;
    return 1;
  }

  function activeTagSet() {
    return new Set(searchState.tags);
  }

  function filteredSongs() {
    const words = normalize(searchState.query.trim()).split(/\s+/).filter(Boolean);
    let songs = Store.state.songs.slice();

    if (searchState.favorites) songs = songs.filter((song) => song.favorite);
    if (searchState.key) songs = songs.filter((song) => song.key === searchState.key);
    if (searchState.category) songs = songs.filter((song) => song.category === searchState.category);
    if (searchState.author) songs = songs.filter((song) => song.author === searchState.author);
    if (searchState.difficulty) songs = songs.filter((song) => song.difficulty === searchState.difficulty);
    if (searchState.bpmMin !== '') songs = songs.filter((song) => Number(song.bpm) >= Number(searchState.bpmMin));
    if (searchState.bpmMax !== '') songs = songs.filter((song) => Number(song.bpm) <= Number(searchState.bpmMax));
    if (searchState.tags.length) {
      const tags = searchState.tags.map(normalize);
      songs = songs.filter((song) => (song.tags || []).some((tag) => tags.indexOf(normalize(tag)) !== -1));
    }

    songs = songs.filter((song) => matchesText(song, words));

    if (searchState.sort === 'title') songs.sort((a, b) => a.title.localeCompare(b.title, 'es'));
    else if (searchState.sort === 'recent') songs.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    else if (searchState.sort === 'bpm') songs.sort((a, b) => (Number(a.bpm) || 999) - (Number(b.bpm) || 999));
    else if (searchState.sort === 'key') songs.sort((a, b) => (a.key || 'zz').localeCompare(b.key || 'zz'));
    else {
      songs.sort((a, b) => {
        const diff = scoreSong(b, normalize(searchState.query.trim())) - scoreSong(a, normalize(searchState.query.trim()));
        if (diff !== 0) return diff;
        return a.title.localeCompare(b.title, 'es');
      });
    }
    return songs;
  }

  function activeFilterChips() {
    const chips = [];
    if (searchState.query.trim()) chips.push({ type: 'query', label: '“' + searchState.query.trim() + '”' });
    if (searchState.key) chips.push({ type: 'key', label: 'Tono ' + searchState.key });
    if (searchState.category) chips.push({ type: 'category', label: searchState.category });
    if (searchState.author) chips.push({ type: 'author', label: searchState.author });
    if (searchState.difficulty) chips.push({ type: 'difficulty', label: searchState.difficulty });
    if (searchState.favorites) chips.push({ type: 'favorites', label: 'Solo favoritas' });
    if (searchState.bpmMin !== '' || searchState.bpmMax !== '') {
      chips.push({ type: 'bpm', label: 'BPM ' + (searchState.bpmMin || '0') + '–' + (searchState.bpmMax || '∞') });
    }
    searchState.tags.forEach((tag) => chips.push({ type: 'tag', value: tag, label: '#' + tag }));
    return chips;
  }

  function render(container) {
    document.title = 'Buscar · Repertorio';
    const tags = Store.allTags();
    const authors = Store.allAuthors();
    const keyOptions = ['', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
      'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];

    container.innerHTML = ''
      + '<section class="search-hero">'
      + '  <div class="eyebrow">' + UI.icon('search') + ' Búsqueda avanzada ' + UI.readOnlyChip() + '</div>'
      + '  <h1>Encuentra la canción exacta</h1>'
      + '  <p class="sub muted small" style="margin-top:4px">Busca por letra, título, autor, tonalidad, tempo o etiquetas.</p>'
      + '  <form id="searchForm" role="search">'
      + '    <div class="search-box">' + UI.icon('search') + '<input type="search" id="q" placeholder="Buscar por título, autor o frase de la letra…" value="' + U.esc(searchState.query) + '" aria-label="Buscar canciones"></div>'
      + '    <button type="submit" class="btn primary" style="padding:0 20px">Buscar</button>'
      + '  </form>'
      + '</section>'
      + '<div class="filter-panel" id="filterPanel">'
      + '  <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px">'
      + '    <div class="row" style="gap:8px"><strong style="font-size:.92rem">' + UI.icon('filter') + ' Filtros</strong><span class="chip" id="filterCount">0 activos</span></div>'
      + '    <button type="button" class="btn ghost sm" id="clearFilters">Limpiar filtros</button>'
      + '  </div>'
      + '  <div class="filters-grid">'
      + '    <div class="field"><label for="filterKey">Tonalidad</label><select id="filterKey">'
      + keyOptions.map((key) => '<option value="' + key + '"' + (searchState.key === key ? ' selected' : '') + '>' + (key || 'Cualquiera') + '</option>').join('')
      + '    </select></div>'
      + '    <div class="field"><label for="filterCategory">Momento / categoría</label><select id="filterCategory"><option value="">Todas</option>'
      + Store.CATEGORIES.map((category) => '<option value="' + U.esc(category) + '"' + (searchState.category === category ? ' selected' : '') + '>' + U.esc(category) + '</option>').join('')
      + '    </select></div>'
      + '    <div class="field"><label for="filterAuthor">Autor</label><select id="filterAuthor"><option value="">Todos</option>'
      + authors.map((author) => '<option value="' + U.esc(author) + '"' + (searchState.author === author ? ' selected' : '') + '>' + U.esc(author) + '</option>').join('')
      + '    </select></div>'
      + '    <div class="field"><label for="filterDifficulty">Dificultad</label><select id="filterDifficulty"><option value="">Todas</option>'
      + ['Fácil', 'Media', 'Avanzada'].map((level) => '<option value="' + level + '"' + (searchState.difficulty === level ? ' selected' : '') + '>' + level + '</option>').join('')
      + '    </select></div>'
      + '    <div class="field"><label>BPM (tempo)</label><div class="bpm-range">'
      + '<input type="number" id="filterBpmMin" min="0" max="300" placeholder="Mín" value="' + U.esc(searchState.bpmMin) + '" aria-label="BPM mínimo">'
      + '<span class="muted tiny">–</span>'
      + '<input type="number" id="filterBpmMax" min="0" max="300" placeholder="Máx" value="' + U.esc(searchState.bpmMax) + '" aria-label="BPM máximo">'
      + '</div></div>'
      + '  </div>'
      + '  <div>'
      + '    <div class="filter-section-title">Etiquetas <span class="tiny muted" style="text-transform:none;letter-spacing:0;font-weight:400">(cualquiera de las seleccionadas)</span></div>'
      + '    <div class="tag-picker" id="tagPicker">'
      + (tags.length
        ? tags.map((entry) => '<button type="button" class="chip' + (searchState.tags.indexOf(entry.tag) !== -1 ? ' on' : '') + '" data-tag="' + U.esc(entry.tag) + '">#' + U.esc(entry.tag) + ' <span style="opacity:.6">' + entry.count + '</span></button>').join('')
        : '<span class="tiny muted">Aún no hay etiquetas en tu biblioteca.</span>')
      + '    </div>'
      + '  </div>'
      + '  <div class="row wrap">'
      + '    <label class="chip' + (searchState.favorites ? ' on' : '') + '" id="favChip" style="cursor:pointer"><input type="checkbox" id="filterFav"' + (searchState.favorites ? ' checked' : '') + ' style="width:14px;height:14px"> Solo favoritas</label>'
      + '    <span class="spacer"></span>'
      + '    <label class="tiny muted" for="filterSort" style="text-transform:none">Ordenar por</label>'
      + '    <select id="filterSort" style="max-width:180px">'
      + '      <option value="relevance">Relevancia</option>'
      + '      <option value="title">Título A–Z</option>'
      + '      <option value="recent">Recientes</option>'
      + '      <option value="bpm">Tempo (menor a mayor)</option>'
      + '      <option value="key">Tonalidad</option>'
      + '    </select>'
      + '  </div>'
      + '</div>'
      + '<div class="active-filters" id="activeFilters"></div>'
      + '<div class="results-head"><span class="count" id="resultCount"></span><span class="tiny muted">Toca una canción para abrirla</span></div>'
      + '<div class="result-list" id="results"></div>';

    U.$('#filterSort', container).value = searchState.sort;

    const qInput = U.$('#q', container);
    const results = U.$('#results', container);
    const countEl = U.$('#resultCount', container);
    const activeEl = U.$('#activeFilters', container);
    const filterCount = U.$('#filterCount', container);
    const favChip = U.$('#favChip', container);
    const tagPicker = U.$('#tagPicker', container);

    function syncFilterCount() {
      const count = activeFilterChips().length;
      filterCount.textContent = count + (count === 1 ? ' activo' : ' activos');
    }

    function paint() {
      const songs = filteredSongs();
      const words = normalize(searchState.query.trim()).split(/\s+/).filter(Boolean);
      const chips = activeFilterChips();

      activeEl.innerHTML = chips.map((chip) =>
        '<span class="chip accent">' + U.esc(chip.label)
        + '<button type="button" data-remove-type="' + chip.type + '"' + (chip.value ? ' data-remove-value="' + U.esc(chip.value) + '"' : '') + ' aria-label="Quitar filtro">' + UI.icon('x') + '</button></span>'
      ).join('');
      activeEl.style.display = chips.length ? 'flex' : 'none';

      countEl.innerHTML = songs.length
        ? '<strong>' + songs.length + '</strong> ' + U.plural(songs.length, 'canción encontrada', 'canciones encontradas')
        : 'Sin resultados';

      syncFilterCount();

      if (!Store.state.songs.length) {
        results.innerHTML = '<div class="empty"><div class="empty-icon">' + UI.icon('music') + '</div><h3>Tu biblioteca está vacía</h3>'
          + '<p>Añade canciones para poder buscarlas y filtrarlas aquí.</p>'
          + (Store.canEdit ? '<div class="actions"><a class="btn primary" href="#/canciones/nueva">Crear canción</a></div>' : '') + '</div>';
        return;
      }

      if (!songs.length) {
        results.innerHTML = '<div class="empty"><div class="empty-icon">' + UI.icon('filter') + '</div><h3>No hay canciones con esos filtros</h3>'
          + '<p>Prueba a quitar algún filtro o busca con otras palabras.</p><div class="actions"><button type="button" class="btn" id="emptyClear">Limpiar filtros</button></div></div>';
        const emptyClear = U.$('#emptyClear', results);
        if (emptyClear) emptyClear.addEventListener('click', clearAll);
        return;
      }

      results.innerHTML = songs.map((song) => {
        const line = snippet(song, words);
        return '<div class="result-row fade-in">'
          + '<div class="main">'
          + '<div class="t"><a href="#/canciones/' + song.id + '">' + highlight(song.title, searchState.query.trim()) + '</a>'
          + (song.favorite ? '<span class="chip accent" title="Favorita">' + UI.icon('star') + '</span>' : '')
          + (song.category ? '<span class="chip blue">' + U.esc(song.category) + '</span>' : '')
          + '</div>'
          + '<div class="sub">' + U.esc(song.author || 'Autor desconocido')
          + (song.key ? ' · Tono ' + song.key : '')
          + (song.bpm ? ' · ' + song.bpm + ' BPM' : '')
          + (song.duration ? ' · ' + U.fmtDuration(song.duration) : '')
          + (song.difficulty ? ' · ' + song.difficulty : '')
          + '</div>'
          + ((song.tags || []).length ? '<div class="tiny muted" style="margin-top:2px">' + song.tags.map((tag) => '#' + U.esc(tag)).join('  ') + '</div>' : '')
          + (line ? '<div class="snippet">' + U.esc(line) + '</div>' : '')
          + '</div>'
          + '<div class="right">' + (song.key ? UI.keyBadge(song.key) : '') + '<a class="btn sm" href="#/canciones/' + song.id + '">Abrir</a></div>'
          + '</div>';
      }).join('');
    }

    function readFilters() {
      searchState.query = qInput.value;
      searchState.key = U.$('#filterKey', container).value;
      searchState.category = U.$('#filterCategory', container).value;
      searchState.author = U.$('#filterAuthor', container).value;
      searchState.difficulty = U.$('#filterDifficulty', container).value;
      searchState.bpmMin = U.$('#filterBpmMin', container).value;
      searchState.bpmMax = U.$('#filterBpmMax', container).value;
      searchState.favorites = U.$('#filterFav', container).checked;
      searchState.sort = U.$('#filterSort', container).value;
      favChip.classList.toggle('on', searchState.favorites);
    }

    function clearAll() {
      searchState.query = '';
      searchState.key = '';
      searchState.category = '';
      searchState.author = '';
      searchState.difficulty = '';
      searchState.bpmMin = '';
      searchState.bpmMax = '';
      searchState.tags = [];
      searchState.favorites = false;
      searchState.sort = 'relevance';

      qInput.value = '';
      U.$('#filterKey', container).value = '';
      U.$('#filterCategory', container).value = '';
      U.$('#filterAuthor', container).value = '';
      U.$('#filterDifficulty', container).value = '';
      U.$('#filterBpmMin', container).value = '';
      U.$('#filterBpmMax', container).value = '';
      U.$('#filterFav', container).checked = false;
      U.$('#filterSort', container).value = 'relevance';
      favChip.classList.remove('on');
      tagPicker.querySelectorAll('[data-tag]').forEach((button) => button.classList.remove('on'));
      paint();
    }

    U.$('#searchForm', container).addEventListener('submit', (event) => {
      event.preventDefault();
      readFilters();
      paint();
    });

    qInput.addEventListener('input', U.debounce(() => {
      readFilters();
      paint();
    }, 180));

    ['#filterKey', '#filterCategory', '#filterAuthor', '#filterDifficulty', '#filterSort'].forEach((selector) => {
      U.$(selector, container).addEventListener('change', () => {
        readFilters();
        paint();
      });
    });

    ['#filterBpmMin', '#filterBpmMax'].forEach((selector) => {
      U.$(selector, container).addEventListener('input', U.debounce(() => {
        readFilters();
        paint();
      }, 300));
    });

    U.$('#filterFav', container).addEventListener('change', () => {
      readFilters();
      paint();
    });

    tagPicker.addEventListener('click', (event) => {
      const button = event.target.closest('[data-tag]');
      if (!button) return;
      const tag = button.dataset.tag;
      const index = searchState.tags.indexOf(tag);
      if (index === -1) searchState.tags.push(tag);
      else searchState.tags.splice(index, 1);
      button.classList.toggle('on', index === -1);
      paint();
    });

    U.$('#clearFilters', container).addEventListener('click', clearAll);

    activeEl.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-type]');
      if (!removeButton) return;
      const type = removeButton.dataset.removeType;
      if (type === 'tag') {
        searchState.tags = searchState.tags.filter((tag) => tag !== removeButton.dataset.removeValue);
        const tagButton = tagPicker.querySelector('[data-tag="' + removeButton.dataset.removeValue.replace(/"/g, '\\"') + '"]');
        if (tagButton) tagButton.classList.remove('on');
      } else if (type === 'query') {
        searchState.query = '';
        qInput.value = '';
      } else if (type === 'bpm') {
        searchState.bpmMin = '';
        searchState.bpmMax = '';
        U.$('#filterBpmMin', container).value = '';
        U.$('#filterBpmMax', container).value = '';
      } else if (type === 'favorites') {
        searchState.favorites = false;
        U.$('#filterFav', container).checked = false;
        favChip.classList.remove('on');
      } else {
        searchState[type] = '';
        const el = U.$('#filter' + type.charAt(0).toUpperCase() + type.slice(1), container);
        if (el) el.value = '';
      }
      paint();
    });

    paint();
    searchState.query = qInput.value;
  }

  window.SearchView = { render };
})();
