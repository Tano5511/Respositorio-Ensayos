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

  function roleOptions(currentRole, isChurchAdmin, disabled) {
    const roles = isChurchAdmin ? ['admin', 'editor', 'musico'] : ['editor', 'musico'];
    const options = roles.map((role) => ({
      value: role,
      label: U.roleLabel(role),
    }));
    return '<select data-member-role' + (disabled ? ' disabled title="No podés cambiar tu propio rol"' : '') + '>'
      + options.map((option) => '<option value="' + option.value + '"'
        + (option.value === (currentRole || 'musico') ? ' selected' : '') + '>' + U.esc(option.label) + '</option>').join('')
      + '</select>';
  }

  async function openMembersDialog(service) {
    const Auth = auth();
    const Services = services();
    const churchId = Auth && Auth.church ? Auth.church.id : '';
    if (!churchId) return;

    const handle = UI.modal({
      title: 'Miembros de ' + service.name,
      subtitle: 'Sumá o quitá personas de este panel. Los que no están, usan el rol de la iglesia.',
      body: '<p class="small muted">Cargando miembros…</p>',
      wide: true,
      actions: [{ label: 'Cerrar', class: 'ghost' }],
    });
    const body = handle.el.querySelector('.modal-body');

    let churchMembers = [];
    let overrides = [];

    function overrideFor(userId) {
      return overrides.find((row) => row.user_id === userId) || null;
    }

    function rowHTML(member, override) {
      const isSelf = member.user_id === Auth.user.id;
      const disabled = isSelf && !Auth.isAdmin;
      const label = member.email || 'Miembro';
      const inherited = roleLabel(member.role);
      const controls = override
        ? roleOptions(override.role, !!Auth.isAdmin, disabled)
          + '<button type="button" class="btn sm ghost" data-member-action="remove" data-member-id="' + U.esc(member.user_id) + '"' + (disabled ? ' disabled' : '') + '>Quitar del panel</button>'
        : roleOptions('musico', !!Auth.isAdmin, disabled)
          + '<button type="button" class="btn sm primary" data-member-action="add" data-member-id="' + U.esc(member.user_id) + '"' + (disabled ? ' disabled' : '') + '>Agregar al panel</button>';
      return '<div class="member-role-row" data-member-id="' + U.esc(member.user_id) + '"'
        + (override ? ' data-in-panel="1"' : '') + '>'
        + '<div><strong>' + U.esc(label) + '</strong>'
        + '<div class="tiny muted">Rol de iglesia: ' + U.esc(inherited) + (isSelf ? ' · vos' : '') + '</div></div>'
        + '<div class="row wrap" style="gap:6px">' + controls + '</div>'
        + '</div>';
    }

    function paint() {
      const inPanel = churchMembers.filter((member) => overrideFor(member.user_id));
      const available = churchMembers.filter((member) => !overrideFor(member.user_id));

      body.innerHTML = '<p class="tiny muted">Un miembro del panel usa su rol del servicio aquí y hereda el de la iglesia en los demás. '
        + 'Quitar del panel no lo saca de la iglesia.</p>'
        + '<p class="tiny muted" style="margin-top:12px"><strong>En este panel</strong></p>'
        + (inPanel.length
          ? inPanel.map((member) => rowHTML(member, overrideFor(member.user_id))).join('')
          : '<p class="small muted">Todavía no hay miembros asignados a este panel.</p>')
        + '<p class="tiny muted" style="margin-top:14px"><strong>Agregar miembros de la iglesia</strong></p>'
        + (available.length
          ? available.map((member) => rowHTML(member, null)).join('')
          : '<p class="small muted">Todos los miembros de la iglesia ya están en este panel.</p>');
      bindActions();
    }

    function bindActions() {
      body.querySelectorAll('[data-member-action]').forEach((button) => {
        button.addEventListener('click', async () => {
          const row = button.closest('.member-role-row');
          const userId = row ? row.dataset.memberId : '';
          const select = row ? row.querySelector('[data-member-role]') : null;
          if (!userId || !select) return;
          const adding = button.dataset.memberAction === 'add';
          button.disabled = true;
          select.disabled = true;
          try {
            if (adding) {
              await Services.setMember(service.id, userId, select.value || 'musico');
              UI.toast('Miembro agregado al panel');
            } else {
              await Services.removeMember(service.id, userId);
              UI.toast('Miembro quitado del panel');
            }
            overrides = await Services.members(service.id);
            paint();
            refreshApp();
          } catch (error) {
            button.disabled = false;
            select.disabled = false;
            UI.toast(error.message, 'error');
          }
        });
      });

      body.querySelectorAll('[data-in-panel] [data-member-role]').forEach((select) => {
        select.addEventListener('change', async () => {
          const row = select.closest('.member-role-row');
          const userId = row ? row.dataset.memberId : '';
          if (!userId || select.disabled) return;
          select.disabled = true;
          try {
            await Services.setMember(service.id, userId, select.value);
            overrides = await Services.members(service.id);
            paint();
            refreshApp();
          } catch (error) {
            UI.toast(error.message, 'error');
            select.disabled = false;
          }
        });
      });
    }

    try {
      const [overridesResult, churchMembersResult] = await Promise.all([
        Services.members(service.id),
        Auth.client.rpc('list_members', { p_church_id: churchId }),
      ]);
      if (churchMembersResult && churchMembersResult.error) throw churchMembersResult.error;
      churchMembers = Array.isArray(churchMembersResult && churchMembersResult.data)
        ? churchMembersResult.data : [];
      overrides = Array.isArray(overridesResult) ? overridesResult : [];
      paint();
    } catch (error) {
      body.innerHTML = '<p class="small" style="color:var(--danger)">No se pudieron cargar los miembros: '
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
