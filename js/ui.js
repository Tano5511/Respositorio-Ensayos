/* Componentes de interfaz: iconos, navegación, modales y avisos */
(function () {
  'use strict';

  const U = window.U;

  const ICONS = {
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    'arrow-left': '<path d="M19 12H5m7-7-7 7 7 7"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-right': '<path d="m9 6 6 6-6 6"/>',
    'chevron-up': '<path d="m6 15 6-6 6 6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    play: '<path d="M7 4.5 19.5 12 7 19.5Z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    star: '<path d="m12 3 2.7 5.7 6.3.9-4.6 4.4 1.1 6.2-5.5-3-5.5 3 1.1-6.2L3 9.6l6.3-.9Z"/>',
    printer: '<path d="M6 9V3h12v6"/><path d="M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2"/><path d="M6 14h12v7H6z"/>',
    download: '<path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5"/><path d="M4 18v3h16v-3"/>',
    upload: '<path d="M12 16V4m0 0 4.5 4.5M12 4 7.5 8.5"/><path d="M4 18v3h16v-3"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    'calendar-check': '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4m-9 7 2 2 4-4"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="8" cy="8" r="1.2"/>',
    check: '<path d="m5 12 4.5 4.5L19 6"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4V4h11v1"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    refresh: '<path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v5h5"/>',
    type: '<path d="M4 7V5h16v2M9 5v14M7 19h4M15 5v14M13 19h4"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/>',
    'eye-off': '<path d="M3 3l18 18"/><path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3 3.6M6.3 7.7A17 17 0 0 0 2 12s3.5 6 10 6a9.7 9.7 0 0 0 4-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    tempo: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18 16 10"/><circle cx="12" cy="18" r="1.5"/>',
    guitar: '<path d="M14.5 3.5 17 6m-4 1 4-4"/><path d="M15 7 9.5 12.5"/><path d="M8 11c2 0 4 2 4 4s-2 4-4 4-4-2-4-4c0-1.5.8-2.8 2-3.5"/><circle cx="13" cy="9" r="1"/>',
    sparkle: '<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><path d="m6 6 3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.6 6.8-4.2M8.6 13.4l6.8 4.2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7L13 18"/>',
  };

  function icon(name, extraClass) {
    const body = ICONS[name] || ICONS.music;
    return '<svg class="icon ' + (extraClass || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }

  const NAV_ITEMS = [
    { href: '#/repertorios', label: 'Repertorios', icon: 'list', count: 'setlists', match: ['/repertorios', '/repertorio'] },
    { href: '#/canciones', label: 'Canciones', icon: 'music', count: 'songs', match: ['/canciones', '/cancion'] },
    { href: '#/buscar', label: 'Buscar', icon: 'search', match: ['/buscar'] },
    { href: '#/ajustes', label: 'Ajustes', icon: 'settings', match: ['/ajustes'] },
  ];

  function currentPath() {
    const hash = window.location.hash || '#/repertorios';
    return hash.replace(/^#/, '').split('?')[0];
  }

  function isActive(item) {
    const path = currentPath();
    return item.match.some((prefix) => path === prefix || path.startsWith(prefix + '/'));
  }

  function renderNav() {
    const nav = document.getElementById('nav');
    const tabbar = document.getElementById('tabbar');
    const stats = window.Store ? window.Store.stats() : { songs: 0, setlists: 0 };
    if (nav) {
      nav.innerHTML = NAV_ITEMS.map((item) => {
        const count = item.count ? stats[item.count] : null;
        return '<a href="' + item.href + '" class="' + (isActive(item) ? 'active' : '') + '"' + (isActive(item) ? ' aria-current="page"' : '') + '>'
          + icon(item.icon)
          + '<span>' + item.label + '</span>'
          + (count !== null && count !== undefined ? '<span class="nav-count">' + count + '</span>' : '')
          + '</a>';
      }).join('');
    }
    if (tabbar) {
      tabbar.innerHTML = NAV_ITEMS.map((item) =>
        '<a href="' + item.href + '" class="' + (isActive(item) ? 'active' : '') + '">'
        + icon(item.icon)
        + '<span>' + item.label + '</span></a>'
      ).join('');
    }
  }

  function applyTheme(settings) {
    document.documentElement.setAttribute('data-theme', settings.theme === 'light' ? 'light' : 'dark');
    const size = Number(settings.fontSize) || 17;
    document.documentElement.style.setProperty('--song-size', size + 'px');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', settings.theme === 'light' ? '#f6f3ec' : '#0d1017');
  }

  function toast(message, type) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const node = U.el('div', { class: 'toast ' + (type === 'error' ? 'error' : 'ok') });
    node.innerHTML = icon(type === 'error' ? 'x' : 'check-circle') + '<span>' + U.esc(message) + '</span>';
    root.appendChild(node);
    setTimeout(() => {
      node.classList.add('out');
      setTimeout(() => node.remove(), 220);
    }, 2800);
  }

  let openModal = null;

  function closeModal() {
    if (!openModal) return;
    const { backdrop, previousFocus } = openModal;
    openModal = null;
    backdrop.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onModalKey);
    if (previousFocus && previousFocus.focus) previousFocus.focus();
  }

  function onModalKey(event) {
    if (event.key === 'Escape') closeModal();
  }

  function modal(options) {
    const opts = options || {};
    closeModal();
    const previousFocus = document.activeElement;
    const backdrop = U.el('div', { class: 'modal-backdrop' });
    const box = U.el('div', { class: 'modal ' + (opts.wide ? 'wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title || 'Diálogo' });
    const actions = opts.actions || [];
    const head = '<div class="modal-head"><div><h2>' + U.esc(opts.title || '') + '</h2>'
      + (opts.subtitle ? '<p>' + U.esc(opts.subtitle) + '</p>' : '') + '</div>'
      + '<button class="close-x" type="button" data-modal-close aria-label="Cerrar">' + icon('x') + '</button></div>';
    const foot = actions.length
      ? '<div class="modal-foot">' + actions.map((action, index) =>
        '<button type="button" class="btn ' + (action.class || '') + '" data-action-index="' + index + '">'
        + (action.icon ? icon(action.icon) : '') + U.esc(action.label) + '</button>'
      ).join('') + '</div>'
      : '';
    box.innerHTML = head + '<div class="modal-body">' + (opts.body || '') + '</div>' + foot;
    backdrop.appendChild(box);
    document.getElementById('modal-root').appendChild(backdrop);
    document.body.style.overflow = 'hidden';

    openModal = { backdrop, previousFocus };
    document.addEventListener('keydown', onModalKey);

    const localClose = () => {
      if (openModal && openModal.backdrop === backdrop) closeModal();
    };

    backdrop.addEventListener('mousedown', (event) => {
      if (event.target === backdrop && opts.dismissable !== false) localClose();
    });
    box.addEventListener('click', (event) => {
      if (event.target.closest('[data-modal-close]')) { localClose(); return; }
      const button = event.target.closest('[data-action-index]');
      if (!button) return;
      const action = actions[Number(button.dataset.actionIndex)];
      if (!action) return;
      const result = action.onClick ? action.onClick(localClose, box, backdrop) : undefined;
      if (action.keepOpen !== true && !(result && result.keepOpen)) localClose();
    });

    if (typeof opts.onMount === 'function') opts.onMount(box, localClose);
    const focusTarget = box.querySelector('input, textarea, select, button.primary, button');
    if (focusTarget) setTimeout(() => focusTarget.focus(), 30);
    return { close: closeModal, el: box };
  }

  function confirmDialog(options) {
    const opts = options || {};
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      const box = modal({
        title: opts.title || '¿Estás seguro?',
        subtitle: opts.subtitle || '',
        body: opts.message ? '<p class="small" style="color:var(--text-soft)">' + opts.message + '</p>' : '',
        actions: [
          { label: opts.cancelLabel || 'Cancelar', class: 'ghost', onClick: () => finish(false) },
          { label: opts.confirmLabel || 'Confirmar', class: opts.danger ? 'danger' : 'primary', onClick: () => finish(true) },
        ],
      });
      const observer = new MutationObserver(() => {
        if (!document.body.contains(box.el)) { finish(false); observer.disconnect(); }
      });
      observer.observe(document.getElementById('modal-root'), { childList: true });
    });
  }

  function keyBadge(key, title) {
    if (!key) return '';
    return '<span class="key-badge" title="' + U.esc(title || 'Tonalidad') + '">' + U.esc(key) + '</span>';
  }

  function songByItem(item) {
    return item && item.song ? item.song : null;
  }

  function readOnlyChip() {
    if (typeof window.Store === 'undefined' || window.Store.canEdit) return '';
    const reason = window.Store.readOnlyReason;
    const title = reason === 'role' ? 'Tu rol es músico: solo lectura'
      : reason === 'offline' ? 'Sin conexión: solo lectura'
        : 'Perfil compartido en solo lectura';
    return '<span class="chip accent" title="' + title + '">' + icon('eye') + ' Solo lectura</span>';
  }

  window.UI = {
    icon, renderNav, applyTheme, toast, modal, confirm: confirmDialog,
    closeModal, keyBadge, songByItem, readOnlyChip, NAV_ITEMS,
  };
})();
