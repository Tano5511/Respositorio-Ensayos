/* Miembros de la iglesia · sólo administradores */
(function () {
  'use strict';

  const U = window.U;
  const UI = window.UI;

  const ROLES = ['musico', 'editor', 'admin'];

  function cloudReady() {
    const Auth = window.Auth;
    return !!(Auth && Auth.isEnabled && Auth.user && Auth.church);
  }

  function roleOptions(selected) {
    return ROLES.map((role) =>
      '<option value="' + role + '"' + (role === selected ? ' selected' : '') + '>'
      + U.esc(U.roleLabel(role)) + '</option>'
    ).join('');
  }

  function memberRowHTML(member, myUserId) {
    const isMe = member.user_id === myUserId;
    const email = member.email || 'Sin email';
    const since = member.created_at ? String(member.created_at).slice(0, 10) : '';
    return '<div class="member-row" data-member="' + U.esc(member.user_id) + '">'
      + '<div class="member-main">'
      + '<div class="row wrap" style="gap:6px">'
      + '<strong>' + U.esc(email) + '</strong>'
      + (isMe ? '<span class="chip accent">Vos</span>' : '')
      + '</div>'
      + (since ? '<div class="tiny muted">Miembro desde ' + U.esc(U.fmtDateLong(since)) + '</div>' : '')
      + '</div>'
      + '<div class="member-actions">'
      + '<label class="tiny muted" for="role-' + U.esc(member.user_id) + '">Rol</label>'
      + '<select id="role-' + U.esc(member.user_id) + '" class="member-role" data-role-for="' + U.esc(member.user_id)
      + '" data-current="' + U.esc(member.role) + '"' + (isMe ? ' disabled title="No podés cambiar tu propio rol"' : '') + '>'
      + roleOptions(member.role)
      + '</select>'
      + (isMe
        ? ''
        : '<button type="button" class="btn sm ghost icon-only" data-remove-member="' + U.esc(member.user_id)
          + '" title="Quitar de la iglesia" aria-label="Quitar a ' + U.esc(email) + ' de la iglesia">'
          + UI.icon('trash') + '</button>')
      + '</div>'
      + '</div>';
  }

  function errorHTML(message) {
    return '<div class="empty" style="padding:26px 12px">'
      + '<div class="empty-icon">' + UI.icon('x') + '</div>'
      + '<h3>No pudimos cargar los miembros</h3>'
      + '<p>' + U.esc(message) + '</p>'
      + '<div class="actions"><button type="button" class="btn" data-retry-members>' + UI.icon('refresh') + 'Reintentar</button></div>'
      + '</div>';
  }

  function render(container) {
    document.title = 'Miembros · Repertorio';

    if (!cloudReady()) {
      document.title = 'Miembros · Repertorio';
      container.innerHTML = '<header class="page-head"><div>'
        + '<div class="eyebrow">' + UI.icon('users') + ' Iglesia</div>'
        + '<h1>Miembros</h1></div></header>'
        + '<div class="empty" style="margin-top:20px"><div class="empty-icon">' + UI.icon('users') + '</div>'
        + '<h3>Esta pantalla necesita una cuenta conectada</h3>'
        + '<p>Los miembros se administran desde la nube de la iglesia. Configurá Supabase y entrá con tu cuenta.</p>'
        + '<div class="actions"><a class="btn primary" href="#/ajustes">Ir a Ajustes</a></div></div>';
      return;
    }

    const auth = window.Auth;
    const church = auth.church;

    if (!auth.isAdmin) {
      container.innerHTML = '<header class="page-head"><div>'
        + '<div class="eyebrow">' + UI.icon('users') + ' Iglesia</div>'
        + '<h1>Miembros</h1></div></header>'
        + '<div class="empty" style="margin-top:20px"><div class="empty-icon">' + UI.icon('eye') + '</div>'
        + '<h3>Sólo para administradores</h3>'
        + '<p>Vos podés ver y usar el repertorio, pero la lista de miembros la administra un administrador.</p>'
        + '<div class="actions"><a class="btn" href="#/ajustes">Volver a Ajustes</a></div></div>';
      return;
    }

    container.innerHTML = ''
      + '<header class="page-head">'
      + '  <div><div class="eyebrow">' + UI.icon('users') + ' Iglesia</div>'
      + '  <h1>Miembros</h1>'
      + '  <p class="sub">Elegí quién puede editar canciones y repertorios en ' + U.esc(church.name) + '.</p></div>'
      + '  <div class="head-actions"><a class="btn ghost" href="#/ajustes">' + UI.icon('arrow-left') + 'Ajustes</a></div>'
      + '</header>'
      + '<section class="card settings-card">'
      + '  <div class="row wrap" style="gap:8px;align-items:baseline;justify-content:space-between">'
      + '    <h2>Equipo de la iglesia</h2>'
      + '    <span class="tiny muted" id="memberCount"></span>'
      + '  </div>'
      + '  <p class="desc">Los que se unen con el código de invitación entran como Músico. Después podés cambiarles el rol.</p>'
      + '  <div class="read-only-note">' + UI.icon('users')
      + '    <div><strong>Qué puede hacer cada rol</strong>'
      + '      <p class="tiny muted"><strong>Administrador:</strong> todo, incluidos los miembros. '
      + '      <strong>Editor:</strong> crea, edita y borra canciones y repertorios. '
      + '      <strong>Músico:</strong> sólo lectura.</p></div>'
      + '  </div>'
      + '  <div id="memberList" class="member-list">'
      + '    <p class="small muted">Cargando miembros…</p>'
      + '  </div>'
      + '</section>';

    const listBox = U.$('#memberList', container);
    const countBox = U.$('#memberCount', container);
    let members = [];

    function paint() {
      if (!listBox) return;
      if (!members.length) {
        listBox.innerHTML = '<div class="empty" style="padding:22px 10px"><div class="empty-icon">' + UI.icon('users') + '</div>'
          + '<h3>No hay miembros para mostrar</h3><p>Compartí el código de invitación para sumar a tu equipo.</p></div>';
        if (countBox) countBox.textContent = '';
        return;
      }
      if (countBox) {
        countBox.textContent = members.length + ' ' + U.plural(members.length, 'miembro', 'miembros');
      }
      listBox.innerHTML = members.map((member) => memberRowHTML(member, auth.user.id)).join('');
      bindRows();
    }

    function bindRows() {
      listBox.querySelectorAll('[data-role-for]').forEach((select) => {
        select.addEventListener('change', async () => {
          const userId = select.dataset.roleFor;
          const previous = select.dataset.current;
          const next = select.value;
          if (!userId || next === previous) return;
          select.disabled = true;
          try {
            const result = await auth.client.rpc('set_member_role', {
              p_church_id: church.id,
              p_user_id: userId,
              p_role: next,
            });
            if (result.error) throw result.error;
            select.dataset.current = next;
            const member = members.find((item) => item.user_id === userId);
            if (member) member.role = next;
            UI.toast('Rol actualizado');
          } catch (error) {
            select.value = previous;
            UI.toast(auth.errorText(error), 'error');
          } finally {
            select.disabled = false;
          }
        });
      });

      listBox.querySelectorAll('[data-remove-member]').forEach((button) => {
        button.addEventListener('click', async () => {
          const userId = button.dataset.removeMember;
          const member = members.find((item) => item.user_id === userId);
          if (!member) return;
          const email = member.email || 'este miembro';
          const confirmed = await UI.confirm({
            title: 'Quitar a ' + email,
            message: 'Ya no va a poder abrir el repertorio de esta iglesia. Podés volver a invitarlo con el código.',
            confirmLabel: 'Quitar de la iglesia',
            danger: true,
          });
          if (!confirmed) return;
          button.disabled = true;
          try {
            const result = await auth.client.rpc('remove_member', {
              p_church_id: church.id,
              p_user_id: userId,
            });
            if (result.error) throw result.error;
            members = members.filter((item) => item.user_id !== userId);
            UI.toast('Miembro quitado');
            paint();
          } catch (error) {
            button.disabled = false;
            UI.toast(auth.errorText(error), 'error');
          }
        });
      });
    }

    async function load() {
      if (!listBox) return;
      listBox.innerHTML = '<p class="small muted">Cargando miembros…</p>';
      try {
        const result = await auth.client.rpc('list_members', { p_church_id: church.id });
        if (result.error) throw result.error;
        members = Array.isArray(result.data) ? result.data : [];
        if (!container.isConnected) return;
        paint();
      } catch (error) {
        if (!container.isConnected) return;
        listBox.innerHTML = errorHTML(auth.errorText(error));
        const retry = listBox.querySelector('[data-retry-members]');
        if (retry) retry.addEventListener('click', load);
      }
    }

    load();
  }

  window.MembersView = { render };
})();
