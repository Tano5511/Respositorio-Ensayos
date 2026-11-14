/* Repertorios: listado, detalle y modo ensayo */
(function () {
  'use strict';

  const U = window.U;
  const UI = window.UI;

  let rehearsalState = null;

  function canShareSetlist() {
    const auth = window.Auth;
    return !!(auth && auth.isEnabled && auth.church && auth.church.inviteCode);
  }

  function shareSetlist(setlist) {
    const auth = window.Auth;
    const church = auth && auth.isEnabled ? auth.church : null;
    if (!church || !church.inviteCode) return;
    const text = 'Repertorio «' + setlist.name + '» · ' + U.fmtDateLong(setlist.date)
      + (setlist.service ? ' · ' + setlist.service : '')
      + '\nIglesia: ' + church.name
      + '\nCódigo de invitación: ' + church.inviteCode;
    U.shareText({
      title: 'Repertorio · ' + setlist.name,
      text: text,
      url: U.appUrl(),
    }).then((result) => {
      if (result === 'shared') UI.toast('Repertorio compartido');
      else if (result === 'copied') UI.toast('Texto copiado para compartir');
      else if (result === 'failed') UI.toast('No pudimos compartir. Copiá el texto a mano.', 'error');
    });
  }

  function cleanup() {
    rehearsalState = null;
  }

  /* ---------------- Formulario de repertorio ---------------- */

  function openSetlistForm(existing, onSaved) {
    if (!Store.canEdit) {
      UI.toast(Store.readOnlyMessage, 'error');
      return null;
    }
    const data = existing || {
      name: '',
      date: U.todayISO(),
      service: 'Culto dominical',
      notes: '',
    };
    const services = Store.allServices();
    UI.modal({
      title: existing ? 'Editar repertorio' : 'Nuevo repertorio',
      subtitle: existing ? 'Actualiza los datos del servicio.' : 'Organiza las canciones de un culto o ensayo.',
      body: '<div class="stack">'
        + '<div class="field"><label for="slName">Nombre *</label><input id="slName" type="text" value="' + U.esc(data.name) + '" placeholder="Culto dominical"></div>'
        + '<div class="form-grid">'
        + '<div class="field"><label for="slDate">Fecha</label><input id="slDate" type="date" value="' + U.esc(data.date) + '"></div>'
        + '<div class="field"><label for="slService">Tipo de servicio</label><input id="slService" type="text" list="serviceOptions" value="' + U.esc(data.service) + '">'
        + '<datalist id="serviceOptions">' + services.map((service) => '<option value="' + U.esc(service) + '"></option>').join('') + '</datalist>'
        + '</div></div>'
        + '<div class="field"><label for="slNotes">Notas generales</label><textarea id="slNotes" rows="3" placeholder="Indicaciones para el equipo…">' + U.esc(data.notes) + '</textarea></div>'
        + '</div>',
      actions: [
        { label: 'Cancelar', class: 'ghost' },
        {
          label: existing ? 'Guardar cambios' : 'Crear repertorio',
          class: 'primary',
          onClick: (close, box) => {
            const nameInput = box.querySelector('#slName');
            const name = nameInput.value.trim();
            if (!name) {
              UI.toast('Escribe un nombre para el repertorio', 'error');
              nameInput.focus();
              return { keepOpen: true };
            }
            const payload = {
              name,
              date: box.querySelector('#slDate').value || U.todayISO(),
              service: box.querySelector('#slService').value.trim() || 'Culto dominical',
              notes: box.querySelector('#slNotes').value.trim(),
            };
            if (existing) payload.id = existing.id;
            const list = Store.saveSetlist(payload);
            UI.toast(existing ? 'Repertorio actualizado' : 'Repertorio creado');
            if (onSaved) onSaved(list);
          },
        },
      ],
      onMount: (box) => {
        const nameInput = box.querySelector('#slName');
        setTimeout(() => nameInput.focus(), 40);
        box.querySelectorAll('input').forEach((input) => {
          input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              const primary = box.querySelector('.modal-foot .btn.primary');
              if (primary) primary.click();
            }
          });
        });
      },
    });
  }

  /* ---------------- Listado ---------------- */

  function list(container) {
    document.title = 'Repertorios · Repertorio';
    const editable = Store.canEdit;
    const today = U.todayISO();
    const lists = Store.state.setlists.slice().sort((a, b) => {
      const aPast = (a.date || '') < today;
      const bPast = (b.date || '') < today;
      if (aPast !== bPast) return aPast ? 1 : -1;
      return aPast ? (b.date || '').localeCompare(a.date || '') : (a.date || '').localeCompare(b.date || '');
    });

    container.innerHTML = ''
      + '<header class="page-head">'
      + '  <div><div class="eyebrow">' + UI.icon('list') + ' Planificación ' + UI.readOnlyChip() + '</div>'
      + '  <h1>Repertorios</h1>'
      + '  <p class="sub">Prepara los cultos y ensayos con las canciones en orden.</p></div>'
      + (editable ? '  <div class="head-actions"><button type="button" class="btn primary" id="newSetlist">' + UI.icon('plus') + 'Nuevo repertorio</button></div>' : '')
      + '</header>'
      + (lists.length
        ? '<div class="setlist-grid">' + lists.map((setlist) => {
          const songs = Store.setlistSongs(setlist);
          const preview = songs.slice(0, 4).map((entry, index) =>
            '<div class="row" style="gap:7px"><span class="sl-num">' + (index + 1) + '</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + U.esc(entry.song.title) + '</span></div>'
          ).join('');
          const more = songs.length > 4 ? '<div class="tiny muted" style="padding-left:22px">+' + (songs.length - 4) + ' más</div>' : '';
          const date = U.parseISODate(setlist.date);
          const relative = U.relativeDate(setlist.date);
          return '<article class="setlist-card fade-in">'
            + '<div class="sl-top">'
            + '<div class="date-badge"><span class="d">' + (date ? date.getDate() : '–') + '</span><span class="m">' + U.esc(U.monthShort(setlist.date)) + '</span></div>'
            + '<div style="min-width:0;flex:1"><h3><a href="#/repertorios/' + setlist.id + '">' + U.esc(setlist.name) + '</a></h3>'
            + '<div class="tiny muted">' + U.esc(U.fmtDateLong(setlist.date)) + (relative ? ' · ' + relative : '') + '</div></div>'
            + '</div>'
            + '<div class="sl-meta">'
            + '<span class="chip blue">' + U.esc(setlist.service || 'Servicio') + '</span>'
            + '<span class="chip">' + songs.length + ' ' + U.plural(songs.length, 'canción', 'canciones') + '</span>'
            + '<span class="chip">' + U.fmtDurationLong(Store.setlistDuration(setlist)) + '</span>'
            + '</div>'
            + (songs.length ? '<div class="sl-songs">' + preview + more + '</div>' : '<div class="tiny muted">Aún sin canciones.</div>')
            + '<div class="sl-actions">'
            + '<a class="btn sm" href="#/repertorios/' + setlist.id + '">Abrir</a>'
            + (editable ? '<button type="button" class="btn sm ghost icon-only" data-duplicate="' + setlist.id + '" title="Duplicar" aria-label="Duplicar">' + UI.icon('copy') + '</button>' : '')
            + (editable ? '<button type="button" class="btn sm ghost icon-only" data-delete="' + setlist.id + '" title="Eliminar" aria-label="Eliminar">' + UI.icon('trash') + '</button>' : '')
            + '<span class="spacer"></span>'
            + '<a class="btn sm primary" href="#/repertorios/' + setlist.id + '/ensayo">' + UI.icon('play') + 'Ensayo</a>'
            + '</div>'
            + '</article>';
        }).join('') + '</div>'
        : '<div class="empty"><div class="empty-icon">' + UI.icon('calendar') + '</div>'
          + '<h3>Sin repertorios todavía</h3><p>Crea un repertorio para el próximo culto o ensayo y añade las canciones que van a tocar.</p>'
          + (editable ? '<div class="actions"><button type="button" class="btn primary" data-new>Crear el primero</button></div>' : '') + '</div>');

    const openNew = () => openSetlistForm(null, (setlist) => {
      window.location.hash = '#/repertorios/' + setlist.id;
    });
    const newButton = U.$('#newSetlist', container);
    if (newButton) newButton.addEventListener('click', openNew);
    container.querySelectorAll('[data-new]').forEach((button) => button.addEventListener('click', openNew));

    const setlistGrid = U.$('.setlist-grid', container);
    if (setlistGrid) setlistGrid.addEventListener('click', async (event) => {
      const duplicateButton = event.target.closest('[data-duplicate]');
      if (duplicateButton) {
        const copy = Store.duplicateSetlist(duplicateButton.dataset.duplicate);
        if (copy) {
          UI.toast('Repertorio duplicado');
          list(container);
        }
        return;
      }
      const deleteButton = event.target.closest('[data-delete]');
      if (deleteButton) {
        const target = Store.getSetlist(deleteButton.dataset.delete);
        if (!target) return;
        const confirmed = await UI.confirm({
          title: 'Eliminar «' + target.name + '»',
          message: 'Se eliminará el repertorio, pero las canciones seguirán en tu biblioteca.',
          confirmLabel: 'Eliminar',
          danger: true,
        });
        if (!confirmed) return;
        Store.deleteSetlist(target.id);
        UI.toast('Repertorio eliminado');
        list(container);
      }
    });
  }

  /* ---------------- Detalle ---------------- */

  function itemKey(entry) {
    return entry.item.keyOverride || entry.song.key || '';
  }

  function itemCapo(entry) {
    if (entry.item.capoOverride !== '' && entry.item.capoOverride !== undefined && entry.item.capoOverride !== null) {
      return Number(entry.item.capoOverride) || 0;
    }
    return Number(entry.song.capo) || 0;
  }

  function openItemEditor(setlist, entry, onChange) {
    if (!Store.canEdit) {
      UI.toast(Store.readOnlyMessage, 'error');
      return null;
    }
    const song = entry.song;
    const keys = ['', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
      'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];
    UI.modal({
      title: 'Ajustes de la canción',
      subtitle: song.title + ' · ' + (song.author || 'Autor desconocido'),
      body: '<div class="stack">'
        + '<div class="form-grid">'
        + '<div class="field"><label for="itemKey">Tonalidad en este repertorio</label><select id="itemKey">'
        + keys.map((key) => '<option value="' + key + '"' + ((entry.item.keyOverride || '') === key ? ' selected' : '') + '>'
          + (key ? key : 'Usar la original (' + (song.key || 'sin definir') + ')') + '</option>').join('')
        + '</select></div>'
        + '<div class="field"><label for="itemCapo">Capo</label><input id="itemCapo" type="number" min="0" max="11" value="' + itemCapo(entry) + '"></div>'
        + '</div>'
        + '<div class="field"><label for="itemNotes">Nota para esta canción</label><textarea id="itemNotes" rows="3" placeholder="Ej.: entrar directo al coro, terminar suave…">' + U.esc(entry.item.notes || '') + '</textarea></div>'
        + '<label class="ready-toggle"><input type="checkbox" id="itemDone"' + (entry.item.done ? ' checked' : '') + '> Lista para el ensayo</label>'
        + '<p class="tiny muted">Si no tocas la tonalidad original, puedes elegir otra aquí sin cambiar la canción.</p>'
        + '</div>',
      actions: [
        { label: 'Cancelar', class: 'ghost' },
        {
          label: 'Guardar',
          class: 'primary',
          onClick: (close, box) => {
            Store.updateSetlistItem(setlist.id, entry.item.id, {
              keyOverride: box.querySelector('#itemKey').value,
              capoOverride: String(U.clamp(Number(box.querySelector('#itemCapo').value) || 0, 0, 11)),
              notes: box.querySelector('#itemNotes').value.trim(),
              done: box.querySelector('#itemDone').checked,
            });
            UI.toast('Ajustes guardados');
            if (onChange) onChange();
          },
        },
      ],
    });
  }

  function openSongPicker(setlist, onChange) {
    if (!Store.canEdit) {
      UI.toast(Store.readOnlyMessage, 'error');
      return null;
    }
    const data = { query: '' };
    const dialog = UI.modal({
      title: 'Añadir canciones',
      subtitle: 'Busca en tu biblioteca y toca una canción para agregarla al final.',
      wide: true,
      body: '<div class="search-box">' + UI.icon('search') + '<input type="search" id="pickerSearch" placeholder="Buscar canción, autor o etiqueta…" aria-label="Buscar canción"></div>'
        + '<div class="add-song-results" id="pickerResults"></div>',
      actions: [{ label: 'Listo', class: 'primary' }],
      onMount: (box, close) => {
        const search = box.querySelector('#pickerSearch');
        const results = box.querySelector('#pickerResults');

        function paint() {
          const query = U.normalize(search.value.trim());
          const songs = Store.state.songs.slice().sort((a, b) => a.title.localeCompare(b.title, 'es')).filter((song) => {
            if (!query) return true;
            const haystack = U.normalize([song.title, song.author, (song.tags || []).join(' '), song.category].join(' '));
            return query.split(/\s+/).every((word) => haystack.indexOf(word) !== -1);
          });
          if (!songs.length) {
            results.innerHTML = '<p class="muted small" style="padding:16px;text-align:center">No encontramos canciones.</p>';
            return;
          }
          results.innerHTML = songs.map((song) =>
            '<button type="button" class="add-song-row" data-song-id="' + song.id + '">'
            + '<span class="main"><strong>' + U.esc(song.title) + '</strong>'
            + '<small>' + U.esc(song.author || 'Autor desconocido') + (song.key ? ' · ' + song.key : '') + (song.duration ? ' · ' + U.fmtDuration(song.duration) : '') + '</small></span>'
            + UI.icon('plus') + '</button>'
          ).join('');
        }

        search.addEventListener('input', U.debounce(paint, 120));
        results.addEventListener('click', (event) => {
          const row = event.target.closest('[data-song-id]');
          if (!row) return;
          const song = Store.getSong(row.dataset.songId);
          if (!song) return;
          Store.addSongToSetlist(setlist.id, song.id);
          UI.toast('«' + song.title + '» añadida');
          if (onChange) onChange();
        });
        paint();
        setTimeout(() => search.focus(), 50);
      },
    });
    return dialog;
  }

  function detail(container, setlistId) {
    const setlist = Store.getSetlist(setlistId);
    if (!setlist) {
      container.innerHTML = '<div class="empty"><div class="empty-icon">' + UI.icon('list') + '</div><h3>Repertorio no encontrado</h3>'
        + '<div class="actions"><a class="btn primary" href="#/repertorios">Ver repertorios</a></div></div>';
      return;
    }

    const entries = Store.setlistSongs(setlist);
    const done = entries.filter((entry) => entry.item.done).length;
    const totalDuration = Store.setlistDuration(setlist);
    const editable = Store.canEdit;
    document.title = setlist.name + ' · Repertorio';

    const itemsHTML = entries.map((entry, index) => {
      const song = entry.song;
      const key = itemKey(entry);
      const capo = itemCapo(entry);
      const readerParams = new URLSearchParams();
      if (key) readerParams.set('tono', key);
      readerParams.set('capo', String(capo));
      readerParams.set('volver', setlist.id);
      const readerHref = '#/canciones/' + song.id + '?' + readerParams.toString();
      return '<div class="sl-song' + (entry.item.done ? ' done' : '') + '" data-item="' + entry.item.id + '">'
        + (editable ? '<div class="handle">'
          + '<button type="button" data-move="up" title="Subir" aria-label="Subir">' + UI.icon('chevron-up') + '</button>'
          + '<button type="button" data-move="down" title="Bajar" aria-label="Bajar">' + UI.icon('chevron-down') + '</button>'
          + '</div>' : '')
        + '<span class="num">' + (index + 1) + '</span>'
        + '<div class="main">'
        + '<div class="t"><a href="' + readerHref + '">' + U.esc(song.title) + '</a>'
        + (key ? UI.keyBadge(key) : '')
        + (capo ? '<span class="chip">Capo ' + capo + '</span>' : '')
        + (entry.item.keyOverride ? '<span class="chip accent">cambio de tono</span>' : '')
        + '</div>'
        + '<div class="sub">' + U.esc(song.author || 'Autor desconocido')
        + (song.bpm ? ' · ' + song.bpm + ' BPM' : '')
        + (song.duration ? ' · ' + U.fmtDuration(song.duration) : '')
        + (song.category ? ' · ' + U.esc(song.category) : '') + '</div>'
        + (entry.item.notes ? '<div class="tiny text-accent" style="margin-top:2px">' + U.esc(entry.item.notes) + '</div>' : '')
        + '</div>'
        + '<div class="item-actions">'
        + '<label class="ready-toggle" title="Lista para el ensayo" style="margin-right:2px"><input type="checkbox" data-done="' + entry.item.id + '"' + (entry.item.done ? ' checked' : '') + (editable ? '' : ' disabled') + '><span class="sr-only">Lista</span></label>'
        + (editable ? '<button type="button" class="btn ghost" data-edit-item="' + entry.item.id + '" title="Ajustes" aria-label="Ajustes">' + UI.icon('settings') + '</button>' : '')
        + (editable ? '<button type="button" class="btn ghost" data-remove-item="' + entry.item.id + '" title="Quitar" aria-label="Quitar">' + UI.icon('trash') + '</button>' : '')
        + '</div>'
        + '</div>';
    }).join('');

    container.innerHTML = ''
      + '<a class="back-link" href="#/repertorios">' + UI.icon('arrow-left') + 'Repertorios</a>'
      + '<header class="page-head">'
      + '  <div><div class="eyebrow">' + UI.icon('calendar') + U.esc(setlist.service || 'Servicio') + ' ' + UI.readOnlyChip() + '</div>'
      + '  <h1>' + U.esc(setlist.name) + '</h1>'
      + '  <p class="sub">' + U.esc(U.fmtDateLong(setlist.date)) + ' · ' + entries.length + ' ' + U.plural(entries.length, 'canción', 'canciones') + ' · ' + U.fmtDurationLong(totalDuration) + '</p></div>'
      + '  <div class="head-actions">'
      + '    <button type="button" class="btn primary" id="startRehearsal"' + (entries.length ? '' : ' disabled') + '>' + UI.icon('play') + 'Iniciar ensayo</button>'
      + '    <button type="button" class="btn" data-print>' + UI.icon('printer') + 'Imprimir</button>'
      + (canShareSetlist() ? '    <button type="button" class="btn" data-share-list>' + UI.icon('share') + 'Compartir repertorio</button>' : '')
      + (editable ? '    <button type="button" class="btn" id="editSetlist">' + UI.icon('edit') + 'Editar</button>' : '')
      + (editable ? '    <button type="button" class="btn ghost icon-only" data-duplicate title="Duplicar" aria-label="Duplicar">' + UI.icon('copy') + '</button>' : '')
      + (editable ? '    <button type="button" class="btn ghost icon-only" data-delete-list title="Eliminar" aria-label="Eliminar">' + UI.icon('trash') + '</button>' : '')
      + '  </div>'
      + '</header>'
      + (setlist.notes ? '<div class="card panel mb-2"><div class="row" style="gap:10px;align-items:flex-start">' + UI.icon('edit') + '<div><div class="tiny muted" style="text-transform:uppercase;letter-spacing:.08em;font-weight:700">Notas del servicio</div><p class="small">' + U.esc(setlist.notes) + '</p></div></div></div>' : '')
      + '<div class="sl-summary mb-2">'
      + '  <div class="stat"><span class="v">' + entries.length + '</span><span class="k">Canciones</span></div>'
      + '  <div class="stat"><span class="v">' + U.fmtDuration(totalDuration) + '</span><span class="k">Duración aprox.</span></div>'
      + '  <div class="stat"><span class="v" id="doneCount">' + done + ' / ' + entries.length + '</span><span class="k">Listas</span></div>'
      + '  <span class="spacer"></span>'
      + (editable ? '  <button type="button" class="btn" id="addSong">' + UI.icon('plus') + 'Añadir canción</button>' : '')
      + '</div>'
      + (entries.length
        ? '<div class="sl-song-list" id="slItems">' + itemsHTML + '</div>'
        : '<div class="empty"><div class="empty-icon">' + UI.icon('music') + '</div><h3>Este repertorio está vacío</h3><p>Añade canciones de tu biblioteca y ordénalas como las van a tocar.</p>'
          + (editable ? '<div class="actions"><button type="button" class="btn primary" data-add-first>' + UI.icon('plus') + 'Añadir canción</button></div>' : '') + '</div>');

    const refresh = () => detail(container, setlistId);
    const onChange = () => refresh();

    const addSongButton = U.$('#addSong', container);
    if (addSongButton) addSongButton.addEventListener('click', () => openSongPicker(setlist, onChange));
    const addFirst = container.querySelector('[data-add-first]');
    if (addFirst) addFirst.addEventListener('click', () => openSongPicker(setlist, onChange));

    U.$('#startRehearsal', container).addEventListener('click', () => {
      if (!entries.length) return;
      window.location.hash = '#/repertorios/' + setlist.id + '/ensayo';
    });

    const editButton = U.$('#editSetlist', container);
    if (editButton) editButton.addEventListener('click', () => openSetlistForm(setlist, refresh));

    container.querySelector('[data-print]').addEventListener('click', () => window.print());

    const shareListButton = container.querySelector('[data-share-list]');
    if (shareListButton) shareListButton.addEventListener('click', () => shareSetlist(setlist));

    const duplicateButton = container.querySelector('[data-duplicate]');
    if (duplicateButton) duplicateButton.addEventListener('click', () => {
      const copy = Store.duplicateSetlist(setlist.id);
      if (copy) {
        UI.toast('Repertorio duplicado');
        window.location.hash = '#/repertorios/' + copy.id;
      }
    });

    const deleteListButton = container.querySelector('[data-delete-list]');
    if (deleteListButton) deleteListButton.addEventListener('click', async () => {
      const confirmed = await UI.confirm({
        title: 'Eliminar «' + setlist.name + '»',
        message: 'Las canciones seguirán en tu biblioteca.',
        confirmLabel: 'Eliminar',
        danger: true,
      });
      if (!confirmed) return;
      Store.deleteSetlist(setlist.id);
      UI.toast('Repertorio eliminado');
      window.location.hash = '#/repertorios';
    });

    const itemsEl = U.$('#slItems', container);
    if (itemsEl) {
      itemsEl.addEventListener('click', (event) => {
        const moveButton = event.target.closest('[data-move]');
        if (moveButton) {
          const itemEl = moveButton.closest('[data-item]');
          Store.moveSetlistItem(setlist.id, itemEl.dataset.item, moveButton.dataset.move === 'up' ? -1 : 1);
          refresh();
          return;
        }
        const editButton = event.target.closest('[data-edit-item]');
        if (editButton) {
          const entry = entries.find((candidate) => candidate.item.id === editButton.dataset.editItem);
          if (entry) openItemEditor(setlist, entry, refresh);
          return;
        }
        const removeButton = event.target.closest('[data-remove-item]');
        if (removeButton) {
          Store.removeSetlistItem(setlist.id, removeButton.dataset.removeItem);
          UI.toast('Canción quitada del repertorio');
          refresh();
        }
      });

      itemsEl.addEventListener('change', (event) => {
        const checkbox = event.target.closest('[data-done]');
        if (!checkbox) return;
        Store.updateSetlistItem(setlist.id, checkbox.dataset.done, { done: checkbox.checked });
        const itemEl = checkbox.closest('[data-item]');
        if (itemEl) itemEl.classList.toggle('done', checkbox.checked);
        const remaining = Store.getSetlist(setlist.id);
        const count = remaining.items.filter((item) => item.done).length;
        const counter = U.$('#doneCount', container);
        if (counter) counter.textContent = count + ' / ' + remaining.items.length;
      });
    }
  }

  /* ---------------- Modo ensayo ---------------- */

  function rehearsalPanelHTML(entry, index, total, opts) {
    const song = entry.song;
    const baseKey = opts.key;
    const shift = opts.transpose - opts.capo;
    const soundingKey = baseKey ? window.Chords.targetKey(baseKey, opts.transpose) : '';
    const shapesPreview = baseKey ? window.Chords.targetKey(baseKey, shift) : '';
    const preferFlat = window.Chords.keyUsesFlats(shapesPreview) || window.Chords.keyUsesFlats(soundingKey);
    const shapesKey = baseKey ? window.Chords.transposeKey(baseKey, shift, preferFlat) : '';
    const content = SongView.renderContentHTML(song.content, {
      transpose: shift,
      preferFlat: preferFlat,
    });
    return '<div class="rehearsal-card">'
      + '<div class="row wrap" style="justify-content:space-between;gap:10px">'
      + '<div><div class="tiny muted">Canción ' + (index + 1) + ' de ' + total + '</div>'
      + '<h2 style="margin-top:2px">' + U.esc(song.title) + '</h2>'
      + '<div class="row wrap" style="gap:6px;margin-top:7px">'
      + (soundingKey ? UI.keyBadge(soundingKey, 'Tono') : '')
      + (opts.capo ? '<span class="chip accent">Capo ' + opts.capo + '</span>' : '')
      + (opts.capo && shapesKey ? '<span class="chip">Formas: ' + U.esc(shapesKey) + '</span>' : '')
      + (opts.editable ? '' : UI.readOnlyChip())
      + (song.bpm ? '<span class="chip">' + song.bpm + ' BPM</span>' : '')
      + (song.duration ? '<span class="chip">' + U.fmtDuration(song.duration) + '</span>' : '')
      + (song.category ? '<span class="chip blue">' + U.esc(song.category) + '</span>' : '')
      + '</div></div>'
      + '<div class="row" style="gap:6px">'
      + '<div class="transpose-box" title="Transponer">'
      + '<button type="button" data-transpose="' + (index + ':-1') + '" aria-label="Bajar medio tono">−</button>'
      + '<span class="value">' + U.esc(soundingKey || '—') + '</span>'
      + '<button type="button" data-transpose="' + (index + ':1') + '" aria-label="Subir medio tono">+</button>'
      + '</div>'
      + (opts.editable
        ? '<div class="transpose-box" title="Capo">'
          + '<button type="button" data-capo="' + (index + ':-1') + '" aria-label="Quitar capo">−</button>'
          + '<span class="value" style="min-width:50px">Capo ' + opts.capo + '</span>'
          + '<button type="button" data-capo="' + (index + ':1') + '" aria-label="Subir capo">+</button>'
          + '</div>'
        : '')
      + '</div>'
      + '</div>'
      + (entry.item.keyOverride || entry.item.notes
        ? '<div class="mt-1" style="display:grid;gap:4px">'
          + (entry.item.keyOverride
            ? '<div class="tiny text-accent">Tono del servicio: ' + U.esc(entry.item.keyOverride)
              + (entry.item.keyOverride !== soundingKey ? ' · ahora: ' + U.esc(soundingKey || '—') : '') + '</div>'
            : '')
          + (entry.item.notes ? '<div class="tiny text-accent">Nota: ' + U.esc(entry.item.notes) + '</div>' : '')
          + '</div>'
        : '')
      + (song.notes ? '<p class="tiny muted" style="margin-top:10px">' + U.esc(song.notes) + '</p>' : '')
      + '<div class="song-content" style="margin-top:18px">' + content + '</div>'
      + '<div class="rehearsal-actions">'
      + '<label class="ready-toggle"><input type="checkbox" data-ready="' + entry.item.id + '"' + (entry.item.done ? ' checked' : '') + (opts.editable ? '' : ' disabled') + '> Lista</label>'
      + '<span class="spacer"></span>'
      + '<button type="button" class="btn ghost" data-prev' + (index === 0 ? ' disabled' : '') + '>' + UI.icon('chevron-left') + 'Anterior</button>'
      + '<button type="button" class="btn primary" data-next' + (index === total - 1 ? ' disabled' : '') + '>Siguiente' + UI.icon('chevron-right') + '</button>'
      + '</div>'
      + '<div class="rehearsal-notes field"><label for="rehearsalNote">Nota del ensayo</label>'
      + '<textarea id="rehearsalNote" rows="2" placeholder="Qué hay que corregir o recordar…"' + (opts.editable ? '' : ' readonly') + '>' + U.esc(entry.item.notes || '') + '</textarea></div>'
      + '</div>';
  }

  function rehearsal(container, setlistId) {
    const setlist = Store.getSetlist(setlistId);
    if (!setlist) {
      container.innerHTML = '<div class="empty"><h3>Repertorio no encontrado</h3><div class="actions"><a class="btn" href="#/repertorios">Volver</a></div></div>';
      return;
    }
    const entries = Store.setlistSongs(setlist);
    if (!entries.length) {
      container.innerHTML = '<div class="empty"><div class="empty-icon">' + UI.icon('play') + '</div><h3>No hay canciones para ensayar</h3>'
        + '<p>Añade canciones al repertorio primero.</p><div class="actions"><a class="btn primary" href="#/repertorios/' + setlist.id + '">Añadir canciones</a></div></div>';
      return;
    }

    const previous = rehearsalState && rehearsalState.setlistId === setlist.id ? rehearsalState : null;
    const editable = Store.canEdit;
    const state = {
      setlistId: setlist.id,
      index: previous ? U.clamp(previous.index, 0, entries.length - 1) : 0,
      offsets: previous ? previous.offsets : {},
    };
    rehearsalState = state;
    document.title = 'Ensayo · ' + setlist.name;

    const initialOffset = (index) => {
      const entry = entries[index];
      const target = entry.item.keyOverride;
      return target && entry.song.key ? window.Chords.semitoneDelta(entry.song.key, target) : 0;
    };
    const currentOffset = (index) => (state.offsets[index] === undefined ? initialOffset(index) : state.offsets[index]);
    const currentCapo = (index) => itemCapo(entries[index]);

    container.innerHTML = ''
      + '<div class="rehearsal">'
      + '<div class="rehearsal-top"><div class="inner">'
      + '<a class="reader-toolbar-btn" href="#/repertorios/' + setlist.id + '" title="Salir del ensayo">' + UI.icon('x') + '</a>'
      + '<div style="min-width:0;display:grid;line-height:1.25"><strong style="font-size:.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + U.esc(setlist.name) + '</strong>'
      + '<small class="muted tiny">Ensayo · ' + U.esc(U.fmtDate(setlist.date)) + '</small></div>'
      + '<div class="progress-track" title="Progreso del ensayo"><span id="rehearsalProgress" style="width:0%"></span></div>'
      + '<span class="tiny muted nowrap" id="rehearsalCount"></span>'
      + '</div></div>'
      + '<div class="rehearsal-body">'
      + '<aside class="rehearsal-side"><div class="card panel" style="padding:10px"><div class="rehearsal-nav" id="rehearsalNav">'
      + entries.map((entry, index) => '<button type="button" data-jump="' + index + '" class="' + (entry.item.done ? 'done' : '') + '">'
        + '<span class="num">' + (index + 1) + '</span><span class="n-title">' + U.esc(entry.song.title) + '</span>'
        + (itemCapo(entry) ? '<span class="tiny" style="color:var(--muted)">C' + itemCapo(entry) + '</span>' : '')
        + '</button>').join('')
      + '</div></div>'
      + '<div class="card panel" style="padding:12px;display:grid;gap:8px">'
      + '<div class="row" style="justify-content:space-between"><span class="tiny muted">Progreso</span><span class="tiny" id="progressLabel"></span></div>'
      + '<div class="progress-track" style="height:7px"><span id="progressBar2" style="width:0%"></span></div>'
      + '<p class="tiny muted">Marca «Lista» cuando la canción esté preparada. Las notas se guardan automáticamente.</p>'
      + '</div></aside>'
      + '<div class="rehearsal-main" id="rehearsalMain"></div>'
      + '</div></div>';

    const main = U.$('#rehearsalMain', container);
    const nav = U.$('#rehearsalNav', container);
    const progressBar = U.$('#rehearsalProgress', container);
    const progressBar2 = U.$('#progressBar2', container);
    const progressLabel = U.$('#progressLabel', container);
    const countLabel = U.$('#rehearsalCount', container);

    function updateProgress() {
      const latest = Store.getSetlist(setlist.id);
      const all = latest ? latest.items : [];
      const done = all.filter((item) => item.done).length;
      const pct = all.length ? Math.round((done / all.length) * 100) : 0;
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressBar2) progressBar2.style.width = pct + '%';
      if (progressLabel) progressLabel.textContent = done + ' de ' + all.length;
      if (countLabel) countLabel.textContent = done + ' / ' + all.length + ' listas';
      if (nav) {
        entries.forEach((entry, index) => {
          const item = all.find((candidate) => candidate.id === entry.item.id);
          const button = nav.querySelector('[data-jump="' + index + '"]');
          if (button) button.classList.toggle('done', !!(item && item.done));
        });
      }
    }

    function paintSong() {
      const entry = entries[state.index];
      const key = entry.song.key || '';
      const offset = currentOffset(state.index);
      const capo = currentCapo(state.index);
      main.innerHTML = rehearsalPanelHTML(entry, state.index, entries.length, {
        key,
        transpose: offset,
        capo,
        editable,
      });
      const note = U.$('#rehearsalNote', main);
      if (note && editable) {
        note.addEventListener('input', U.debounce(() => {
          Store.updateSetlistItem(setlist.id, entry.item.id, { notes: note.value.trim() });
        }, 400));
        note.addEventListener('blur', () => {
          Store.updateSetlistItem(setlist.id, entry.item.id, { notes: note.value.trim() });
        });
      }
      nav.querySelectorAll('[data-jump]').forEach((button) => {
        button.classList.toggle('active', Number(button.dataset.jump) === state.index);
      });
      updateProgress();
      const scrollBox = container.closest('.main');
      if (scrollBox) window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function goTo(index) {
      state.index = U.clamp(index, 0, entries.length - 1);
      paintSong();
    }

    container.addEventListener('click', (event) => {
      const jump = event.target.closest('[data-jump]');
      if (jump) {
        goTo(Number(jump.dataset.jump));
        return;
      }
      if (event.target.closest('[data-prev]')) {
        goTo(state.index - 1);
        return;
      }
      if (event.target.closest('[data-next]')) {
        goTo(state.index + 1);
        return;
      }
      const transposeButton = event.target.closest('[data-transpose]');
      if (transposeButton) {
        const [index, delta] = transposeButton.dataset.transpose.split(':');
        state.offsets[Number(index)] = U.clamp(currentOffset(Number(index)) + Number(delta), -11, 11);
        paintSong();
        return;
      }
      const capoButton = event.target.closest('[data-capo]');
      if (capoButton) {
        const [index, delta] = capoButton.dataset.capo.split(':');
        const entry = entries[Number(index)];
        const base = currentCapo(Number(index));
        const next = U.clamp(base + Number(delta), 0, 11);
        Store.updateSetlistItem(setlist.id, entry.item.id, { capoOverride: String(next) });
        paintSong();
      }
    });

    container.addEventListener('change', (event) => {
      const ready = event.target.closest('[data-ready]');
      if (!ready) return;
      Store.updateSetlistItem(setlist.id, ready.dataset.ready, { done: ready.checked });
      updateProgress();
    });

    paintSong();
  }

  window.SetlistsView = { list, detail, rehearsal, cleanup };
})();
