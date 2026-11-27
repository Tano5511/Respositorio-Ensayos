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

  function openChurchSelector() {
    const Auth = window.Auth;
    if (!Auth || !Auth.isEnabled) return;
    const memberships = Auth.memberships;
    const activeId = Auth.church ? Auth.church.id : '';
    const listHTML = memberships.length
      ? '<div class="label" style="margin-bottom:6px">Tus iglesias</div>'
        + '<div class="auth-choices">' + memberships.map((item) =>
          '<button type="button" class="auth-choice" data-switch-church="' + U.esc(item.church.id) + '">'
          + '<span>' + U.esc(item.church.name) + '</span>'
          + '<span class="row wrap" style="gap:6px">'
          + (item.church.id === activeId ? '<span class="chip accent">Activa</span>' : '')
          + '<span class="chip">' + U.esc(U.roleLabel(item.role)) + '</span>'
          + '</span></button>').join('') + '</div>'
      : '<p class="small muted">Todavía no pertenecés a ninguna iglesia.</p>';
    const addHTML = '<div class="label" style="margin:16px 0 6px">Agregar una iglesia</div>'
      + '<div class="row wrap" style="gap:8px">'
      + '<button type="button" class="btn primary" data-add-church="create">Crear iglesia</button>'
      + '<button type="button" class="btn" data-add-church="join">Unirme a otra iglesia</button>'
      + '</div>';
    UI.modal({
      title: 'Iglesias',
      subtitle: memberships.length
        ? 'Elegí con cuál querés trabajar o sumá otra.'
        : 'Creá tu iglesia o unite con un código de invitación.',
      body: listHTML + addHTML,
      actions: [{ label: 'Cancelar', class: 'ghost' }],
      onMount: (box) => {
        box.querySelectorAll('[data-switch-church]').forEach((button) => {
          button.addEventListener('click', () => {
            const target = button.dataset.switchChurch;
            if (target === activeId) {
              UI.closeModal();
              return;
            }
            UI.closeModal();
            Auth.selectChurch(target);
            UI.toast('Iglesia cambiada');
          });
        });
        box.querySelectorAll('[data-add-church]').forEach((button) => {
          button.addEventListener('click', () => {
            UI.closeModal();
            Auth.addChurch();
          });
        });
      },
    });
  }

  function updateChurchSwitcher(settings) {
    const buttons = ['churchSwitcher', 'churchSwitcherMobile']
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!buttons.length) return;
    const Auth = window.Auth;
    const hidden = !Auth || !Auth.isEnabled;
    const current = Auth && Auth.church ? Auth.church.name : (settings.churchName || 'Elegí tu iglesia');
    const role = Auth && Auth.role ? ' · ' + U.roleLabel(Auth.role) : '';
    buttons.forEach((button) => {
      button.hidden = hidden;
      if (hidden) {
        button.textContent = '';
        button.setAttribute('aria-label', '');
        return;
      }
      button.textContent = current + role + ' ▾';
      button.setAttribute('aria-label', 'Iglesias. Actual: ' + current + role);
      if (!button.dataset.churchSwitcherBound) {
        button.dataset.churchSwitcherBound = '1';
        button.addEventListener('click', openChurchSelector);
      }
    });
  }

  function openServiceSelector() {
    const Services = window.Services;
    if (!Services || !Services.available || !Services.list.length) return;
    const activeId = Services.activeId;
    const church = window.Auth && window.Auth.church ? window.Auth.church.name : 'tu iglesia';
    const allHTML = Services.canViewAll
      ? '<button type="button" class="auth-choice" data-switch-service="">'
        + '<span>Todos los servicios</span>'
        + (activeId === '' ? '<span class="chip accent">Activa</span>' : '')
        + '</button>'
      : '';
    const listHTML = Services.list.map((service) => {
      const fallbackRole = window.Auth ? (window.Auth.role || 'musico') : 'musico';
      return '<button type="button" class="auth-choice" data-switch-service="' + U.esc(service.id) + '">'
        + '<span>' + U.esc(service.name) + '</span>'
        + '<span class="row wrap" style="gap:6px">'
        + (service.id === activeId ? '<span class="chip accent">Activa</span>' : '')
        + '<span class="chip">' + U.esc(U.roleLabel(service.myRole || fallbackRole)) + '</span>'
        + '</span></button>';
    }).join('');
    UI.modal({
      title: 'Servicios',
      subtitle: 'Cada panel tiene sus propios repertorios y permisos.',
      body: '<div class="label" style="margin-bottom:6px">Paneles de ' + U.esc(church) + '</div>'
        + '<div class="auth-choices">' + allHTML + listHTML + '</div>'
        + (Services.canManageServices
          ? '<p class="tiny muted" style="margin-top:12px">Creá, renombrá y borrá servicios en Ajustes → Servicios.</p>'
          : ''),
      actions: [{ label: 'Cancelar', class: 'ghost' }],
      onMount: (box) => {
        box.querySelectorAll('[data-switch-service]').forEach((button) => {
          button.addEventListener('click', () => {
            UI.closeModal();
            Services.select(button.dataset.switchService);
          });
        });
      },
    });
  }

  function updateServiceSwitcher() {
    const buttons = ['serviceSwitcher', 'serviceSwitcherMobile']
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!buttons.length) return;
    const Services = window.Services;
    const visible = !!(Services && Services.available && Services.list.length
      && window.Auth && window.Auth.church);
    const current = Services && Services.active ? Services.active.name : 'Todos los servicios';
    const role = Services && Services.active && Services.active.myRole
      ? ' · ' + U.roleLabel(Services.active.myRole).toLowerCase()
      : '';
    buttons.forEach((button) => {
      button.hidden = !visible;
      if (!visible) {
        button.textContent = '';
        button.setAttribute('aria-label', '');
        return;
      }
      button.textContent = current + role + ' ▾';
      button.setAttribute('aria-label', 'Servicios. Actual: ' + current + role);
      if (!button.dataset.serviceSwitcherBound) {
        button.dataset.serviceSwitcherBound = '1';
        button.addEventListener('click', openServiceSelector);
      }
    });
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
        + '<div class="actions"><button type="button" class="btn" data-reload>Recargar</button></div></div>';
      const reloadButton = view.querySelector('[data-reload]');
      if (reloadButton) reloadButton.addEventListener('click', () => window.location.reload());
    }

    UI.renderNav();
    const settings = Store.state.settings;
    const readOnly = !Store.canEdit;
    const label = document.getElementById('churchLabel');
    if (label) label.textContent = churchLabelText(settings);
    updateChurchSwitcher(settings);
    updateServiceSwitcher();
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
  let syncChurchKey = '';

  function syncCloud(force) {
    if (!window.Auth || !window.Auth.isEnabled || !window.Auth.user || !window.Auth.church) {
      return Promise.resolve();
    }
    /* Al cambiar de iglesia, de servicio o de usuario puede quedar una carga
       anterior en curso: se descarta para no mezclar repertorios de dos paneles. */
    const serviceId = window.Services ? window.Services.filterId() : '';
    const churchKey = window.Auth.user.id + '|' + window.Auth.church.id + '|' + serviceId;
    if (churchKey !== syncChurchKey) {
      syncChurchKey = churchKey;
      syncPromise = null;
    }
    if (syncPromise) return syncPromise;
    syncPromise = Store.loadCloud(force ? { force: true } : undefined).then(() => {
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

    document.addEventListener('repertorio:servicechange', () => {
      syncCloud(true).then(() => start());
    });

    if (!window.Auth) {
      start();
      return;
    }

    /* En cada "ready" se releen los roles: un admin puede cambiar el rol de
       la iglesia o el de un servicio mientras la app está abierta. */
    const loadServices = () => (window.Services ? window.Services.load({ force: true }) : Promise.resolve());

    window.Auth.onChange((event) => {
      if (event === 'ready') {
        loadServices().then(() => syncCloud()).then(() => start());
      } else if (event === 'signed-out') {
        Store.clearSession();
      }
    });

    await window.Auth.init();

    const auth = window.Auth;
    const canStart = !auth.blocked && (!auth.isEnabled || (auth.user && auth.church));
    if (canStart) {
      await loadServices();
      await syncCloud();
      start();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
