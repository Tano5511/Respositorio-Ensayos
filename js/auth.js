/* Autenticación con Supabase, sesión y selección de iglesia */
(function () {
  'use strict';

  const U = window.U;
  const UI = window.UI;

  const CHURCH_KEY = 'repertorio.iglesiaActiva.v1';

  const state = {
    configured: false,
    fatal: '',
    client: null,
    session: null,
    user: null,
    memberships: [],
    activeChurchId: null,
    mode: 'loading',
    message: '',
    pendingEmail: '',
    // Código de invitación. Se carga por RPC solo para administradores.
    inviteCode: '',
  };

  const listeners = [];
  let queue = Promise.resolve();
  let lastToken = '';
  let gateBound = false;

  /* ---------------- Utilidades ---------------- */

  function config() {
    return {
      url: String(window.SUPABASE_URL || '').trim(),
      key: String(window.SUPABASE_ANON_KEY || '').trim(),
    };
  }

  function looksLikePlaceholder(value) {
    const text = String(value || '').trim();
    if (!text) return true;
    return /TU[-_ ]?PROYECTO|TU[-_ ]?ANON|TU[-_ ]?KEY|YOUR[-_ ]|PEGA[-_ ]?AQUI|CAMBIAME|XXXX/i.test(text)
      || text.indexOf('<') !== -1 || text.indexOf('>') !== -1;
  }

  /* Detecta si por error se pegó una clave service_role. */
  function jwtRole(token) {
    try {
      const part = String(token || '').split('.')[1];
      if (!part) return '';
      const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
      const raw = window.atob(padded);
      const bytes = Array.from(raw, (char) => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2)).join('');
      const payload = JSON.parse(decodeURIComponent(bytes));
      return String(payload.role || '');
    } catch (error) {
      return '';
    }
  }

  function baseUrl() {
    return window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
  }

  function activeMembership() {
    return state.memberships.find((item) => item.church.id === state.activeChurchId) || null;
  }

  function churchStorageKey() {
    return CHURCH_KEY + (state.user ? '.' + state.user.id : '');
  }

  function readStoredChurchId() {
    try { return window.localStorage.getItem(churchStorageKey()) || ''; } catch (error) { return ''; }
  }

  function storeChurchId(id) {
    try { window.localStorage.setItem(churchStorageKey(), id); } catch (error) { /* sin almacenamiento */ }
  }

  /* Quita todo rastro de sesión guardado por el navegador: tokens de
     Supabase, iglesia activa y parámetros de autenticación en la URL. */
  function clearStoredSessionData() {
    [window.localStorage, window.sessionStorage].forEach((storage) => {
      try {
        Object.keys(storage).slice().forEach((key) => {
          const isToken = /^sb-.*-auth-token$/.test(key);
          const isChurch = key.indexOf(CHURCH_KEY) === 0;
          if (isToken || isChurch) storage.removeItem(key);
        });
      } catch (error) { /* sin almacenamiento */ }
    });
    try {
      if (window.location.hash && /[?&](access_token|refresh_token|error|error_code|code)=/.test(window.location.hash)) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (error) { /* sin historial */ }
  }

  function emit(event) {
    listeners.slice().forEach((listener) => {
      try { listener(event); } catch (error) { console.error(error); }
    });
  }

  function enqueue(task) {
    const run = queue.then(task, task);
    queue = run.catch(() => {});
    return run;
  }

  /* ---------------- Errores en español ---------------- */

  function errorText(error) {
    const code = String((error && (error.code || error.error_code)) || '');
    const message = String((error && (error.message || error.error_description)) || '');
    const name = String((error && error.name) || '');

    const known = {
      invalid_credentials: 'Email o contraseña incorrectos.',
      email_not_confirmed: 'Tenés que confirmar tu correo antes de entrar. Revisá tu bandeja de entrada.',
      user_already_exists: 'Ya existe una cuenta con ese email. Probá entrar.',
      email_exists: 'Ya existe una cuenta con ese email. Probá entrar.',
      weak_password: 'La contraseña es muy corta. Usá al menos 6 caracteres.',
      email_address_invalid: 'El email no parece válido.',
      invalid_email: 'El email no parece válido.',
      over_email_send_rate_limit: 'Esperá un momento antes de volver a intentar.',
      over_request_rate_limit: 'Demasiados intentos seguidos. Esperá unos minutos.',
      signup_disabled: 'El registro está desactivado en este proyecto.',
      email_provider_disabled: 'El registro con email está desactivado en este proyecto.',
      same_password: 'La nueva contraseña no puede ser igual a la anterior.',
      session_not_found: 'Tu sesión expiró. Volvé a entrar.',
      refresh_token_not_found: 'Tu sesión expiró. Volvé a entrar.',
      reauthentication_needed: 'Por seguridad, volvé a iniciar sesión.',
      otp_expired: 'El enlace venció. Pedí uno nuevo.',
    };

    if (known[code]) return known[code];

    if (code === 'P0002' || code === '22023' || code === '23514' || code === '28000') {
      return message || 'No se pudo completar la operación.';
    }

    if (code === '23505') return 'Ese nombre ya está en uso. Probá con otro.';
    if (code === '42501') return message || 'Tu usuario no tiene permiso para esta acción.';
    if (code === 'PGRST202' || /could not find the function/i.test(message)) {
      return 'La base de datos todavía no tiene esta función. Falta ejecutar supabase/migration-editor.sql en Supabase.';
    }
    if ((code === 'PGRST204' || /schema cache/i.test(message)) && /links/i.test(message)) {
      return 'La base de datos todavía no tiene la columna de links. Falta ejecutar supabase/migration-links.sql en Supabase.';
    }

    if (name === 'AuthRetryableFetchError' || name === 'TypeError' && /fetch|network/i.test(message)) {
      return 'No hay conexión. Revisá tu internet e intentá de nuevo.';
    }

    if (/invalid login credentials/i.test(message)) return 'Email o contraseña incorrectos.';
    if (/email not confirmed/i.test(message)) return 'Tenés que confirmar tu correo antes de entrar.';
    if (/user already registered|already been registered/i.test(message)) return 'Ya existe una cuenta con ese email. Probá entrar.';
    if (/password should be at least|password is too short/i.test(message)) return 'La contraseña es muy corta. Usá al menos 6 caracteres.';
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
      return 'No hay conexión. Revisá tu internet e intentá de nuevo.';
    }
    if (/rate limit|too many requests/i.test(message)) return 'Demasiados intentos seguidos. Esperá unos minutos.';
    if (/jwt|token/i.test(message) && /expired/i.test(message)) return 'Tu sesión expiró. Volvé a entrar.';

    return message || 'Algo salió mal. Intentá de nuevo.';
  }

  /* ---------------- Comprobaciones de formularios ---------------- */

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
  }

  function formError(form, message) {
    const box = form && form.querySelector('.auth-error');
    if (!box) {
      UI.toast(message, 'error');
      return;
    }
    box.textContent = message;
    box.hidden = false;
  }

  function clearFormError(form) {
    const box = form && form.querySelector('.auth-error');
    if (!box) return;
    box.textContent = '';
    box.hidden = true;
  }

  function busy(form, isBusy, label) {
    if (!form) return;
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    if (isBusy) {
      button.dataset.label = button.textContent;
      button.textContent = label || 'Un momento…';
      button.disabled = true;
    } else {
      button.textContent = button.dataset.label || button.textContent;
      button.disabled = false;
    }
  }

  /* ---------------- Pantalla de acceso ---------------- */

  function gateElement() {
    let root = document.getElementById('authScreen');
    if (root) return root;

    root = document.createElement('section');
    root.id = 'authScreen';
    root.className = 'auth-screen';
    root.hidden = true;
    root.setAttribute('aria-label', 'Acceso a tu cuenta');
    document.body.appendChild(root);

    root.addEventListener('submit', onGateSubmit);
    root.addEventListener('click', onGateClick);
    gateBound = true;
    return root;
  }

  function brandIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>';
  }

  function authHead(icon, eyebrow, title, subtitle) {
    return '<div class="auth-head">'
      + '<div class="eyebrow">' + UI.icon(icon) + ' ' + U.esc(eyebrow) + '</div>'
      + '<h1>' + U.esc(title) + '</h1>'
      + (subtitle ? '<p class="sub">' + U.esc(subtitle) + '</p>' : '')
      + '</div>';
  }

  function shellHTML() {
    return '<div class="auth-shell">'
      + '<div class="auth-brand">'
      + '<span class="brand-mark" aria-hidden="true">' + brandIcon() + '</span>'
      + '<span class="auth-brand-text"><strong>Repertorio</strong><small>Canciones y ensayos de tu iglesia</small></span>'
      + '</div>'
      + '<div class="card auth-card">' + cardHTML() + '</div>'
      + '<p class="tiny muted auth-foot">Tus datos se guardan en la nube de tu iglesia.<br>No compartas tu contraseña con nadie.</p>'
      + '</div>';
  }

  function cardHTML() {
    if (state.mode === 'loading') return loadingHTML();
    if (state.mode === 'problem') return problemHTML();
    if (state.mode === 'church') return churchHTML();
    if (state.mode === 'choose') return chooseHTML();
    if (state.mode === 'confirm') return confirmHTML();
    if (state.mode === 'register') return registerHTML();
    return loginHTML();
  }

  function loadingHTML() {
    return '<div class="auth-loading"><span class="auth-spinner" aria-hidden="true"></span>'
      + '<p class="small muted">Cargando tu cuenta…</p></div>';
  }

  function problemHTML() {
    return authHead('x', 'Conexión', 'No pudimos iniciar sesión')
      + '<div class="auth-error" role="alert">' + U.esc(state.message || 'Intentá de nuevo en unos segundos.') + '</div>'
      + '<button type="button" class="btn primary block" style="margin-top:16px" data-gate-reload>Recargar la página</button>';
  }

  function loginHTML() {
    return authHead('users', 'Tu iglesia', 'Entrá a tu cuenta', 'Sincronizá el repertorio con tu iglesia y accedé desde cualquier dispositivo.')
      + '<form class="auth-form" data-gate-form="login" novalidate>'
      + '<div class="auth-error" role="alert" hidden></div>'
      + '<div class="field"><label for="authEmail">Email</label>'
      + '<input id="authEmail" name="email" type="email" inputmode="email" autocomplete="email" placeholder="vos@ejemplo.com" maxlength="160" required></div>'
      + '<div class="field"><label for="authPassword">Contraseña</label>'
      + '<input id="authPassword" name="password" type="password" autocomplete="current-password" placeholder="Tu contraseña" minlength="6" required></div>'
      + '<button type="submit" class="btn primary block">Entrar</button>'
      + '</form>'
      + '<p class="auth-switch">¿No tenés cuenta? <button type="button" class="auth-link" data-gate="register">Crear una cuenta</button></p>';
  }

  function registerHTML() {
    return authHead('users', 'Tu iglesia', 'Creá tu cuenta', 'Con una cuenta vas a poder compartir el repertorio con tu iglesia.')
      + '<form class="auth-form" data-gate-form="register" novalidate>'
      + '<div class="auth-error" role="alert" hidden></div>'
      + '<div class="field"><label for="authEmail">Email</label>'
      + '<input id="authEmail" name="email" type="email" inputmode="email" autocomplete="email" placeholder="vos@ejemplo.com" maxlength="160" required></div>'
      + '<div class="field"><label for="authPassword">Contraseña</label>'
      + '<input id="authPassword" name="password" type="password" autocomplete="new-password" placeholder="Mínimo 6 caracteres" minlength="6" required></div>'
      + '<div class="field"><label for="authPassword2">Repetí la contraseña</label>'
      + '<input id="authPassword2" name="password2" type="password" autocomplete="new-password" placeholder="Otra vez" minlength="6" required></div>'
      + '<button type="submit" class="btn primary block">Crear cuenta</button>'
      + '</form>'
      + '<p class="auth-switch">¿Ya tenés cuenta? <button type="button" class="auth-link" data-gate="login">Entrar</button></p>';
  }

  function churchHTML() {
    const email = state.user && state.user.email ? state.user.email : '';
    return authHead('users', 'Casi listo', 'Tu iglesia', 'Tu cuenta está lista. Creá tu iglesia o unite a una con el código de invitación.')
      + (state.message ? '<div class="auth-error" role="alert">' + U.esc(state.message) + '</div>' : '')
      + '<div class="auth-user"><span>' + U.esc(email) + '</span>'
      + '<button type="button" class="auth-link" data-gate-signout>Salir</button></div>'
      + '<form class="auth-form" data-gate-form="create-church" novalidate>'
      + '<div class="auth-error" role="alert" hidden></div>'
      + '<div class="field"><label for="churchNameInput">Crear una iglesia</label>'
      + '<input id="churchNameInput" name="name" type="text" placeholder="Ej.: Iglesia Central" maxlength="120" autocomplete="organization" required></div>'
      + '<button type="submit" class="btn primary block">Crear iglesia</button>'
      + '</form>'
      + '<div class="auth-or">o</div>'
      + '<form class="auth-form" data-gate-form="join-church" novalidate>'
      + '<div class="auth-error" role="alert" hidden></div>'
      + '<div class="field"><label for="inviteInput">Unirme con un código</label>'
      + '<input id="inviteInput" name="code" type="text" class="auth-code" placeholder="ABC12345" maxlength="12" autocapitalize="characters" autocomplete="off" spellcheck="false" required></div>'
      + '<button type="submit" class="btn block">Unirme como músico</button>'
      + '</form>';
  }

  function chooseHTML() {
    return authHead('users', 'Tu iglesia', '¿Con cuál iglesia querés trabajar?', 'Pertenecés a más de una iglesia.')
      + '<div class="auth-choices">'
      + state.memberships.map((item) =>
        '<button type="button" class="auth-choice" data-gate-church="' + U.esc(item.church.id) + '">'
        + '<span>' + U.esc(item.church.name) + '</span>'
        + '<span class="chip">' + U.esc(U.roleLabel(item.role)) + '</span>'
        + '</button>').join('')
      + '</div>'
      + '<button type="button" class="btn ghost block" style="margin-top:14px" data-gate-signout>Cerrar sesión</button>';
  }

  function confirmHTML() {
    return authHead('check-circle', 'Revisá tu correo', 'Confirmá tu cuenta',
      'Te mandamos un email a ' + (state.pendingEmail || 'tu dirección') + '.')
      + '<div class="read-only-note">' + UI.icon('check-circle')
      + '<div><strong>Falta un paso</strong><p class="tiny muted">Abrí el enlace del correo para activar tu cuenta. Si no lo ves, revisá la carpeta de spam.</p></div></div>'
      + '<button type="button" class="btn primary block" data-gate="login">Ya confirmé, entrar</button>';
  }

  function renderGate() {
    const root = gateElement();
    root.hidden = false;
    root.innerHTML = shellHTML();
    document.body.classList.add('auth-locked');
    const focusTarget = root.querySelector('input:not([type="hidden"]), button[data-gate], button[data-gate-signout]');
    if (focusTarget) setTimeout(() => focusTarget.focus(), 50);
  }

  function showGate(mode, message) {
    if (mode) state.mode = mode;
    state.message = message || '';
    renderGate();
  }

  function hideGate() {
    const root = document.getElementById('authScreen');
    if (root) {
      root.hidden = true;
      root.innerHTML = '';
    }
    document.body.classList.remove('auth-locked');
    if (!gateBound) gateElement();
    state.mode = 'ready';
  }

  function onGateClick(event) {
    const switcher = event.target.closest('[data-gate]');
    if (switcher) {
      const mode = switcher.dataset.gate;
      if (mode === 'register' || mode === 'login') showGate(mode);
      return;
    }

    const churchButton = event.target.closest('[data-gate-church]');
    if (churchButton) {
      selectChurch(churchButton.dataset.gateChurch);
      return;
    }

    if (event.target.closest('[data-gate-signout]')) {
      signOut();
      return;
    }

    if (event.target.closest('[data-gate-reload]')) {
      window.location.reload();
    }
  }

  function onGateSubmit(event) {
    const form = event.target.closest('form[data-gate-form]');
    if (!form) return;
    event.preventDefault();

    const kind = form.dataset.gateForm;
    if (kind === 'login') doLogin(form);
    else if (kind === 'register') doRegister(form);
    else if (kind === 'create-church') doCreateChurch(form);
    else if (kind === 'join-church') doJoinChurch(form);
  }

  /* ---------------- Sesión ---------------- */

  async function loadMemberships() {
    if (!state.user) {
      state.memberships = [];
      return;
    }

    // Dos consultas separadas, siempre con columnas explícitas.
    // No usamos el embed `churches ( ... )`: PostgREST lo resuelve como un
    // `churches.*` interno y necesita SELECT de tabla, que está revocado para
    // que nadie pueda leer invite_code.
    const { data: memberRows, error: memberError } = await state.client
      .from('members')
      .select('church_id, role')
      .eq('user_id', state.user.id);

    if (memberError) throw memberError;
    if (!memberRows || !memberRows.length) {
      state.memberships = [];
      return;
    }

    const churchIds = Array.from(new Set(
      memberRows.map((row) => row.church_id).filter(Boolean)
    ));

    const { data: churchRows, error: churchError } = await state.client
      .from('churches')
      .select('id, name, slug')
      .in('id', churchIds);

    if (churchError) throw churchError;

    const churchesById = new Map(
      (churchRows || []).map((church) => [church.id, church])
    );

    state.memberships = memberRows
      .map((row) => {
        const church = churchesById.get(row.church_id);
        if (!church) return null;
        return {
          role: row.role === 'admin' ? 'admin' : row.role === 'editor' ? 'editor' : 'musico',
          church: {
            id: church.id,
            name: church.name,
            slug: church.slug,
          },
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.church.name.localeCompare(b.church.name, 'es'));
  }

  async function syncSession(session) {
    if (!session || !session.user) {
      state.session = null;
      state.user = null;
      state.memberships = [];
      state.activeChurchId = null;
      state.inviteCode = '';
      lastToken = '';
      clearStoredSessionData();
      showGate('login');
      emit('signed-out');
      return;
    }

    const token = String(session.access_token || '');
    state.session = session;
    state.user = session.user;

    if (token && token === lastToken && state.memberships.length) {
      hideGate();
      return;
    }

    try {
      await loadMemberships();
    } catch (error) {
      lastToken = '';
      showGate('problem', errorText(error));
      emit('error');
      return;
    }

    lastToken = token;

    if (!state.memberships.length) {
      state.mode = 'church';
      showGate('church');
      emit('needs-church');
      return;
    }

    const stored = readStoredChurchId();
    const storedMatch = state.memberships.find((item) => item.church.id === stored);

    if (!storedMatch && state.memberships.length > 1) {
      showGate('choose');
      emit('needs-church');
      return;
    }

    state.activeChurchId = (storedMatch || state.memberships[0]).church.id;
    storeChurchId(state.activeChurchId);
    hideGate();
    emit('ready');
  }

  function applySession(session) {
    return enqueue(() => syncSession(session));
  }

  /* ---------------- Acciones ---------------- */

  async function doLogin(form) {
    clearFormError(form);
    const email = String(form.email.value || '').trim();
    const password = String(form.password.value || '');

    if (!validEmail(email)) return formError(form, 'Escribí un email válido.');
    if (!password) return formError(form, 'Escribí tu contraseña.');

    busy(form, true, 'Entrando…');
    try {
      const { data, error } = await state.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await applySession(data.session);
    } catch (error) {
      formError(form, errorText(error));
    } finally {
      busy(form, false);
    }
  }

  async function doRegister(form) {
    clearFormError(form);
    const email = String(form.email.value || '').trim();
    const password = String(form.password.value || '');
    const repeat = String(form.password2.value || '');

    if (!validEmail(email)) return formError(form, 'Escribí un email válido.');
    if (password.length < 6) return formError(form, 'La contraseña debe tener al menos 6 caracteres.');
    if (password !== repeat) return formError(form, 'Las contraseñas no coinciden.');

    busy(form, true, 'Creando cuenta…');
    try {
      const { data, error } = await state.client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: baseUrl() },
      });
      if (error) throw error;

      if (data && data.session) {
        UI.toast('Tu cuenta está lista');
        await applySession(data.session);
      } else {
        state.pendingEmail = email;
        showGate('confirm');
      }
    } catch (error) {
      formError(form, errorText(error));
    } finally {
      busy(form, false);
    }
  }

  async function doCreateChurch(form) {
    clearFormError(form);
    const name = String(form.name.value || '').trim();

    if (name.length < 2) return formError(form, 'Escribí el nombre de la iglesia (mínimo 2 letras).');

    busy(form, true, 'Creando…');
    try {
      const { data, error } = await state.client.rpc('create_church', { p_name: name });
      if (error) throw error;
      const church = Array.isArray(data) ? data[0] : data;
      if (!church || !church.id) throw new Error('No pudimos crear la iglesia. Intentá de nuevo.');
      await afterChurchChange(church.id);
      UI.toast('Iglesia creada');
    } catch (error) {
      formError(form, errorText(error));
    } finally {
      busy(form, false);
    }
  }

  async function doJoinChurch(form) {
    clearFormError(form);
    const code = String(form.code.value || '').trim().toUpperCase();

    if (!/^[A-Z0-9]{8,32}$/.test(code)) {
      return formError(form, 'El código tiene entre 8 y 32 letras y números, sin espacios.');
    }

    busy(form, true, 'Uniéndome…');
    try {
      const { data, error } = await state.client.rpc('join_church', { p_invite_code: code });
      if (error) throw error;
      const church = Array.isArray(data) ? data[0] : data;
      if (!church || !church.id) throw new Error('Ese código de invitación no es correcto. Pedíselo a un administrador.');
      await afterChurchChange(church.id);
      UI.toast('Te uniste a ' + church.name);
    } catch (error) {
      formError(form, errorText(error));
    } finally {
      busy(form, false);
    }
  }

  async function afterChurchChange(churchId) {
    await loadMemberships();
    if (!state.memberships.some((item) => item.church.id === churchId)) {
      throw new Error('No pudimos cargar tu iglesia. Recargá la página.');
    }
    state.inviteCode = '';
    state.activeChurchId = churchId;
    storeChurchId(churchId);
    lastToken = state.session ? String(state.session.access_token || '') : '';
    hideGate();
    emit('ready');
  }

  function selectChurch(id) {
    const match = state.memberships.find((item) => item.church.id === id);
    if (!match) return;
    state.inviteCode = '';
    state.activeChurchId = id;
    storeChurchId(id);
    hideGate();
    emit('ready');
  }

  async function signOut() {
    try {
      if (state.client) await state.client.auth.signOut();
    } catch (error) {
      try {
        if (state.client) await state.client.auth.signOut({ scope: 'local' });
      } catch (ignored) { /* seguimos igual */ }
    }
    state.session = null;
    state.user = null;
    state.memberships = [];
    state.activeChurchId = null;
    state.inviteCode = '';
    lastToken = '';
    clearStoredSessionData();
    showGate('login');
    emit('signed-out');
  }

  async function refreshMemberships() {
    if (!state.user) return [];
    await loadMemberships();
    if (state.activeChurchId && !state.memberships.some((item) => item.church.id === state.activeChurchId)) {
      state.activeChurchId = state.memberships.length ? state.memberships[0].church.id : null;
      if (state.activeChurchId) storeChurchId(state.activeChurchId);
    }
    return state.memberships.slice();
  }

  /* Actualiza el nombre de la iglesia activa en memoria, después de guardarlo
     en Supabase. No vuelve a descargar canciones ni repertorios. */
  function updateChurchName(name) {
    const item = activeMembership();
    const clean = String(name || '').trim();
    if (!item || !clean) return;
    state.memberships.forEach((membership) => {
      if (membership.church.id === item.church.id) membership.church.name = clean;
    });
  }

  /* ---------------- Arranque ---------------- */

  async function init() {
    const settings = config();

    if (looksLikePlaceholder(settings.url) || looksLikePlaceholder(settings.key)) {
      state.configured = false;
      return;
    }

    const role = jwtRole(settings.key);
    if (role === 'service_role') {
      state.fatal = 'La clave configurada es service_role. Por seguridad, usá solamente la anon key pública en js/config.js.';
      showGate('problem', state.fatal);
      return;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      state.fatal = 'No se pudo cargar la librería de Supabase. Revisá tu conexión y recargá la página.';
      showGate('problem', state.fatal);
      return;
    }

    try {
      state.client = window.supabase.createClient(settings.url, settings.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (error) {
      state.fatal = 'La dirección de Supabase no es válida. Revisá SUPABASE_URL en js/config.js.';
      showGate('problem', state.fatal);
      return;
    }

    state.configured = true;

    state.client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        applySession(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        if (session) applySession(session);
      }
    });

    try {
      const { data } = await state.client.auth.getSession();
      await applySession(data ? data.session : null);
    } catch (error) {
      showGate('problem', errorText(error));
    }
  }

  window.Auth = {
    init,
    onChange(listener) {
      if (typeof listener !== 'function') return function () {};
      listeners.push(listener);
      return function () {
        const index = listeners.indexOf(listener);
        if (index !== -1) listeners.splice(index, 1);
      };
    },
    signIn(email, password) {
      if (!state.client) return Promise.resolve();
      return enqueue(async () => {
        const { data, error } = await state.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await syncSession(data.session);
      });
    },
    signUp(email, password) {
      if (!state.client) return Promise.resolve();
      return enqueue(async () => {
        const { data, error } = await state.client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: baseUrl() },
        });
        if (error) throw error;
        if (data && data.session) await syncSession(data.session);
        return data;
      });
    },
    signOut,
    createChurch(name) {
      if (!state.client) return Promise.reject(new Error('Supabase no está configurado.'));
      return state.client.rpc('create_church', { p_name: name });
    },
    joinChurch(code) {
      if (!state.client) return Promise.reject(new Error('Supabase no está configurado.'));
      return state.client.rpc('join_church', { p_invite_code: String(code || '').trim().toUpperCase() });
    },
    /* El código NO viene con la lista de iglesias: se pide por RPC y la base
       solo lo devuelve si quien llama es administrador. */
    async loadInviteCode(churchId) {
      if (!state.client || !state.user) throw new Error('Iniciá sesión para ver el código de invitación.');
      const { data, error } = await state.client.rpc('get_invite_code', {
        p_church_id: churchId || state.activeChurchId,
      });
      if (error) throw error;
      const code = String(data || '');
      if (!churchId || churchId === state.activeChurchId) state.inviteCode = code;
      return code;
    },
    async regenerateInviteCode(churchId) {
      if (!state.client || !state.user) throw new Error('Iniciá sesión para regenerar el código de invitación.');
      const { data, error } = await state.client.rpc('regenerate_invite_code', {
        p_church_id: churchId || state.activeChurchId,
      });
      if (error) throw error;
      const code = String(data || '');
      if (!churchId || churchId === state.activeChurchId) state.inviteCode = code;
      return code;
    },
    selectChurch,
    refreshMemberships,
    updateChurchName,
    get client() { return state.client; },
    get isEnabled() { return state.configured; },
    get blocked() { return !!state.fatal; },
    get user() { return state.user; },
    get session() { return state.session; },
    get memberships() { return state.memberships.slice(); },
    get church() { const item = activeMembership(); return item ? item.church : null; },
    get inviteCode() { return state.inviteCode; },
    get role() { const item = activeMembership(); return item ? item.role : null; },
    get isAdmin() { const item = activeMembership(); return !!item && item.role === 'admin'; },
    get isEditor() { const item = activeMembership(); return !!item && item.role === 'editor'; },
    get isMusician() { const item = activeMembership(); return !!item && item.role === 'musico'; },
    errorText,
  };
})();
