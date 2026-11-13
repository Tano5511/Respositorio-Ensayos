/* Arranque y enrutador de la aplicación */
(function () {
  'use strict';

  const U = window.U;
  const UI = window.UI;

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
    if (label) label.textContent = (settings.churchName || 'Mi iglesia') + (readOnly ? ' · solo lectura' : '');
    const newSong = document.querySelector('[data-action="new-song"]');
    if (newSong) newSong.style.display = readOnly ? 'none' : '';
    UI.applyTheme(settings);

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function init() {
    Store.load();
    UI.applyTheme(Store.state.settings);

    if (!window.location.hash) {
      history.replaceState(null, '', '#/repertorios');
    }

    window.addEventListener('hashchange', renderRoute);
    document.addEventListener('repertorio:refresh', renderRoute);
    renderRoute();

    document.querySelectorAll('[data-action="new-song"]').forEach((button) => {
      button.addEventListener('click', () => { window.location.hash = '#/canciones/nueva'; });
    });

    document.addEventListener('keydown', (event) => {
      const tag = (event.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || event.ctrlKey || event.metaKey || event.altKey) return;
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
