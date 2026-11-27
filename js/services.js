/* Servicios / paneles dentro de la iglesia activa.
   Es JavaScript puro, sin librerías nuevas y sin CSP inline.

   Las canciones son globales de la iglesia; los servicios separan los
   repertorios y pueden cambiar el rol efectivo del usuario en cada panel.
   Si la migración SQL todavía no se ejecutó, la RPC list_services falla y
   la app sigue funcionando en modo legacy (services.available === false). */
(function () {
  'use strict';

  const PREFIX = 'repertorio.servicioActivo.v1.';
  const VALID_ROLES = ['admin', 'editor', 'musico'];
  const ALL_ID = '';

  let services = [];
  let activeId = ALL_ID;
  let lastId = '';
  let sessionKey = '';
  let available = false;
  let loading = null;
  let warned = false;

  function auth() {
    return window.Auth && window.Auth.isEnabled ? window.Auth : null;
  }

  function client() {
    const Auth = auth();
    return Auth ? Auth.client : null;
  }

  function churchId() {
    const Auth = auth();
    return Auth && Auth.church ? Auth.church.id : '';
  }

  function userId() {
    const Auth = auth();
    return Auth && Auth.user ? Auth.user.id : 'anon';
  }

  function key() {
    return PREFIX + userId() + '.' + churchId();
  }

  function readSaved() {
    try {
      const raw = window.localStorage.getItem(key());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function persist() {
    try {
      window.localStorage.setItem(key(), JSON.stringify({ activeId, lastId }));
    } catch (error) { /* sin almacenamiento */ }
  }

  function reset() {
    services = [];
    activeId = ALL_ID;
    lastId = '';
    sessionKey = '';
    available = false;
    loading = null;
  }

  function normalizeRow(row) {
    if (!row || !row.id) return null;
    return {
      id: String(row.id),
      name: String(row.name || 'Servicio'),
      slug: String(row.slug || ''),
      icon: String(row.icon || 'users'),
      color: String(row.color || '#3b82f6'),
      sortOrder: Number(row.sort_order) || 0,
      isActive: row.is_active !== false,
      myRole: VALID_ROLES.indexOf(String(row.my_role || '')) !== -1 ? String(row.my_role) : '',
    };
  }

  function find(id) {
    return services.find((service) => service.id === id) || null;
  }

  function canViewAll() {
    const Auth = auth();
    return !!(Auth && Auth.isAdmin);
  }

  function chooseInitial(saved) {
    const record = saved || {};
    const wanted = String(record.activeId || '');
    const remembered = String(record.lastId || '');

    if (wanted === ALL_ID && canViewAll()) {
      activeId = ALL_ID;
    } else if (find(wanted)) {
      activeId = wanted;
    } else if (find(remembered)) {
      activeId = remembered;
    } else {
      const general = services.find((service) => service.slug === 'general') || services[0];
      activeId = general ? general.id : ALL_ID;
    }
    lastId = find(remembered) ? remembered : (activeId || (services[0] && services[0].id) || '');
    persist();
  }

  /* Carga los servicios de la iglesia activa. Es idempotente: mientras la
     sesión y la iglesia no cambien, reutiliza la promesa en curso. */
  function load(options) {
    const opts = options || {};
    const currentKey = key();
    if (!opts.force && currentKey === sessionKey && loading) return loading;
    if (!opts.force && currentKey === sessionKey) return Promise.resolve();

    const supabase = client();
    const cid = churchId();
    if (!supabase || !cid) {
      reset();
      return Promise.resolve();
    }

    if (currentKey !== sessionKey) {
      services = [];
      activeId = ALL_ID;
      lastId = '';
      available = false;
      sessionKey = currentKey;
    }

    loading = supabase.rpc('list_services', { p_church_id: cid })
      .then((result) => {
        if (currentKey !== key()) return;
        if (result && result.error) throw result.error;
        const rows = Array.isArray(result && result.data) ? result.data : [];
        services = rows.map(normalizeRow).filter(Boolean);
        services.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es'));
        available = true;
        chooseInitial(readSaved());
      })
      .catch((error) => {
        if (currentKey !== key()) return;
        available = false;
        services = [];
        activeId = ALL_ID;
        lastId = '';
        if (!warned) {
          warned = true;
          console.warn('[services] La RPC list_services no está disponible. Ejecutá supabase/migration-services.sql.', error);
        }
      })
      .then(() => {
        if (currentKey === key()) loading = null;
      });

    return loading;
  }

  /* Vuelve a leer servicios y roles después de una gestión (alta, rename,
     borrado o cambio de rol). No descarta el panel activo si sigue existiendo. */
  function refresh() {
    return load({ force: true }).then(() => {
      document.dispatchEvent(new CustomEvent('repertorio:refresh'));
    });
  }

  function active() {
    return activeId ? find(activeId) : null;
  }

  function role() {
    const current = active();
    if (current && current.myRole) return current.myRole;
    const Auth = auth();
    return Auth ? (Auth.role || '') : '';
  }

  function canEdit() {
    return role() === 'admin' || role() === 'editor';
  }

  function canDelete() {
    return role() === 'admin';
  }

  function canManageMembers(serviceId) {
    const Auth = auth();
    if (Auth && Auth.isAdmin) return true;
    const target = find(serviceId || activeId);
    return !!target && target.myRole === 'admin';
  }

  /* Filtro de repertorios: '' significa "Todos" (sólo admin de iglesia). */
  function filterId() {
    return available ? activeId : '';
  }

  /* Servicio al que se asigna un repertorio nuevo cuando el panel activo es
     "Todos". Se recuerda el último panel usado para no sorprender al admin. */
  function writeId() {
    if (!available) return '';
    if (activeId) return activeId;
    if (find(lastId)) return lastId;
    return services.length ? services[0].id : '';
  }

  function isGeneral(serviceId) {
    const target = find(serviceId);
    return !!target && target.slug === 'general';
  }

  function select(id) {
    const next = id && find(id) ? String(id) : ALL_ID;
    if (!next && !canViewAll()) return false;
    if (next === activeId) return true;
    const previous = activeId;
    activeId = next;
    if (next) lastId = next;
    persist();
    if (window.Store && typeof window.Store.clearActiveServiceData === 'function') {
      window.Store.clearActiveServiceData(previous);
    }
    document.dispatchEvent(new CustomEvent('repertorio:servicechange'));
    return true;
  }

  function call(rpc, params, message) {
    const supabase = client();
    if (!supabase) return Promise.reject(new Error('Supabase no está configurado.'));
    return supabase.rpc(rpc, params).then((result) => {
      if (result && result.error) throw result.error;
      return result ? result.data : null;
    }).catch((error) => {
      const detail = error && error.message ? error.message : String(error || '');
      throw new Error(message + (detail ? ': ' + detail : ''));
    });
  }

  function create(name, icon, color) {
    return call('create_service', {
      p_church_id: churchId(),
      p_name: String(name || ''),
      p_icon: icon || 'users',
      p_color: color || '#3b82f6',
    }, 'No se pudo crear el servicio').then(() => refresh());
  }

  function update(id, name, icon, color, sortOrder) {
    const current = find(id);
    return call('update_service', {
      p_service_id: id,
      p_name: String(name || ''),
      p_icon: icon || (current && current.icon) || 'users',
      p_color: color || (current && current.color) || '#3b82f6',
      p_sort_order: sortOrder === undefined ? ((current && current.sortOrder) || 0) : sortOrder,
    }, 'No se pudo actualizar el servicio').then(() => refresh());
  }

  function remove(id) {
    return call('delete_service', { p_service_id: id }, 'No se pudo borrar el servicio').then(() => {
      if (activeId === id) {
        activeId = ALL_ID;
        persist();
      }
      if (lastId === id) {
        lastId = '';
        persist();
      }
      return refresh();
    });
  }

  function members(serviceId) {
    return call('list_service_members', { p_service_id: serviceId }, 'No se pudieron cargar los miembros')
      .then((rows) => (Array.isArray(rows) ? rows : []));
  }

  function setMember(serviceId, memberId, memberRole) {
    return call('set_service_member', {
      p_service_id: serviceId,
      p_user_id: memberId,
      p_role: memberRole,
    }, 'No se pudo guardar el rol').then(() => refresh());
  }

  function removeMember(serviceId, memberId) {
    return call('remove_service_member', {
      p_service_id: serviceId,
      p_user_id: memberId,
    }, 'No se pudo quitar el rol').then(() => refresh());
  }

  if (window.Auth && typeof window.Auth.onChange === 'function') {
    window.Auth.onChange((event) => {
      if (event === 'signed-out') reset();
    });
  }

  window.Services = {
    load, refresh, select,
    create, update, remove,
    members, setMember, removeMember,
    get list() { return services.slice(); },
    get active() { return active(); },
    get activeId() { return activeId; },
    get available() { return available; },
    get role() { return role(); },
    get canEdit() { return canEdit(); },
    get canDelete() { return canDelete(); },
    get canViewAll() { return canViewAll(); },
    get canManageServices() { return canViewAll(); },
    canManageMembers,
    filterId, writeId, isGeneral,
  };
})();
