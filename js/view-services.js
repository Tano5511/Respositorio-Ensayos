/* Ajustes → Servicios: alta, renombrado, borrado y roles por panel */
(function () {
  'use strict';

  const U = window.U;
  const UI = window.UI;
  const COLORS = [
    { value: '#3b82f6', label: 'Azul' },
    { value: '#22c55e', label: 'Verde' },
    { value: '#f59e0b', label: 'Ámbar' },
    { value: '#a855f7', label: 'Violeta' },
  ];

  function refreshApp() {
    document.dispatchEvent(new CustomEvent('repertorio:refresh'));
  }

  function auth() {
    return window.Auth && window.Auth.isEnabled ? window.Auth : null;
  }

  function services() {
    return window.Services || null;
  }

  function roleLabel(role) {
    return U.roleLabel(role || (auth() ? auth().role : 'musico'));
  }

  function cardHTML() {
    const Auth = auth();
    const Services = services();
    if (!Auth || !Auth.church) return '';

    if (!Services || !Services.available) {
      return '<section class="card settings-card" id="servicesCard">'
        + '<h2>Servicios</h2>'
        + '<p class="desc">Los paneles (General, Jóvenes, Niños…) separan los repertorios de tu iglesia.</p>'
        + '<p class="tiny muted">Todavía no están disponibles. Ejecutá la migración <code>supabase/migration-services.sql</code> en Supabase y recargá la página.</p>'
        + '</section>';
    }

    const list = Services.list;
    const rows = list.map((service) => {
      const isActive = service.id === Services.activeId;
      const canManage = Services.canManageServices;
      const canMembers = Services.canManageMembers(service.id);
      return '<div class="profile-row' + (isActive ? ' active' : '') + '" style="margin-top:8px">'
        + '<div class="profile-main">'
        + '<div class="row wrap" style="gap:6px">'
        + '<span class="service-dot" style="background:' + U.esc(service.color) + '"></span>'
        + '<strong>' + U.esc(service.name) + '</strong>'
        + (isActive ? '<span class="chip accent">Activo</span>' : '')
        + (service.slug === 'general' ? '<span class="chip">Inicial</span>' : '')
        + '<span class="chip">' + U.esc(roleLabel(service.myRole)) + '</span>'
        + '</div>'
        + '<div class="tiny muted">Panel con repertorios propios.</div>'
        + '</div>'
        + '<div class="row wrap" style="gap:6px">'
        + (isActive ? '' : '<button type="button" class="btn sm primary" data-svc-action="use" data-svc-id="' + U.esc(service.id) + '">Usar</button>')
        + (canMembers ? '<button type="button" class="btn sm" data-svc-action="members" data-svc-id="' + U.esc(service.id) + '">' + UI.icon('users') + 'Miembros</button>' : '')
        + (canManage ? '<button type="button" class="btn sm ghost" data-svc-action="rename" data-svc-id="' + U.esc(service.id) + '">' + UI.icon('edit') + 'Renombrar</button>' : '')
        + (canManage && service.slug !== 'general'
          ? '<button type="button" class="btn sm ghost icon-only" data-svc-action="delete" data-svc-id="' + U.esc(service.id) + '" title="Eliminar servicio" aria-label="Eliminar servicio">' + UI.icon('trash') + '</button>'
          : '')
        + '</div></div>';
    }).join('');

    return '<section class="card settings-card" id="servicesCard">'
      + '<h2>Servicios</h2>'
      + '<p class="desc">Cada panel tiene sus repertorios y sus propios permisos. Las canciones se comparten en toda la iglesia.</p>'
      + (Services.canViewAll
        ? '<p class="tiny muted" style="margin-bottom:10px">Estás viendo <strong>Todos los servicios</strong>. Los repertorios nuevos se guardan en <strong>'
          + U.esc(Services.list.find((item) => item.id === Services.writeId()) ? Services.list.find((item) => item.id === Services.writeId()).name : 'General')
          + '</strong>.</p>'
        : '')
      + '<div class="service-list">' + (rows || '<p class="small muted">No hay servicios disponibles.</p>') + '</div>'
      + (Services.canManageServices
        ? '<div class="row wrap" style="gap:8px;margin-top:14px">'
          + '<button type="button" class="btn primary" id="newService">' + UI.icon('plus') + 'Nuevo servicio</button>'
          + '</div>'
        : '')
      + '</section>';
  }

  function openServiceDialog(existing, onSaved) {
    const Services = services();
    const current = existing || { name: '', color: '#3b82f6' };
    UI.modal({
      title: existing ? 'Renombrar servicio' : 'Nuevo servicio',
      subtitle: 'Ejemplos: Jóvenes, Niños, Reunión general.',
      body: '<div class="stack">'
        + '<div class="field"><label for="svcName">Nombre *</label><input id="svcName" type="text" maxlength="80" value="' + U.esc(current.name) + '" placeholder="Jóvenes"></div>'
        + '<div class="field"><label for="svcColor">Color del panel</label>'
        + '<select id="svcColor">' + COLORS.map((color) =>
          '<option value="' + color.value + '"' + (color.value === current.color ? ' selected' : '') + '>' + color.label + '</option>').join('')
        + '</select></div></div>',
      actions: [
        { label: 'Cancelar', class: 'ghost' },
        {
          label: existing ? 'Guardar cambios' : 'Crear servicio',
          class: 'primary',
          onClick: (close, box) => {
            const input = box.querySelector('#svcName');
            const name = input.value.trim();
            if (name.length < 2) {
              UI.toast('El nombre debe tener al menos 2 caracteres', 'error');
              input.focus();
              return { keepOpen: true };
            }
            const color = box.querySelector('#svcColor').value;
            const task = existing
              ? Services.update(existing.id, name, 'users', color)
              : Services.create(name, 'users', color);
            UI.toast('Guardando…');
            task.then(() => {
              UI.toast(existing ? 'Servicio actualizado' : 'Servicio creado');
              if (onSaved) onSaved();
              refreshApp();
            }).catch((error) => UI.toast(error.message, 'error'));
          },
        },
      ],
    });
  }

  function roleOptions(currentRole, disabled, inheritedLabel) {
    const options = [
      { value: '', label: inheritedLabel },
      { value: 'admin', label: 'Administrador' },
      { value: 'editor', label: 'Editor' },
      { value: 'musico', label: 'Músico' },
    ];
    return '<select data-member-role' + (disabled ? ' disabled' : '') + '>'
      + options.map((option) => '<option value="' + option.value + '"'
        + (option.value === (currentRole || '') ? ' selected' : '') + '>' + U.esc(option.label) + '</option>').join('')
      + '</select>';
  }

  async function openMembersDialog(service) {
    const Auth = auth();
    const Services = services();
    const churchId = Auth && Auth.church ? Auth.church.id : '';
    if (!churchId) return;

    const handle = UI.modal({
      title: 'Miembros de ' + service.name,
      subtitle: 'El rol del servicio reemplaza al de la iglesia dentro de este panel.',
      body: '<p class="small muted">Cargando miembros…</p>',
      wide: true,
      actions: [{ label: 'Cerrar', class: 'ghost' }],
    });

    try {
      const [overrides, churchMembersResult] = await Promise.all([
        Services.members(service.id),
        Auth.client.rpc('list_members', { p_church_id: churchId }),
      ]);
      if (churchMembersResult && churchMembersResult.error) throw churchMembersResult.error;
      const churchMembers = Array.isArray(churchMembersResult && churchMembersResult.data)
        ? churchMembersResult.data : [];
      const overridesById = new Map(overrides.map((row) => [row.user_id, row]));
      const isChurchAdmin = !!Auth.isAdmin;

      const rowsHTML = churchMembers.map((member) => {
        const override = overridesById.get(member.user_id);
        const isSelf = member.user_id === Auth.user.id;
        const disabled = isSelf && !isChurchAdmin;
        const inherited = roleLabel(member.role);
        const label = member.email || 'Miembro';
        return '<div class="member-role-row" data-member-id="' + U.esc(member.user_id) + '">'
          + '<div><strong>' + U.esc(label) + '</strong>'
          + '<div class="tiny muted">Rol de iglesia: ' + U.esc(inherited) + (isSelf ? ' · vos' : '') + '</div></div>'
          + roleOptions(override ? override.role : '', disabled, 'Heredar (' + inherited + ')')
          + '</div>';
      }).join('');

      handle.el.querySelector('.modal-body').innerHTML = rowsHTML
        + '<p class="tiny muted" style="margin-top:12px">«Heredar» usa el rol de la iglesia. Solo un administrador de la iglesia puede asignar el rol de administrador.</p>';
      const body = handle.el.querySelector('.modal-body');

      body.addEventListener('change', (event) => {
        const select = event.target.closest('[data-member-role]');
        if (!select || select.disabled) return;
        const row = select.closest('[data-member-id]');
        const userId = row ? row.dataset.memberId : '';
        const role = select.value;
        const task = role
          ? Services.setMember(service.id, userId, role)
          : Services.removeMember(service.id, userId);
        select.disabled = true;
        task.then(() => {
          UI.toast(role ? 'Rol del servicio actualizado' : 'Rol heredado de la iglesia');
          handle.close();
          refreshApp();
        }).catch((error) => {
          UI.toast(error.message, 'error');
          select.disabled = false;
        });
      });
    } catch (error) {
      const body = handle.el.querySelector('.modal-body');
      if (body) body.innerHTML = '<p class="small" style="color:var(--danger)">No se pudieron cargar los miembros: '
        + U.esc(error && error.message ? error.message : String(error)) + '</p>';
    }
  }

  function bind(container) {
    const card = U.$('#servicesCard', container);
    if (!card) return;

    const newButton = U.$('#newService', card);
    if (newButton) newButton.addEventListener('click', () => openServiceDialog(null));

    card.addEventListener('click', (event) => {
      const button = event.target.closest('[data-svc-action]');
      if (!button) return;
      const Services = services();
      const id = button.dataset.svcId;
      const action = button.dataset.svcAction;

      if (action === 'use') {
        Services.select(id);
        UI.toast('Servicio cambiado');
        refreshApp();
        return;
      }

      const target = Services.list.find((item) => item.id === id);
      if (!target) return;

      if (action === 'rename') {
        openServiceDialog(target);
      } else if (action === 'members') {
        openMembersDialog(target);
      } else if (action === 'delete') {
        UI.confirm({
          title: 'Eliminar «' + target.name + '»',
          message: 'Los repertorios de este panel se moverán a General. No se borrarán canciones.',
          confirmLabel: 'Eliminar servicio',
          danger: true,
        }).then((confirmed) => {
          if (!confirmed) return;
          UI.toast('Eliminando…');
          Services.remove(id).then(() => {
            UI.toast('Servicio eliminado');
            refreshApp();
          }).catch((error) => UI.toast(error.message, 'error'));
        });
      }
    });
  }

  window.ServicesView = { cardHTML, bind };
})();
