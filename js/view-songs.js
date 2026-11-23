/* Biblioteca de canciones y editor */
(function () {
  'use strict';

  const U = window.U;
  const UI = window.UI;

  const KEY_OPTIONS = [
    'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
    'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm',
  ];
  const DIFFICULTIES = ['Fácil', 'Media', 'Avanzada'];
  const SUMMARY_NAMES = ['Intro', 'Verso', 'Pre-coro', 'Coro', 'Puente', 'Instrumental', 'Final', 'Otro'];
  const SUMMARY_LIMITS = { name: 40, phrase: 120, degrees: 200, note: 120 };
  const SUMMARY_MAX_PARTS = 40;

  let sortMode = 'recent';
  let onlyFavorites = false;

  /* Cantidad de repertorios que usan cada canción: reemplaza al viejo
     orden «Más tocadas», que dependía de un contador que ya no existe. */
  function usageCounts() {
    const counts = new Map();
    Store.state.setlists.forEach((list) => {
      (Array.isArray(list.items) ? list.items : []).forEach((item) => {
        if (item && item.songId) counts.set(item.songId, (counts.get(item.songId) || 0) + 1);
      });
    });
    return counts;
  }

  function allSongsSorted() {
    const songs = Store.state.songs.slice();
    if (sortMode === 'title') songs.sort((a, b) => a.title.localeCompare(b.title, 'es'));
    else if (sortMode === 'used') {
      const counts = usageCounts();
      songs.sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0) || a.title.localeCompare(b.title, 'es'));
    }
    else if (sortMode === 'key') songs.sort((a, b) => (a.key || 'zz').localeCompare(b.key || 'zz') || a.title.localeCompare(b.title, 'es'));
    else songs.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '') || a.title.localeCompare(b.title, 'es'));
    return songs;
  }

  function matchesQuery(song, query) {
    if (!query) return true;
    const haystack = U.normalize([
      song.title, song.author, song.category, song.key,
      (song.tags || []).join(' '), song.notes, song.content,
    ].join(' '));
    return query.split(/\s+/).every((word) => haystack.indexOf(word) !== -1);
  }

  function cardHTML(song, editable) {
    const tags = (song.tags || []).slice(0, 3).map((tag) => '<span class="chip plain">#' + U.esc(tag) + '</span>').join('');
    const more = (song.tags || []).length > 3 ? '<span class="chip plain">+' + ((song.tags || []).length - 3) + '</span>' : '';
    return '<article class="song-card fade-in">'
      + '<div class="title-row"><div style="min-width:0">'
      + '<h3><a href="#/canciones/' + U.esc(song.id) + '">' + U.esc(song.title) + '</a></h3>'
      + '<div class="author">' + U.esc(song.author || 'Autor desconocido') + '</div>'
      + '</div>' + (editable
        ? '<button type="button" class="star-btn' + (song.favorite ? ' on' : '') + '" data-fav="' + U.esc(song.id) + '" aria-label="Favorita" aria-pressed="' + (song.favorite ? 'true' : 'false') + '">' + UI.icon('star') + '</button>'
        : (song.favorite ? '<span class="chip accent" title="Favorita">' + UI.icon('star') + '</span>' : ''))
      + '</div>'
      + '<div class="meta">'
      + (song.key ? UI.keyBadge(song.key) : '')
      + (song.capo ? '<span class="chip">Capo ' + song.capo + '</span>' : '')
      + (song.bpm ? '<span class="chip">' + song.bpm + ' BPM</span>' : '')
      + (song.duration ? '<span class="chip">' + U.fmtDuration(song.duration) + '</span>' : '')
      + (song.category ? '<span class="chip blue">' + U.esc(song.category) + '</span>' : '')
      + '</div>'
      + ((tags || more) ? '<div class="tags">' + tags + more + '</div>' : '<div class="tags"></div>')
      + '<div class="card-actions">'
      + '<a class="btn ghost" href="#/canciones/' + U.esc(song.id) + '">Abrir</a>'
      + (editable ? '<a class="btn ghost" href="#/canciones/' + U.esc(song.id) + '/editar">Editar</a>' : '')
      + (editable ? '<button type="button" class="btn ghost icon-only" data-add="' + U.esc(song.id) + '" title="Añadir a un repertorio" aria-label="Añadir a un repertorio">' + UI.icon('plus') + '</button>' : '')
      + '</div>'
      + '</article>';
  }

  function list(container) {
    const total = Store.state.songs.length;
    const favs = Store.state.songs.filter((song) => song.favorite).length;
    const editable = Store.canEdit;
    document.title = 'Canciones · Repertorio';

    container.innerHTML = ''
      + '<header class="page-head">'
      + '  <div><div class="eyebrow">' + UI.icon('music') + ' Biblioteca ' + UI.readOnlyChip() + '</div>'
      + '  <h1>Canciones</h1>'
      + '  <p class="sub">' + total + ' ' + U.plural(total, 'canción', 'canciones') + (favs ? ' · ' + favs + ' ' + U.plural(favs, 'favorita', 'favoritas') : '') + '</p></div>'
      + (editable ? '  <div class="head-actions"><a class="btn primary" href="#/canciones/nueva">' + UI.icon('plus') + 'Nueva canción</a></div>' : '')
      + '</header>'
      + '<div class="toolbar">'
      + '  <div class="search-box">' + UI.icon('search') + '<input type="search" id="songSearch" placeholder="Buscar por título, autor, etiqueta o letra…" aria-label="Buscar canciones"></div>'
      + '  <select id="sortSongs" style="max-width:190px" aria-label="Ordenar canciones">'
      + '    <option value="recent">Recientes primero</option>'
      + '    <option value="title">Título A–Z</option>'
      + '    <option value="used">Más usadas en repertorios</option>'
      + '    <option value="key">Por tonalidad</option>'
      + '  </select>'
      + '  <button type="button" class="chip' + (onlyFavorites ? ' on' : '') + '" id="favFilter">' + UI.icon('star') + ' Solo favoritas</button>'
      + '  <span class="spacer"></span>'
      + '  <span class="tiny muted" id="resultCount"></span>'
      + '</div>'
      + '<div id="songGrid" class="song-grid"></div>';

    U.$('#sortSongs', container).value = sortMode;
    const grid = U.$('#songGrid', container);
    const searchInput = U.$('#songSearch', container);
    const countEl = U.$('#resultCount', container);

    function paint() {
      const query = U.normalize(searchInput.value.trim());
      let songs = allSongsSorted();
      if (onlyFavorites) songs = songs.filter((song) => song.favorite);
      songs = songs.filter((song) => matchesQuery(song, query));

      countEl.textContent = songs.length + ' de ' + total;
      if (!Store.state.songs.length) {
        grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">' + UI.icon('music') + '</div>'
          + '<h3>Tu biblioteca está vacía</h3><p>Crea tu primera canción con letra y acordes para empezar a preparar los cultos.</p>'
          + (editable ? '<div class="actions"><a class="btn primary" href="#/canciones/nueva">' + UI.icon('plus') + 'Crear canción</a></div>' : '') + '</div>';
        return;
      }
      if (!songs.length) {
        grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">' + UI.icon('search') + '</div>'
          + '<h3>Sin resultados</h3><p>No encontramos canciones con esos criterios. Prueba con otra búsqueda.</p></div>';
        return;
      }
      grid.innerHTML = songs.map((song) => cardHTML(song, editable)).join('');
    }

    searchInput.addEventListener('input', U.debounce(paint, 120));
    U.$('#sortSongs', container).addEventListener('change', (event) => {
      sortMode = event.target.value;
      paint();
    });
    U.$('#favFilter', container).addEventListener('click', (event) => {
      onlyFavorites = !onlyFavorites;
      event.currentTarget.classList.toggle('on', onlyFavorites);
      paint();
    });

    grid.addEventListener('click', (event) => {
      const favButton = event.target.closest('[data-fav]');
      if (favButton) {
        const nowFav = Store.toggleFavorite(favButton.dataset.fav);
        favButton.classList.toggle('on', nowFav);
        favButton.setAttribute('aria-pressed', nowFav ? 'true' : 'false');
        return;
      }
      const addButton = event.target.closest('[data-add]');
      if (addButton) {
        const song = Store.getSong(addButton.dataset.add);
        if (song) SongView.addToSetlistModal(song);
      }
    });

    paint();
  }

  /* ---------------- Editor ---------------- */

  function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
    const position = start + text.length;
    textarea.selectionStart = textarea.selectionEnd = position;
    textarea.focus();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function chordProModal(textarea) {
    UI.modal({
      title: 'Convertir desde ChordPro',
      subtitle: 'Pega una canción con acordes entre corchetes y la convertiremos al formato de acordes sobre la letra.',
      wide: true,
      body: '<div class="field"><label for="chordproInput">Texto ChordPro</label>'
        + '<textarea id="chordproInput" class="content-input" style="min-height:220px" placeholder="[Verso 1]\n[G]Santo, santo, [C]santo, [G]Señor..."></textarea>'
        + '<span class="hint">Ejemplo: <code>[G]Cuán grande [C]es Él</code>. Las secciones se escriben como <code>[Coro]</code> o <code>{Coro}</code>.</span></div>',
      actions: [
        { label: 'Cancelar', class: 'ghost' },
        {
          label: 'Convertir y reemplazar',
          class: 'primary',
          onClick: (close, box) => {
            const input = box.querySelector('#chordproInput');
            const value = input ? input.value.trim() : '';
            if (!value) { UI.toast('Pega primero el texto ChordPro', 'error'); return { keepOpen: true }; }
            const converted = window.Chords.convertChordPro(value);
            textarea.value = converted;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            UI.toast('Contenido convertido');
          },
        },
      ],
      onMount: (box) => {
        const input = box.querySelector('#chordproInput');
        if (input) setTimeout(() => input.focus(), 50);
      },
    });
  }

  function editor(container, songId) {
    if (!Store.canEdit) {
      const reason = Store.readOnlyReason;
      const title = reason === 'offline' ? 'Sin conexión' : reason === 'role' ? 'Solo lectura' : 'Perfil de solo lectura';
      const message = reason === 'role'
        ? 'Tu rol es músico: podés ver y usar el repertorio, pero las canciones las edita un administrador o editor.'
        : reason === 'offline'
          ? 'Estás sin conexión. Podés consultar el repertorio, pero para crear o modificar canciones necesitás internet.'
          : 'Este perfil fue compartido y no se puede editar. Cambia a tu perfil para crear o modificar canciones.';
      document.title = 'Solo lectura · Repertorio';
      container.innerHTML = '<div class="empty"><div class="empty-icon">' + UI.icon('eye') + '</div>'
        + '<h3>' + title + '</h3><p>' + message + '</p>'
        + '<div class="actions"><a class="btn primary" href="#/canciones">Ver canciones</a>'
        + (reason === 'profile' ? '<a class="btn" href="#/ajustes">Cambiar de perfil</a>' : '') + '</div></div>';
      return;
    }
    const existing = songId ? Store.getSong(songId) : null;
    if (songId && !existing) {
      container.innerHTML = '<div class="empty"><div class="empty-icon">' + UI.icon('music') + '</div><h3>Canción no encontrada</h3>'
        + '<div class="actions"><a class="btn" href="#/canciones">Volver</a></div></div>';
      return;
    }
    const song = existing || {
      title: '', author: '', key: Store.state.settings.defaultKey || 'G', capo: 0, bpm: '',
      duration: 0, category: 'Alabanza', difficulty: 'Fácil', tags: [], links: [], summary: [], notes: '', content: '',
    };
    document.title = (existing ? 'Editar' : 'Nueva canción') + ' · Repertorio';

    const keyOptions = ['<option value="">Sin definir</option>'].concat(
      KEY_OPTIONS.map((key) => '<option value="' + key + '"' + (song.key === key ? ' selected' : '') + '>' + key + '</option>')
    ).join('');
    const categoryOptions = Store.CATEGORIES.map((category) =>
      '<option value="' + U.esc(category) + '"' + (song.category === category ? ' selected' : '') + '>' + U.esc(category) + '</option>'
    ).join('');
    const difficultyOptions = DIFFICULTIES.map((level) =>
      '<option value="' + level + '"' + (song.difficulty === level ? ' selected' : '') + '>' + level + '</option>'
    ).join('');

    container.innerHTML = ''
      + '<a class="back-link" href="' + (existing ? '#/canciones/' + existing.id : '#/canciones') + '">' + UI.icon('arrow-left') + 'Volver</a>'
      + '<header class="page-head">'
      + '  <div><div class="eyebrow">' + UI.icon(existing ? 'edit' : 'plus') + (existing ? 'Editando' : 'Nueva') + '</div>'
      + '  <h1>' + (existing ? U.esc(existing.title) : 'Nueva canción') + '</h1>'
      + '  <p class="sub">Guarda la letra con los acordes encima para poder transponer y usar capo.</p></div>'
      + '  <div class="head-actions">'
      + '    <a class="btn ghost" href="' + (existing ? '#/canciones/' + existing.id : '#/canciones') + '">Cancelar</a>'
      + '    <button class="btn primary" type="submit" form="songForm">' + UI.icon('check') + 'Guardar canción</button>'
      + '  </div>'
      + '</header>'
      + '<form id="songForm" class="editor-layout" novalidate>'
      + '  <div class="stack">'
      + '    <div class="card panel stack">'
      + '      <div class="form-grid">'
      + '        <div class="field" style="grid-column:1/-1"><label for="fTitle">Título *</label><input id="fTitle" name="title" type="text" required value="' + U.esc(song.title) + '" placeholder="Nombre de la canción"></div>'
      + '        <div class="field"><label for="fAuthor">Autor / fuente</label><input id="fAuthor" name="author" type="text" value="' + U.esc(song.author) + '" placeholder="Autor o tradicional"></div>'
      + '        <div class="field"><label for="fKey">Tonalidad original</label><select id="fKey" name="key">' + keyOptions + '</select><span class="hint">Al cambiarla, los acordes escritos se transportan automáticamente.</span></div>'
      + '        <div class="field"><label for="fCapo">Capo</label><input id="fCapo" name="capo" type="number" min="0" max="11" value="' + (Number(song.capo) || 0) + '"></div>'
      + '        <div class="field"><label for="fBpm">Tempo (BPM)</label><input id="fBpm" name="bpm" type="number" min="0" max="300" value="' + (song.bpm || '') + '" placeholder="72"></div>'
      + '        <div class="field"><label for="fDuration">Duración</label><input id="fDuration" name="duration" type="text" value="' + (song.duration ? U.fmtDuration(song.duration) : '') + '" placeholder="4:10"></div>'
      + '        <div class="field"><label for="fCategory">Momento / categoría</label><select id="fCategory" name="category">' + categoryOptions + '</select></div>'
      + '        <div class="field"><label for="fDifficulty">Dificultad</label><select id="fDifficulty" name="difficulty">' + difficultyOptions + '</select></div>'
      + '        <div class="field" style="grid-column:1/-1"><label for="fTags">Etiquetas</label><input id="fTags" name="tags" type="text" value="' + U.esc((song.tags || []).join(', ')) + '" placeholder="adoración, acústico, congregacional"><span class="hint">Sepáralas con comas. Te servirán para filtrar en el buscador.</span></div>'
      + '        <div class="field" style="grid-column:1/-1"><label for="fNotes">Notas para el equipo</label><textarea id="fNotes" name="notes" rows="3" placeholder="Indicaciones, arreglos, dinámica…">' + U.esc(song.notes) + '</textarea></div>'
      + '      </div>'
      + '    </div>'
      + '    <div class="card panel">'
      + '      <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px">'
      + '        <div><h2>Links para escuchar</h2><p class="tiny muted">Pegá enlaces que empiecen con <code>https://</code>. El nombre se completa solo según la plataforma y podés cambiarlo.</p></div>'
      + '        <button type="button" class="btn sm" id="addSongLink">' + UI.icon('plus') + 'Añadir link</button>'
      + '      </div>'
      + '      <div id="songLinks" class="link-list"></div>'
      + '      <p class="tiny muted" id="songLinksEmpty" style="margin-top:12px">Todavía no agregaste links.</p>'
      + '    </div>'
      + '    <div class="card panel">'
      + '      <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px">'
      + '        <div><h2>Letra y acordes</h2><p class="tiny muted">Escribe los acordes en la línea de arriba y la letra debajo, alineados.</p></div>'
      + '        <button type="button" class="btn sm" id="convertChordpro">' + UI.icon('refresh') + 'Convertir ChordPro</button>'
      + '      </div>'
      + '      <div class="field" style="margin-top:12px"><textarea id="fContent" name="content" class="content-input" spellcheck="false" placeholder="[Verso 1]\nG             C\nSanto, santo, santo, Señor...">' + U.esc(song.content) + '</textarea></div>'
      + '      <div class="editor-toolbar">'
      + '        <span class="tiny muted" style="align-self:center;margin-right:4px">Insertar:</span>'
      + '        <button type="button" class="btn sm" data-insert="[Intro]">Intro</button>'
      + '        <button type="button" class="btn sm" data-insert="[Verso 1]">Verso</button>'
      + '        <button type="button" class="btn sm" data-insert="[Coro]">Coro</button>'
      + '        <button type="button" class="btn sm" data-insert="[Puente]">Puente</button>'
      + '        <button type="button" class="btn sm" data-insert="[Instrumental]">Instrumental</button>'
      + '        <button type="button" class="btn sm" data-insert="[Final]">Final</button>'
      + '      </div>'
      + '      <p class="tiny muted" style="margin-top:10px">Formato: una línea de acordes, luego la letra. Las secciones van entre corchetes, por ejemplo <code>[Coro]</code>. Usa espacios para alinear cada acorde sobre la sílaba.</p>'
      + '    </div>'
      + (existing && Store.canDelete ? '    <div class="card panel" style="border-color:color-mix(in srgb, var(--danger) 25%, var(--border-soft))">'
        + '<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px"><div><h3 class="text-danger">Eliminar canción</h3><p class="tiny muted">También se quitará de los repertorios donde esté.</p></div>'
        + '<button type="button" class="btn danger" id="deleteSong">' + UI.icon('trash') + 'Eliminar</button></div></div>' : '')
      + '    <div class="card panel" id="summaryPanel">'
      + '      <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px">'
      + '        <div><h2>Resumen por parte</h2><p class="tiny muted">Para el talkback: la frase guía y los grados de cada parte, en orden. Podés completarlo después.</p></div>'
      + '        <button type="button" class="btn sm" id="addSummaryPart">' + UI.icon('plus') + 'Añadir parte</button>'
      + '      </div>'
      + '      <div id="summaryParts" class="summary-list"></div>'
      + '      <p class="tiny muted" id="summaryEmpty" style="margin-top:12px">Todavía no agregaste partes del resumen.</p>'
      + '      <p class="tiny muted" style="margin-top:10px">Los grados son texto libre, por ejemplo <code>1 - 1 - 4 - 2</code> o <code>1 - 2 - 6 - 4 | 1 - 2 - 6 - 4</code>.</p>'
      + '    </div>'
      + '  </div>'
      + '  <aside class="preview-pane">'
      + '    <div class="preview-head"><div><div class="eyebrow" style="margin:0">Vista previa</div><strong id="previewTitle">' + U.esc(song.title || 'Sin título') + '</strong></div>'
      + '      <div id="previewKey">' + (song.key ? UI.keyBadge(song.key) : '') + '</div></div>'
      + '    <div class="preview-body"><div class="song-content" id="previewContent"></div></div>'
      + '  </aside>'
      + '</form>';

    const form = U.$('#songForm', container);
    const textarea = U.$('#fContent', container);
    const previewContent = U.$('#previewContent', container);
    const previewTitle = U.$('#previewTitle', container);
    const previewKey = U.$('#previewKey', container);
    const titleInput = U.$('#fTitle', container);
    const keySelect = U.$('#fKey', container);
    const linksList = U.$('#songLinks', container);
    const linksEmpty = U.$('#songLinksEmpty', container);

    /* ---------- Links para escuchar ---------- */

    function linkRow(link) {
      const data = link || {};
      const row = document.createElement('div');
      row.className = 'link-row';
      row.setAttribute('data-link-row', '');
      row.innerHTML = '<input type="url" class="link-url" data-link-url inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://..." aria-label="Dirección del link">'
        + '<input type="text" class="link-label" data-link-label maxlength="40" placeholder="YouTube, Spotify…" aria-label="Nombre para mostrar">'
        + '<button type="button" class="btn ghost icon-only link-remove" data-remove-link title="Quitar link" aria-label="Quitar link">' + UI.icon('trash') + '</button>';
      const urlInput = row.querySelector('[data-link-url]');
      const labelInput = row.querySelector('[data-link-label]');
      const url = String(data.url || '');
      const label = String(data.label || '');
      urlInput.value = url;
      labelInput.value = label || U.detectLinkPlatform(url).name;
      labelInput.dataset.auto = label ? '0' : '1';
      return row;
    }

    function syncLinksEmpty() {
      linksEmpty.hidden = !!linksList.querySelector('[data-link-row]');
    }

    function addLinkRow(link, focus) {
      const row = linkRow(link);
      linksList.appendChild(row);
      syncLinksEmpty();
      if (focus) row.querySelector('[data-link-url]').focus();
      return row;
    }

    function collectLinks() {
      const rows = Array.from(linksList.querySelectorAll('[data-link-row]'));
      const links = [];
      const seen = new Set();
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const urlInput = row.querySelector('[data-link-url]');
        const labelInput = row.querySelector('[data-link-label]');
        const url = urlInput.value.trim();
        const label = labelInput.value.trim();
        urlInput.classList.remove('invalid');
        if (!url && !label) continue;
        if (!url) {
          UI.toast('Completá la dirección del link o quitalo.', 'error');
          urlInput.classList.add('invalid');
          urlInput.focus();
          return null;
        }
        if (!U.isSafeHttpsUrl(url)) {
          UI.toast('El link tiene que empezar con https://. Por ejemplo: https://www.youtube.com/…', 'error');
          urlInput.classList.add('invalid');
          urlInput.focus();
          return null;
        }
        const key = url.toLowerCase();
        if (seen.has(key)) {
          UI.toast('Ese link ya está agregado.', 'error');
          urlInput.classList.add('invalid');
          urlInput.focus();
          return null;
        }
        seen.add(key);
        const finalLabel = label || U.detectLinkPlatform(url).name;
        links.push(finalLabel ? { url: url, label: finalLabel } : { url: url });
      }
      return links;
    }

    (song.links || []).forEach((link) => addLinkRow(link, false));
    syncLinksEmpty();

    U.$('#addSongLink', container).addEventListener('click', () => addLinkRow({ url: '', label: '' }, true));

    linksList.addEventListener('input', (event) => {
      const urlInput = event.target.closest('[data-link-url]');
      if (urlInput) {
        const row = urlInput.closest('[data-link-row]');
        const labelInput = row.querySelector('[data-link-label]');
        urlInput.classList.remove('invalid');
        const detected = U.detectLinkPlatform(urlInput.value);
        if (detected.name && (!labelInput.value.trim() || labelInput.dataset.auto === '1')) {
          labelInput.value = detected.name;
          labelInput.dataset.auto = '1';
        }
        return;
      }
      const labelInput = event.target.closest('[data-link-label]');
      if (labelInput) labelInput.dataset.auto = labelInput.value.trim() ? '0' : '1';
    });

    linksList.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-link]');
      if (!removeButton) return;
      const row = removeButton.closest('[data-link-row]');
      if (row) row.remove();
      syncLinksEmpty();
    });

    /* ---------- Resumen por parte ---------- */

    const summaryList = U.$('#summaryParts', container);
    const summaryEmpty = U.$('#summaryEmpty', container);

    function summaryNameOptions(selected) {
      return SUMMARY_NAMES.map((name) => '<option value="' + U.esc(name) + '"'
        + (name === selected ? ' selected' : '') + '>' + U.esc(name) + '</option>').join('');
    }

    function summaryTitle(row) {
      const node = row.querySelector('[data-summary-title]');
      const select = row.querySelector('[data-summary-name]');
      const custom = row.querySelector('[data-summary-custom]');
      const label = select.value === 'Otro'
        ? (custom.value.trim().slice(0, SUMMARY_LIMITS.name) || 'Otro')
        : select.value;
      if (node) node.textContent = label || 'Parte';
    }

    function syncCustomName(row) {
      const select = row.querySelector('[data-summary-name]');
      const custom = row.querySelector('[data-summary-custom]');
      const other = select.value === 'Otro';
      if (other) custom.value = row.dataset.summaryCustom || '';
      else row.dataset.summaryCustom = custom.value;
      custom.hidden = !other;
      summaryTitle(row);
    }

    function summaryRow(data) {
      const part = data || {};
      const rawName = String(part.name || '').trim().slice(0, SUMMARY_LIMITS.name);
      const known = SUMMARY_NAMES.indexOf(rawName) !== -1;
      const name = known ? rawName : (rawName ? 'Otro' : 'Verso');
      const row = document.createElement('div');
      row.className = 'summary-row';
      row.setAttribute('data-summary-row', '');
      row.dataset.summaryCustom = known ? '' : rawName;
      /* El HTML es fijo: los datos se asignan con value/textContent, nunca se
         intercalan en innerHTML. Así el texto del resumen jamás se interpreta
         como HTML. */
      row.innerHTML = ''
        + '<div class="summary-row-head">'
        + '  <span class="summary-index" data-summary-index></span>'
        + '  <span class="summary-row-title" data-summary-title></span>'
        + '  <span class="summary-actions">'
        + '    <button type="button" class="btn ghost icon-only" data-summary-up title="Subir parte" aria-label="Subir parte">' + UI.icon('chevron-up') + '</button>'
        + '    <button type="button" class="btn ghost icon-only" data-summary-down title="Bajar parte" aria-label="Bajar parte">' + UI.icon('chevron-down') + '</button>'
        + '    <button type="button" class="btn ghost icon-only" data-summary-dupe title="Duplicar parte" aria-label="Duplicar parte">' + UI.icon('copy') + '</button>'
        + '    <button type="button" class="btn ghost icon-only" data-summary-remove title="Quitar parte" aria-label="Quitar parte">' + UI.icon('trash') + '</button>'
        + '  </span>'
        + '</div>'
        + '<div class="summary-grid">'
        + '  <div class="field"><label>Nombre de la parte</label><select data-summary-name aria-label="Nombre de la parte">' + summaryNameOptions(name) + '</select>'
        + '    <input type="text" data-summary-custom maxlength="' + SUMMARY_LIMITS.name + '" placeholder="Escribí el nombre" aria-label="Nombre de la parte" hidden></div>'
        + '  <div class="field summary-wide"><label>Frase guía</label><input type="text" data-summary-phrase maxlength="' + SUMMARY_LIMITS.phrase + '" placeholder="Ahí viene en las nubes" aria-label="Frase guía"></div>'
        + '  <div class="field"><label>Grados</label><input type="text" class="summary-degrees" data-summary-degrees maxlength="' + SUMMARY_LIMITS.degrees + '" placeholder="1 - 1 - 4 - 2" aria-label="Grados"></div>'
        + '  <div class="field"><label>Nota (opcional)</label><input type="text" data-summary-note maxlength="' + SUMMARY_LIMITS.note + '" placeholder="x2, baja la intensidad…" aria-label="Nota"></div>'
        + '</div>';
      row.querySelector('[data-summary-phrase]').value = String(part.phrase || '').trim().slice(0, SUMMARY_LIMITS.phrase);
      row.querySelector('[data-summary-degrees]').value = String(part.degrees || '').trim().slice(0, SUMMARY_LIMITS.degrees);
      row.querySelector('[data-summary-note]').value = String(part.note || '').trim().slice(0, SUMMARY_LIMITS.note);
      syncCustomName(row);
      return row;
    }

    function syncSummaryList() {
      const rows = Array.from(summaryList.querySelectorAll('[data-summary-row]'));
      rows.forEach((row, index) => {
        row.querySelector('[data-summary-index]').textContent = String(index + 1);
        row.querySelector('[data-summary-up]').disabled = index === 0;
        row.querySelector('[data-summary-down]').disabled = index === rows.length - 1;
        syncCustomName(row);
      });
      summaryEmpty.hidden = rows.length > 0;
    }

    function addSummaryRow(data, focus, after) {
      if (summaryList.querySelectorAll('[data-summary-row]').length >= SUMMARY_MAX_PARTS) {
        UI.toast('El resumen puede tener hasta ' + SUMMARY_MAX_PARTS + ' partes.', 'error');
        return null;
      }
      const row = summaryRow(data);
      if (after && after.parentNode === summaryList) summaryList.insertBefore(row, after.nextSibling);
      else summaryList.appendChild(row);
      syncSummaryList();
      if (focus) row.querySelector('[data-summary-name]').focus();
      return row;
    }

    function summaryValues(row) {
      const select = row.querySelector('[data-summary-name]');
      const custom = row.querySelector('[data-summary-custom]');
      return {
        name: select.value === 'Otro'
          ? custom.value.trim().slice(0, SUMMARY_LIMITS.name)
          : select.value,
        phrase: row.querySelector('[data-summary-phrase]').value.trim().slice(0, SUMMARY_LIMITS.phrase),
        degrees: row.querySelector('[data-summary-degrees]').value.trim().slice(0, SUMMARY_LIMITS.degrees),
        note: row.querySelector('[data-summary-note]').value.trim().slice(0, SUMMARY_LIMITS.note),
      };
    }

    function markSummaryInvalid(row, selector) {
      const input = row.querySelector(selector);
      if (!input) return;
      input.classList.add('invalid');
      input.focus();
    }

    function collectSummary() {
      const rows = Array.from(summaryList.querySelectorAll('[data-summary-row]'));
      const parts = [];
      rows.forEach((row) => {
        row.querySelectorAll('.invalid').forEach((input) => input.classList.remove('invalid'));
      });
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const values = summaryValues(row);
        if (!values.name && !values.phrase && !values.degrees && !values.note) continue;
        if (!values.name) {
          UI.toast('Elegí un nombre para la parte ' + (index + 1) + ' (o escribí uno en «Otro»).', 'error');
          markSummaryInvalid(row, '[data-summary-custom]');
          return null;
        }
        if (!values.degrees) {
          UI.toast('Escribí los grados de «' + values.name + '», por ejemplo 1 - 4 - 5.', 'error');
          markSummaryInvalid(row, '[data-summary-degrees]');
          return null;
        }
        parts.push(values);
      }
      return parts;
    }

    function swapSummaryRows(row, direction) {
      const sibling = direction < 0 ? row.previousElementSibling : row.nextElementSibling;
      if (!sibling || !sibling.hasAttribute('data-summary-row')) return;
      if (direction < 0) summaryList.insertBefore(row, sibling);
      else summaryList.insertBefore(sibling, row);
      syncSummaryList();
    }

    (song.summary || []).forEach((part) => addSummaryRow(part, false));
    syncSummaryList();

    U.$('#addSummaryPart', container).addEventListener('click', () => addSummaryRow({}, true));

    summaryList.addEventListener('change', (event) => {
      const select = event.target.closest('[data-summary-name]');
      if (!select) return;
      const row = select.closest('[data-summary-row]');
      syncCustomName(row);
      event.target.classList.remove('invalid');
      if (select.value === 'Otro') row.querySelector('[data-summary-custom]').focus();
    });

    summaryList.addEventListener('input', (event) => {
      event.target.classList.remove('invalid');
      const custom = event.target.closest('[data-summary-custom]');
      if (custom) {
        const row = custom.closest('[data-summary-row]');
        row.dataset.summaryCustom = custom.value;
        summaryTitle(row);
      }
    });

    summaryList.addEventListener('click', (event) => {
      const row = event.target.closest('[data-summary-row]');
      if (!row) return;
      if (event.target.closest('[data-summary-up]')) swapSummaryRows(row, -1);
      else if (event.target.closest('[data-summary-down]')) swapSummaryRows(row, 1);
      else if (event.target.closest('[data-summary-dupe]')) addSummaryRow(summaryValues(row), false, row);
      else if (event.target.closest('[data-summary-remove]')) {
        row.remove();
        syncSummaryList();
      }
    });

    function updatePreview() {
      previewTitle.textContent = titleInput.value.trim() || 'Sin título';
      previewKey.innerHTML = keySelect.value ? UI.keyBadge(keySelect.value) : '';
      previewContent.innerHTML = textarea.value.trim()
        ? SongView.renderContentHTML(textarea.value, { transpose: 0, preferFlat: window.Chords.keyUsesFlats(keySelect.value) })
        : '<p class="muted small">La vista previa aparecerá aquí mientras escribes.</p>';
    }

    let previousKey = song.key || '';
    const debouncedPreview = U.debounce(updatePreview, 180);
    titleInput.addEventListener('input', debouncedPreview);
    keySelect.addEventListener('change', () => {
      const nextKey = keySelect.value;
      if (previousKey && nextKey && textarea.value.trim()) {
        const delta = window.Chords.semitoneDelta(previousKey, nextKey);
        if (delta !== 0) {
          textarea.value = window.Chords.transposeContent(textarea.value, delta, window.Chords.keyUsesFlats(nextKey));
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          UI.toast('Acordes transportados a ' + nextKey);
        }
      }
      previousKey = nextKey;
      updatePreview();
    });
    textarea.addEventListener('input', debouncedPreview);
    updatePreview();

    U.$('#convertChordpro', container).addEventListener('click', () => chordProModal(textarea));

    container.querySelectorAll('[data-insert]').forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.dataset.insert;
        const needsBreak = textarea.value && !/\n$/.test(textarea.value);
        insertAtCursor(textarea, (needsBreak ? '\n' : '') + value + '\n');
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const title = titleInput.value.trim();
      if (!title) {
        UI.toast('Escribe un título para la canción', 'error');
        titleInput.focus();
        return;
      }
      const links = collectLinks();
      if (links === null) return;
      const summary = collectSummary();
      if (summary === null) return;
      const payload = {
        id: existing ? existing.id : undefined,
        title,
        author: U.$('#fAuthor', container).value.trim(),
        key: keySelect.value,
        capo: U.clamp(Number(U.$('#fCapo', container).value) || 0, 0, 11),
        bpm: Number(U.$('#fBpm', container).value) || 0,
        duration: U.parseDurationInput(U.$('#fDuration', container).value),
        category: U.$('#fCategory', container).value,
        difficulty: U.$('#fDifficulty', container).value,
        tags: U.$('#fTags', container).value.split(',').map((tag) => tag.trim()).filter(Boolean),
        links: links,
        summary: summary,
        notes: U.$('#fNotes', container).value.trim(),
        content: textarea.value.replace(/\r/g, ''),
      };
      const saved = Store.saveSong(payload);
      UI.toast(existing ? 'Canción actualizada' : 'Canción creada');
      window.location.hash = '#/canciones/' + saved.id;
    });

    if (existing && Store.canDelete) {
      const deleteButton = U.$('#deleteSong', container);
      if (deleteButton) deleteButton.addEventListener('click', async () => {
        const confirmed = await UI.confirm({
          title: 'Eliminar «' + existing.title + '»',
          message: 'Esta acción no se puede deshacer. La canción también se quitará de todos los repertorios.',
          confirmLabel: 'Eliminar',
          danger: true,
        });
        if (!confirmed) return;
        Store.deleteSong(existing.id);
        UI.toast('Canción eliminada');
        window.location.hash = '#/canciones';
      });
    }

    form.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        form.requestSubmit();
      }
    });
  }

  window.SongsView = { list, editor };
})();
