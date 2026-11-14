/* Arranque y enrutador de la aplicación */
(function () {
  'use strict';

  const U = window.U;
  const UI = window.UI;

  let started = false;

  function parseRoute() {
    const raw = (window.location.hash || '').replace(/^#/, '');
    const path = raw.split('?')[0] || '/repertorios';
    return path.split('/').filter(Boolean);
  }

  function notFound(container) {
    container.innerHTML = '<div class="empty" style="margin-top:40px"><div class="empty-icon">' + UI.icon('search') + '</div>'
      + '<h3>Página no encontrada</h3><p>La dirección no existe o el contenido fue eliminado.</p>'
      + '<div class="actions"><a class="btn primary" href="#/repertorios">Ir al inicio</a></div></div>';
  }

  function churchLabelText(settings) {
    const authChurch = window.Auth && window.Auth.isEnabled ? window.Auth.church : null;
    const name = authChurch ? authChurch.name : (settings.churchName || 'Mi iglesia');
    const readOnly = !Store.canEdit;
    const role = authChurch ? window.Auth.role : '';
    const roleChip = role && role !== 'admin' ? ' · ' + U.roleLabel(role).toLowerCase() : '';
    return name + (readOnly ? ' · solo lectura' : '') + roleChip;
  }

  function renderRoute() {
    const oldView = document.getElementById('view');
    if (oldView && typeof oldView.__cleanup === 'function') {
      try { oldView.__cleanup(); } catch (error) { console.error(error); }
    }
    window.SongView.cleanup();
    window.SetlistsView.cleanup();

    const view = document.createElement('div');
    view.id = 'view';
    view.className = 'view';
    view.tabIndex = -1;
    if (oldView) oldView.replaceWith(view);
    else document.querySelector('.main').appendChild(view);

    const parts = parseRoute();
    const section = parts[0] || 'repertorios';

    try {
      if (section === 'repertorios') {
        if (!parts[1]) window.SetlistsView.list(view);
        else if (parts[2] === 'ensayo') window.SetlistsView.rehearsal(view, parts[1]);
        else window.SetlistsView.detail(view, parts[1]);
      } else if (section === 'canciones') {
        if (!parts[1]) window.SongsView.list(view);
        else if (parts[1] === 'nueva') window.SongsView.editor(view, null);
        else if (parts[2] === 'editar') window.SongsView.editor(view, parts[1]);
        else window.SongView.reader(view, parts[1]);
      } else if (section === 'buscar') {
        window.SearchView.render(view);
      } else if (section === 'ajustes') {
        window.SettingsView.render(view);
      } else if (section === 'iglesia') {
        window.ChurchView.render(view);
      } else if (section === 'miembros') {
        window.MembersView.render(view);
      } else {
        notFound(view);
      }
    } catch (error) {
      console.error(error);
      view.innerHTML = '<div class="empty"><div class="empty-icon">' + UI.icon('x') + '</div>'
        + '<h3>Algo salió mal</h3><p>Recarga la página para continuar. Si el problema sigue, revisa la consola.</p>'
        + '<div class="actions"><button class="btn" onclick="location.reload()">Recargar</button></div></div>';
    }

    UI.renderNav();
    const settings = Store.state.settings;
    const readOnly = !Store.canEdit;
    const label = document.getElementById('churchLabel');
    if (label) label.textContent = churchLabelText(settings);
    const newSong = document.querySelector('[data-action="new-song"]');
    if (newSong) newSong.style.display = readOnly ? 'none' : '';
    const storageNote = document.getElementById('storageNote');
    if (storageNote) {
      if (window.Auth && window.Auth.isEnabled) {
        storageNote.textContent = Store.offline
          ? 'Sin conexión · mostrando datos guardados.'
          : 'Tus datos se sincronizan con tu iglesia.';
      } else {
        storageNote.textContent = 'Tus datos se guardan en este dispositivo.';
      }
    }
    UI.applyTheme(settings);

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function start() {
    if (started) {
      renderRoute();
      return;
    }
    started = true;

    const hash = window.location.hash || '';
    if (!hash || /^#(access_token|error|error_description|type)=/.test(hash)) {
      history.replaceState(null, '', '#/repertorios');
    }

    window.addEventListener('hashchange', renderRoute);
    document.addEventListener('repertorio:refresh', renderRoute);
    renderRoute();
  }

  function bindChrome() {
    document.querySelectorAll('[data-action="new-song"]').forEach((button) => {
      button.addEventListener('click', () => { window.location.hash = '#/canciones/nueva'; });
    });

    document.addEventListener('keydown', (event) => {
      const tag = (event.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (document.body.classList.contains('auth-locked')) return;
      if (event.key === '/') {
        event.preventDefault();
        if ((window.location.hash || '').startsWith('#/buscar')) {
          const input = document.querySelector('#q');
          if (input) input.focus();
        } else {
          window.location.hash = '#/buscar';
          setTimeout(() => {
            const input = document.querySelector('#q');
            if (input) input.focus();
          }, 80);
        }
      }
    });

    if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol) && !/[?&]nosw=1/.test(window.location.search)) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      });
    }
  }

  let syncPromise = null;

  function syncCloud() {
    if (!window.Auth || !window.Auth.isEnabled || !window.Auth.user || !window.Auth.church) {
      return Promise.resolve();
    }
    if (syncPromise) return syncPromise;
    syncPromise = Store.loadCloud().then(() => {
      maybeOfferImport();
    }).then(() => {
      syncPromise = null;
    }, (error) => {
      syncPromise = null;
      console.error(error);
    });
    return syncPromise;
  }

  function maybeOfferImport() {
    const snapshot = Store.pendingImport();
    if (!snapshot) return;
    const songCount = snapshot.songs.length;
    const listCount = snapshot.setlists.length;
    UI.modal({
      title: 'Traer tus canciones guardadas',
      subtitle: 'Encontramos datos en este dispositivo',
      body: '<p class="small" style="color:var(--text-soft)">Antes de conectarte, esta app guardaba el repertorio en este navegador. '
        + '¿Querés copiarlo a <strong>' + U.esc(window.Auth.church.name) + '</strong>?</p>'
        + '<div class="read-only-note">' + UI.icon('upload') + '<div><strong>' + songCount + ' '
        + U.plural(songCount, 'canción', 'canciones') + ' · ' + listCount + ' '
        + U.plural(listCount, 'repertorio', 'repertorios') + '</strong>'
        + '<p class="tiny muted">Se agregan a la iglesia sin borrar nada de este dispositivo. Después vas a poder abrir el repertorio desde otros equipos.</p></div></div>',
      actions: [
        { label: 'Ahora no', class: 'ghost', onClick: () => Store.skipImport() },
        {
          label: 'Importar',
          class: 'primary',
          onClick: () => {
            UI.toast('Importando tus canciones…');
            Store.importLocal().then((result) => {
              if (result && result.songs) {
                UI.toast(result.songs + ' canciones y ' + result.setlists + ' repertorios importados');
                document.dispatchEvent(new CustomEvent('repertorio:refresh'));
              } else if (result && result.error) {
                UI.toast('No se pudo importar: ' + result.error, 'error');
              }
            });
          },
        },
      ],
    });
  }

  async function init() {
    Store.load();
    UI.applyTheme(Store.state.settings);
    bindChrome();

    if (!window.Auth) {
      start();
      return;
    }

    window.Auth.onChange((event) => {
      if (event === 'ready') {
        syncCloud().then(() => start());
      } else if (event === 'signed-out') {
        Store.clearSession();
      }
    });

    await window.Auth.init();

    const auth = window.Auth;
    const canStart = !auth.blocked && (!auth.isEnabled || (auth.user && auth.church));
    if (canStart) {
      await syncCloud();
      start();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
