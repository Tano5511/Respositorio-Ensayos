/* Vista de canción: lectura, transposición, capo y desplazamiento automático */
(function () {
  'use strict';

  const U = window.U;
  const C = window.Chords;
  const UI = window.UI;

  let autoScrollFrame = null;
  let autoScrollLast = 0;

  function stopAutoScroll() {
    if (autoScrollFrame) {
      cancelAnimationFrame(autoScrollFrame);
      autoScrollFrame = null;
    }
  }

  function cleanup() {
    stopAutoScroll();
  }

  /** Genera el HTML de la letra con acordes. */
  function renderContentHTML(content, options) {
    const opts = options || {};
    const shift = Number(opts.transpose) || 0;
    const preferFlat = !!opts.preferFlat;
    const blocks = C.parseSongContent(content || '');
    const parts = [];
    let lastWasGap = false;

    blocks.forEach((block) => {
      if (block.type === 'gap') {
        if (!lastWasGap) parts.push('<div class="gap"></div>');
        lastWasGap = true;
        return;
      }
      lastWasGap = false;

      if (block.type === 'section') {
        parts.push('<div class="section-label">' + U.esc(block.label) + '</div>');
        return;
      }

      if (block.type === 'chords') {
        let html = '';
        let cursor = 0;
        C.chordTokensWithPositions(block.text).forEach((token) => {
          const target = Math.max(cursor, token.col);
          html += U.esc(block.text.slice(cursor, target));
          html += '<span class="chord">' + U.esc(C.transposeChord(token.chord, shift, preferFlat)) + '</span>';
          cursor = token.col + token.chord.length;
        });
        html += U.esc(block.text.slice(cursor));
        parts.push('<div class="chord-only">' + html + '</div>');
        return;
      }

      if (block.type === 'lyric') {
        parts.push('<div class="lyric-line">' + (U.esc(block.text) || '<br>') + '</div>');
        return;
      }

      if (block.type === 'pair') {
        const segments = C.buildSegments(block.chords, block.lyric);
        const html = segments.map((segment) => {
          const chord = segment.chord ? C.transposeChord(segment.chord, shift, preferFlat) : '';
          return '<span class="seg">'
            + '<span class="chord">' + U.esc(chord) + '</span>'
            + '<span class="txt">' + U.esc(segment.text) + '</span>'
            + '</span>';
        }).join('');
        parts.push('<div class="lyric-pair">' + html + '</div>');
      }
    });

    return parts.join('');
  }

  function addToSetlistModal(song) {
    if (!Store.canEdit) {
      UI.toast(Store.readOnlyMessage, 'error');
      return null;
    }
    const lists = Store.state.setlists
      .slice()
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const body = lists.length
      ? '<p class="small muted" style="margin-bottom:10px">Elige el repertorio al que quieres añadir la canción. Se agregará al final.</p>'
        + '<div class="stack" style="gap:6px">' + lists.map((list) =>
          '<button type="button" class="add-song-row" data-list-id="' + list.id + '">'
          + '<span class="main"><strong>' + U.esc(list.name) + '</strong><small>' + U.esc(U.fmtDate(list.date)) + ' · ' + list.items.length + ' canciones</small></span>'
          + UI.icon('plus')
          + '</button>'
        ).join('') + '</div>'
      : '<div class="empty" style="padding:28px"><div class="empty-icon">' + UI.icon('list') + '</div>'
        + '<h3>No hay repertorios</h3><p>Crea uno primero para organizar las canciones.</p>'
        + '<div class="actions"><a class="btn primary" href="#/repertorios">Ir a repertorios</a></div></div>';

    const dialog = UI.modal({
      title: 'Añadir a un repertorio',
      subtitle: song.title,
      body: body,
      onMount: (box, close) => {
        box.addEventListener('click', (event) => {
          if (event.target.closest('a[href="#/repertorios"]')) close();
        });
        box.querySelectorAll('[data-list-id]').forEach((button) => {
          button.addEventListener('click', () => {
            const list = Store.getSetlist(button.dataset.listId);
            Store.addSongToSetlist(button.dataset.listId, song.id);
            close();
            UI.toast('Añadida a «' + (list ? list.name : 'repertorio') + '»');
          });
        });
      },
    });
    return dialog;
  }

  function notFound(container) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">' + UI.icon('music') + '</div>'
      + '<h3>No encontramos esta canción</h3><p>Puede que se haya eliminado.</p>'
      + '<div class="actions"><a class="btn primary" href="#/canciones">Ver todas las canciones</a></div></div>';
  }

  function hashParams() {
    const raw = window.location.hash || '';
    const queryIndex = raw.indexOf('?');
    return new URLSearchParams(queryIndex === -1 ? '' : raw.slice(queryIndex + 1));
  }

  function keyChoices(baseKey) {
    if (!baseKey || !C.parseChord(baseKey)) return [];
    const choices = [];
    for (let semitones = 0; semitones < 12; semitones += 1) {
      const name = C.targetKey(baseKey, semitones);
      if (name && choices.indexOf(name) === -1) choices.push(name);
    }
    return choices;
  }

  function reader(container, songId, options) {
    const opts = options || {};
    const song = Store.getSong(songId);
    if (!song) { notFound(container); return; }

    const editable = Store.canEdit;
    Store.touchSong(songId);

    const baseKey = song.key || '';
    const params = hashParams();
    const requestedKey = params.get('tono') || '';
    const backSetlistId = params.get('volver') || '';
    if (backSetlistId) {
      const setlist = Store.getSetlist(backSetlistId);
      if (setlist) {
        opts.backHref = '#/repertorios/' + setlist.id;
        opts.backLabel = setlist.name;
      }
    }

    const state = {
      transpose: baseKey && requestedKey ? C.semitoneDelta(baseKey, requestedKey) : 0,
      capo: params.has('capo') ? U.clamp(Number(params.get('capo')) || 0, 0, 11) : (Number(song.capo) || 0),
      fontSize: Number(Store.state.settings.fontSize) || 17,
      showChords: Store.state.settings.showChords !== false,
      speed: 22,
    };
    const keyOptions = keyChoices(baseKey);
    const keySelectHTML = baseKey
      ? '<option value="__original">Original (' + baseKey + ')</option>'
        + keyOptions.map((key) => '<option value="' + key + '">' + key + '</option>').join('')
      : '<option value="">Sin tonalidad</option>';

    function soundingKey() {
      return baseKey ? C.targetKey(baseKey, state.transpose) : '';
    }
    function shapesKey() {
      if (!baseKey) return '';
      const shift = state.transpose - state.capo;
      const prefersFlat = C.keyUsesFlats(soundingKey()) || C.keyUsesFlats(C.targetKey(baseKey, shift));
      return C.transposeKey(baseKey, shift, prefersFlat);
    }
    function renderShift() {
      return state.transpose - state.capo;
    }

    const metaChips = [];
    if (song.bpm) metaChips.push('<span class="chip">' + UI.icon('tempo') + song.bpm + ' BPM</span>');
    if (song.duration) metaChips.push('<span class="chip">' + UI.icon('clock') + U.fmtDuration(song.duration) + '</span>');
    if (song.category) metaChips.push('<span class="chip blue">' + U.esc(song.category) + '</span>');
    if (song.difficulty) metaChips.push('<span class="chip">' + U.esc(song.difficulty) + '</span>');
    (song.tags || []).forEach((tag) => { metaChips.push('<span class="chip plain">#' + U.esc(tag) + '</span>'); });

    /* Arma el reproductor embebido de Spotify. Devuelve null cuando el link
       no permite un embed (por ejemplo un enlace corto): en ese caso se abre
       directamente en una pestaña nueva. */
    function spotifyEmbed(value) {
      const url = U.parseHttpsUrl(value);
      if (!url) return null;
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      if (host !== 'open.spotify.com') return null;
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length && /^intl-[a-z]{2}$/i.test(parts[0])) parts.shift();
      const type = String(parts[0] || '').toLowerCase();
      const id = String(parts[1] || '');
      const types = ['track', 'album', 'playlist', 'artist', 'episode', 'show'];
      if (types.indexOf(type) === -1 || !/^[A-Za-z0-9]{22}$/.test(id)) return null;
      return {
        src: 'https://open.spotify.com/embed/' + type + '/' + id + '?utm_source=generator&theme=0',
        height: type === 'track' || type === 'episode' ? 152 : 352,
      };
    }

    const listenLinks = (Array.isArray(song.links) ? song.links : [])
      .map((link) => {
        const url = String(link && link.url ? link.url : '').trim();
        if (!U.isSafeHttpsUrl(url)) return null;
        const platform = U.detectLinkPlatform(url);
        const youtubeId = U.youtubeVideoId(url);
        return {
          url: url,
          label: String(link && link.label ? link.label : '').trim() || platform.name || 'Enlace',
          platformKey: platform.key,
          youtubeId: youtubeId,
          spotify: platform.key === 'spotify' ? spotifyEmbed(url) : null,
        };
      })
      .filter(Boolean);

    function listenItemHTML(link) {
      if (link.youtubeId) {
        const label = link.label || 'YouTube';
        return '<div class="listen-item">'
          + '<button type="button" class="listen-thumb" data-youtube-id="' + U.esc(link.youtubeId) + '" data-listen-label="' + U.esc(label) + '" aria-expanded="false" aria-controls="listenPlayer" aria-label="Ver el video de ' + U.esc(label) + ' dentro de la app" title="Ver el video dentro de la app">'
          + '<img class="listen-thumb-img" src="https://i.ytimg.com/vi/' + encodeURIComponent(link.youtubeId) + '/hqdefault.jpg" alt="" decoding="async" referrerpolicy="no-referrer">'
          + '<span class="listen-play" aria-hidden="true">' + UI.icon('play') + '</span>'
          + '</button>'
          + '<div class="listen-meta">'
          + '<span class="listen-label" title="' + U.esc(label) + '">' + U.esc(label) + '</span>'
          + '<a class="btn ghost sm listen-open" href="' + U.esc(link.url) + '" target="_blank" rel="noopener noreferrer" title="Abrir en YouTube en una pestaña nueva">' + UI.icon('link') + 'Abrir en YouTube</a>'
          + '</div>'
          + '</div>';
      }
      if (link.platformKey === 'spotify') {
        const label = link.label || 'Spotify';
        const openLink = '<a class="btn ghost sm listen-open" href="' + U.esc(link.url) + '" target="_blank" rel="noopener noreferrer" title="Abrir en Spotify en una pestaña nueva">' + UI.icon('link') + 'Abrir en Spotify</a>';
        const card = link.spotify
          ? '<button type="button" class="listen-spotify" data-spotify-src="' + U.esc(link.spotify.src) + '" data-spotify-height="' + link.spotify.height + '" data-listen-label="' + U.esc(label) + '" aria-expanded="false" aria-controls="listenPlayer" aria-label="Reproducir ' + U.esc(label) + ' dentro de la app" title="Reproducir dentro de la app">'
            + '<span class="listen-spotify-icon">' + UI.icon('music') + '</span>'
            + '<span class="listen-spotify-name">' + U.esc(label) + '</span>'
            + '<span class="listen-spotify-hint">Tocar para escuchar</span>'
            + '</button>'
          : '<a class="listen-spotify" href="' + U.esc(link.url) + '" target="_blank" rel="noopener noreferrer" aria-label="Abrir ' + U.esc(label) + ' en Spotify en una pestaña nueva">'
            + '<span class="listen-spotify-icon">' + UI.icon('music') + '</span>'
            + '<span class="listen-spotify-name">' + U.esc(label) + '</span>'
            + '<span class="listen-spotify-hint">Abrir en Spotify</span>'
            + '</a>';
        return '<div class="listen-item">' + card + '<div class="listen-meta">' + openLink + '</div></div>';
      }
      return '<div class="listen-item">'
        + '<a class="btn listen-link" href="' + U.esc(link.url) + '" target="_blank" rel="noopener noreferrer" title="Abrir en una pestaña nueva">'
        + UI.icon('link') + '<span class="listen-label">' + U.esc(link.label) + '</span></a>'
        + '</div>';
    }

    const hasListenCard = listenLinks.length > 0 || editable;
    const listenHTML = hasListenCard
      ? '<section class="listen-card no-print" id="listenCard" aria-labelledby="listenTitle">'
        + '<div class="listen-head">'
        + '<h2 id="listenTitle">' + UI.icon('play') + 'Escuchar</h2>'
        + (editable
          ? '<a class="btn sm" href="#/canciones/' + song.id + '/editar">' + UI.icon('plus') + (listenLinks.length ? 'Editar links' : 'Agregar link') + '</a>'
          : '')
        + '</div>'
        + (listenLinks.length
          ? '<div class="listen-scroll"><div class="listen-grid">' + listenLinks.map(listenItemHTML).join('') + '</div></div>'
          + '<div class="listen-player" id="listenPlayer" hidden></div>'
          : '<p class="listen-empty">Esta canción todavía no tiene links para escuchar. Agregá YouTube, Spotify u otro enlace desde el editor.</p>')
        + '</section>'
      : '';

    container.innerHTML = ''
      + '<div class="reader">'
      + '  <div class="reader-bar no-print">'
      + '    <a class="back-link" style="margin:0" href="' + U.esc(opts.backHref || '#/canciones') + '">' + UI.icon('arrow-left') + U.esc(opts.backLabel || 'Canciones') + '</a>'
      + '    <div class="reader-title"><strong id="readerTitle">' + U.esc(song.title) + '</strong><small>' + U.esc(song.author || 'Autor desconocido') + '</small></div>'
      + '    <div class="controls">'
      + '      <div class="transpose-box" title="Tonalidad de la canción">'
      + '        <button type="button" data-transpose="-1" aria-label="Bajar medio tono">−</button>'
      + '        <select class="value key-select" id="currentKey" aria-label="Elegir tonalidad"' + (baseKey ? '' : ' disabled') + '>' + keySelectHTML + '</select>'
      + '        <button type="button" data-transpose="1" aria-label="Subir medio tono">+</button>'
      + '      </div>'
      + '      <div class="transpose-box" title="Capo (cejilla)">'
      + '        <button type="button" data-capo="-1" aria-label="Quitar capo">−</button>'
      + '        <select class="value" id="capoSelect" aria-label="Elegir capo">'
      + Array.from({ length: 12 }, (_, number) => '<option value="' + number + '">' + (number ? 'Capo ' + number : 'Sin capo') + '</option>').join('')
      + '        </select>'
      + '        <button type="button" data-capo="1" aria-label="Subir capo">+</button>'
      + '      </div>'
      + '      <button type="button" class="reader-toolbar-btn' + (state.showChords ? ' on' : '') + '" id="toggleChords" title="Mostrar u ocultar acordes">' + UI.icon(state.showChords ? 'eye' : 'eye-off') + '<span class="chords-label">' + (state.showChords ? 'Acordes' : 'Solo letra') + '</span></button>'
      + '      <button type="button" class="reader-toolbar-btn" data-font="-1" title="Letra más pequeña"><span style="font-size:.78rem">A−</span></button>'
      + '      <button type="button" class="reader-toolbar-btn" data-font="1" title="Letra más grande"><span style="font-size:.92rem">A+</span></button>'
      + '      <button type="button" class="reader-toolbar-btn" id="toggleScroll" title="Desplazamiento automático">' + UI.icon('play') + '<span>Auto</span></button>'
      + '      <button type="button" class="reader-toolbar-btn" id="printSong" title="Imprimir o guardar en PDF">' + UI.icon('printer') + '</button>'
      + (editable ? '      <a class="reader-toolbar-btn" href="#/canciones/' + song.id + '/editar" title="Editar canción">' + UI.icon('edit') + '</a>' : '')
      + (editable ? '      <button type="button" class="reader-toolbar-btn' + (song.favorite ? ' on' : '') + '" id="favSong" title="Marcar como favorita" aria-pressed="' + (song.favorite ? 'true' : 'false') + '">' + UI.icon('star') + '</button>' : '')
      + (editable ? '      <button type="button" class="reader-toolbar-btn" id="addToSetlist" title="Añadir a un repertorio">' + UI.icon('plus') + '</button>' : '')
      + '    </div>'
      + '  </div>'
      + '  <div class="reader-controls-row no-print" id="scrollSpeedRow" style="display:none">'
      + '    <span>Velocidad</span>'
      + '    <input type="range" min="4" max="60" value="' + state.speed + '" id="scrollSpeed" style="max-width:180px">'
      + '    <span class="tiny">Desplazamiento automático activo</span>'
      + '  </div>'
      + '  <div class="reader-scroll" id="readerScroll">'
      + '    <div class="reader-inner">'
      + '      <div class="reader-layout' + (hasListenCard ? '' : ' no-listen') + '">'
      + '      <header class="reader-head">'
      + '        <h1>' + U.esc(song.title) + '</h1>'
      + '        <div class="meta-row">' + UI.keyBadge(soundingKey(), 'Tono') + '<span class="muted small" id="shapeInfo"></span>' + metaChips.join('') + UI.readOnlyChip() + '</div>'
      + (song.notes ? '<p class="note">' + U.esc(song.notes) + '</p>' : '')
      + '      </header>'
      +      (hasListenCard ? '<aside class="reader-aside">' + listenHTML + '</aside>' : '')
      + '      <div class="song-content' + (state.showChords ? '' : ' no-chords') + '" id="songContent" style="font-size:' + state.fontSize + 'px"></div>'
      + '      <div class="reader-end" aria-hidden="true"></div>'
      + '      </div>'
      + '    </div>'
      + '  </div>'
      + '</div>';

    document.title = song.title + ' · Repertorio';

    const contentEl = U.$('#songContent', container);
    const scrollEl = U.$('#readerScroll', container);
    const keyEl = U.$('#currentKey', container);
    const capoSelect = U.$('#capoSelect', container);
    const shapeInfoEl = U.$('#shapeInfo', container);
    const metaRowKey = U.$('.reader-head .key-badge', container);
    const scrollRow = U.$('#scrollSpeedRow', container);
    const scrollBtn = U.$('#toggleScroll', container);
    const listenPlayer = U.$('#listenPlayer', container);

    /* El reproductor se carga recién al tocar una miniatura o la tarjeta de
       Spotify. Nunca se carga solo al abrir la canción. */
    function closeListenPlayer() {
      if (!listenPlayer) return;
      listenPlayer.hidden = true;
      listenPlayer.innerHTML = '';
      const expanded = U.$('#listenCard [aria-expanded="true"]', container);
      if (expanded) expanded.setAttribute('aria-expanded', 'false');
    }

    function listenPlayerHTML(src, title, barLabel, kind, height) {
      const frameStyle = height ? ' style="height:' + height + 'px"' : '';
      const allow = kind === 'spotify'
        ? ' allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"'
        : ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen';
      return '<div class="listen-player-head"><span>' + U.esc(barLabel) + '</span>'
        + '<button type="button" class="btn ghost sm" data-close-embed>Cerrar</button></div>'
        + '<div class="listen-player-frame ' + kind + '"' + frameStyle + '>'
        + '<iframe src="' + U.esc(src) + '" title="' + U.esc(title) + '"' + allow + '></iframe>'
        + '</div>';
    }

    function toggleListenPlayer(button) {
      if (!listenPlayer) return;
      const wasOpen = button.getAttribute('aria-expanded') === 'true';
      closeListenPlayer();
      if (wasOpen) return;
      const label = String(button.dataset.listenLabel || '');

      if (button.dataset.youtubeId) {
        const videoId = String(button.dataset.youtubeId);
        if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return;
        button.setAttribute('aria-expanded', 'true');
        listenPlayer.hidden = false;
        listenPlayer.innerHTML = listenPlayerHTML(
          'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1&rel=0',
          'Video de YouTube: ' + song.title,
          'Video de YouTube' + (label && label !== 'YouTube' ? ' · ' + label : ''),
          'youtube',
          0
        );
        return;
      }

      if (button.dataset.spotifySrc) {
        const src = String(button.dataset.spotifySrc);
        if (!/^https:\/\/open\.spotify\.com\/embed\//.test(src)) return;
        const height = U.clamp(Number(button.dataset.spotifyHeight) || 152, 80, 400);
        button.setAttribute('aria-expanded', 'true');
        listenPlayer.hidden = false;
        listenPlayer.innerHTML = listenPlayerHTML(
          src,
          'Reproductor de Spotify',
          'Spotify' + (label && label !== 'Spotify' ? ' · ' + label : ''),
          'spotify',
          height
        );
      }
    }

    function paint() {
      const sounding = soundingKey();
      const shapes = shapesKey();
      const hasCapo = state.capo > 0 && !!baseKey;
      contentEl.innerHTML = renderContentHTML(song.content, {
        transpose: renderShift(),
        preferFlat: C.keyUsesFlats(shapes || sounding),
      });
      contentEl.classList.toggle('no-chords', !state.showChords);
      contentEl.style.fontSize = state.fontSize + 'px';
      if (keyEl) {
        keyEl.value = state.transpose === 0 ? '__original' : sounding;
        if (keyEl.value !== (state.transpose === 0 ? '__original' : sounding)) keyEl.value = '__original';
        keyEl.title = 'Tono actual: ' + (sounding || '—');
        keyEl.setAttribute('aria-label', 'Elegir tonalidad. Tono actual: ' + (sounding || '—'));
      }
      if (capoSelect) capoSelect.value = String(state.capo);
      if (metaRowKey) {
        if (sounding) metaRowKey.textContent = sounding;
        else metaRowKey.style.display = 'none';
      }
      shapeInfoEl.textContent = hasCapo ? 'Formas: ' + shapes : '';
      if (hasCapo) shapeInfoEl.classList.add('small');
      document.title = song.title + (sounding ? ' · ' + sounding : '') + ' · Repertorio';
    }

    paint();

    container.addEventListener('click', (event) => {
      const listenBtn = event.target.closest('[data-youtube-id], [data-spotify-src]');
      if (listenBtn) {
        toggleListenPlayer(listenBtn);
        return;
      }
      if (event.target.closest('[data-close-embed]')) {
        closeListenPlayer();
        return;
      }
      const transposeBtn = event.target.closest('[data-transpose]');
      if (transposeBtn) {
        state.transpose = U.clamp(state.transpose + Number(transposeBtn.dataset.transpose), -11, 11);
        paint();
        return;
      }
      const capoBtn = event.target.closest('[data-capo]');
      if (capoBtn) {
        state.capo = U.clamp(state.capo + Number(capoBtn.dataset.capo), 0, 11);
        paint();
        return;
      }
      const fontBtn = event.target.closest('[data-font]');
      if (fontBtn) {
        state.fontSize = U.clamp(state.fontSize + Number(fontBtn.dataset.font), 12, 34);
        paint();
        return;
      }
      if (event.target.closest('#toggleChords')) {
        state.showChords = !state.showChords;
        const btn = U.$('#toggleChords', container);
        btn.classList.toggle('on', state.showChords);
        btn.innerHTML = UI.icon(state.showChords ? 'eye' : 'eye-off')
          + '<span class="chords-label">' + (state.showChords ? 'Acordes' : 'Solo letra') + '</span>';
        paint();
        return;
      }
      if (event.target.closest('#printSong')) {
        window.print();
        return;
      }
      if (event.target.closest('#favSong')) {
        const fav = Store.toggleFavorite(song.id);
        const btn = U.$('#favSong', container);
        btn.classList.toggle('on', fav);
        btn.setAttribute('aria-pressed', fav ? 'true' : 'false');
        UI.toast(fav ? 'Guardada en favoritas' : 'Quitada de favoritas');
        return;
      }
      if (event.target.closest('#addToSetlist')) {
        addToSetlistModal(song);
        return;
      }
      if (event.target.closest('#toggleScroll')) {
        if (autoScrollFrame) {
          stopAutoScroll();
          scrollBtn.classList.remove('on');
          scrollRow.style.display = 'none';
        } else {
          scrollBtn.classList.add('on');
          scrollRow.style.display = 'flex';
          autoScrollLast = performance.now();
          const step = (now) => {
            const delta = Math.min(now - autoScrollLast, 120);
            autoScrollLast = now;
            const max = scrollEl.scrollHeight - scrollEl.clientHeight;
            if (scrollEl.scrollTop >= max - 2) {
              stopAutoScroll();
              scrollBtn.classList.remove('on');
              return;
            }
            scrollEl.scrollTop += (state.speed * delta) / 1000;
            autoScrollFrame = requestAnimationFrame(step);
          };
          autoScrollFrame = requestAnimationFrame(step);
        }
      }
    });

    if (keyEl) {
      keyEl.addEventListener('change', () => {
        const value = keyEl.value;
        state.transpose = (!value || value === '__original') ? 0 : C.semitoneDelta(baseKey, value);
        paint();
      });
    }

    if (capoSelect) {
      capoSelect.addEventListener('change', () => {
        state.capo = U.clamp(Number(capoSelect.value) || 0, 0, 11);
        paint();
      });
    }

    const speedInput = U.$('#scrollSpeed', container);
    if (speedInput) {
      speedInput.addEventListener('input', () => {
        state.speed = Number(speedInput.value) || 22;
      });
    }

    scrollEl.addEventListener('wheel', () => {
      if (autoScrollFrame) {
        stopAutoScroll();
        scrollBtn.classList.remove('on');
      }
    }, { passive: true });

    scrollEl.addEventListener('touchstart', () => {
      if (autoScrollFrame) {
        stopAutoScroll();
        scrollBtn.classList.remove('on');
      }
    }, { passive: true });

    function onKey(event) {
      if (event.defaultPrevented) return;
      const tag = (event.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || event.metaKey || event.ctrlKey) return;
      if (event.key === 'Escape' && listenPlayer && !listenPlayer.hidden) {
        event.preventDefault();
        closeListenPlayer();
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        const btn = U.$('#toggleScroll', container);
        if (btn) btn.click();
      }
    }
    document.addEventListener('keydown', onKey);
    container.__cleanup = () => {
      stopAutoScroll();
      document.removeEventListener('keydown', onKey);
    };
  }

  window.SongView = {
    renderContentHTML,
    reader,
    cleanup,
    addToSetlistModal,
  };
})();
