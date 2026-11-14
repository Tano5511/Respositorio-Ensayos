/* Perfil de la iglesia · nombre, invitación, compartir y equipo */
(function () {
  'use strict';

  const U = window.U;
  const UI = window.UI;

  function auth() {
    return window.Auth && window.Auth.isEnabled ? window.Auth : null;
  }

  function ready() {
    const a = auth();
    return !!(a && a.user && a.church);
  }

  function inviteText(church) {
    return 'Unite al repertorio de ' + church.name + ' en Repertorio.\n'
      + 'Código de invitación: ' + church.inviteCode;
  }

  async function share(options, copiedMessage) {
    const result = await U.shareText(options);
    if (result === 'shared') UI.toast('Compartido');
    else if (result === 'copied') UI.toast(copiedMessage || 'Copiado para compartir');
    else if (result === 'failed') UI.toast('No pudimos compartir. Copiá el texto a mano.', 'error');
  }

  function memberRowHTML(member, myUserId) {
    const isMe = member.user_id === myUserId;
    const email = member.email || 'Sin email';
    const since = member.created_at ? String(member.created_at).slice(0, 10) : '';
    return '<div class="member-row">'
      + '<div class="member-main">'
      + '<div class="row wrap" style="gap:6px">'
      + '<strong>' + U.esc(email) + '</strong>'
      + (isMe ? '<span class="chip accent">Vos</span>' : '')
      + '</div>'
      + (since ? '<div class="tiny muted">Miembro desde ' + U.esc(U.fmtDateLong(since)) + '</div>' : '')
      + '</div>'
      + '<span class="chip' + (member.role === 'admin' ? ' accent' : '') + '">' + U.esc(U.roleLabel(member.role)) + '</span>'
      + '</div>';
  }

  function unavailable(container) {
    container.innerHTML = '<header class="page-head"><div>'
      + '<div class="eyebrow">' + UI.icon('users') + ' Iglesia</div>'
      + '<h1>Perfil de la iglesia</h1></div></header>'
      + '<div class="empty" style="margin-top:20px"><div class="empty-icon">' + UI.icon('users') + '</div>'
      + '<h3>Esta pantalla necesita una cuenta conectada</h3>'
      + '<p>El perfil y el código de invitación se administran desde la nube de la iglesia. Configurá Supabase y entrá con tu cuenta.</p>'
      + '<div class="actions"><a class="btn primary" href="#/ajustes">Ir a Ajustes</a></div></div>';
  }

  function render(container) {
    document.title = 'Iglesia · Repertorio';

    if (!ready()) {
      unavailable(container);
      return;
    }

    const a = auth();
    const church = a.church;
    const isAdmin = a.isAdmin;
    const canRename = isAdmin && !Store.offline;
    const appLink = U.appUrl();
    const invite = inviteText(church);

    container.innerHTML = ''
      + '<a class="back-link" href="#/ajustes">' + UI.icon('arrow-left') + 'Ajustes</a>'
      + '<header class="page-head">'
      + '  <div><div class="eyebrow">' + UI.icon('users') + ' Iglesia</div>'
      + '  <h1>' + U.esc(church.name) + '</h1>'
      + '  <p class="sub">Perfil, invitación y equipo de tu iglesia. Tu rol: <strong>' + U.esc(U.roleLabel(a.role)) + '</strong>.</p></div>'
      + '  <div class="head-actions">'
      + '    <button type="button" class="btn primary" id="shareInvite">' + UI.icon('share') + 'Compartir invitación</button>'
      + '  </div>'
      + '</header>'
      + '<div class="settings-grid">'
      + '  <section class="card settings-card">'
      + '    <h2>Perfil de la iglesia</h2>'
      + '    <p class="desc">Este nombre aparece en la barra lateral y cuando compartís el repertorio.</p>'
      + '    <div class="field">'
      + '      <label for="churchNameInput">Nombre de la iglesia</label>'
      + '      <input type="text" id="churchNameInput" maxlength="60" value="' + U.esc(church.name) + '"'
      + (canRename ? '' : ' disabled') + '>'
      + '    </div>'
      + (canRename
        ? '    <div class="row wrap" style="gap:8px;margin-top:12px">'
          + '      <button type="button" class="btn primary" id="saveChurchName">' + UI.icon('check') + 'Guardar nombre</button>'
          + '    </div>'
        : '    <p class="tiny muted" style="margin-top:12px">'
          + (Store.offline ? 'Sin conexión: no se puede cambiar el nombre ahora.'
            : 'Solo un administrador puede cambiar el nombre de la iglesia.') + '</p>')
      + '  </section>'

      + '  <section class="card settings-card">'
      + '    <h2>Código de invitación</h2>'
      + '    <p class="desc">Quien use este código entra a la iglesia como <strong>Músico</strong> y puede ver el repertorio. Después un administrador puede darle otro rol.</p>'
      + '    <div class="invite-box"><code class="invite-code" id="inviteCode">' + U.esc(church.inviteCode || '—') + '</code></div>'
      + '    <div class="row wrap" style="gap:8px;margin-top:12px">'
      + '      <button type="button" class="btn" id="copyCode">' + UI.icon('copy') + 'Copiar código</button>'
      + '      <button type="button" class="btn primary" id="shareCode">' + UI.icon('share') + 'Compartir invitación</button>'
      + '    </div>'
      + '    <p class="tiny muted" style="margin-top:12px">Tratá el código como una contraseña: cualquiera que lo tenga puede sumarse a la iglesia.</p>'
      + '  </section>'

      + '  <section class="card settings-card">'
      + '    <h2>Compartir la app</h2>'
      + '    <p class="desc">Enviá el enlace para que abran Repertorio desde el celular o la computadora.</p>'
      + '    <div class="share-link">'
      + '      <input type="text" id="appLink" readonly value="' + U.esc(appLink) + '">'
      + '    </div>'
      + '    <div class="row wrap" style="gap:8px;margin-top:12px">'
      + '      <button type="button" class="btn" id="copyLink">' + UI.icon('link') + 'Copiar enlace</button>'
      + '      <button type="button" class="btn" id="shareLink">' + UI.icon('share') + 'Compartir enlace</button>'
      + '    </div>'
      + '    <p class="tiny muted" style="margin-top:12px">En el celular podés instalarla como aplicación desde el menú del navegador.</p>'
      + '  </section>'

      + (isAdmin
        ? '  <section class="card settings-card">'
          + '    <div class="row wrap" style="gap:8px;align-items:baseline;justify-content:space-between">'
          + '      <h2>Miembros</h2>'
          + '      <span class="tiny muted" id="churchMemberCount"></span>'
          + '    </div>'
          + '    <p class="desc">Quiénes forman parte de la iglesia. Podés cambiar sus roles desde Miembros.</p>'
          + '    <div id="churchMembers" class="member-list"><p class="small muted">Cargando miembros…</p></div>'
          + '    <div class="row wrap" style="gap:8px;margin-top:14px">'
          + '      <a class="btn primary" href="#/miembros">' + UI.icon('users') + 'Gestionar roles</a>'
          + '    </div>'
          + '  </section>'
        : '')
      + '</div>';

    /* ---------- Nombre ---------- */

    const saveButton = U.$('#saveChurchName', container);
    if (saveButton) {
      const input = U.$('#churchNameInput', container);
      const save = async () => {
        const value = String(input ? input.value : '').trim();
        if (value.length < 2) {
          UI.toast('Escribí un nombre de al menos 2 letras.', 'error');
          if (input) input.focus();
          return;
        }
        if (value.length > 60) {
          UI.toast('El nombre es demasiado largo (máximo 60 caracteres).', 'error');
          return;
        }
        if (value === church.name) {
          UI.toast('El nombre no cambió');
          return;
        }
        saveButton.disabled = true;
        try {
          const { data, error } = await a.client
            .from('churches')
            .update({ name: value })
            .eq('id', church.id)
            .select('id, name');
          if (error) throw error;
          const saved = Array.isArray(data) && data[0] && data[0].name ? String(data[0].name) : value;
          a.updateChurchName(saved);
          UI.toast('Nombre de la iglesia actualizado');
          document.dispatchEvent(new CustomEvent('repertorio:refresh'));
        } catch (error) {
          saveButton.disabled = false;
          UI.toast(a.errorText(error), 'error');
        }
      };
      saveButton.addEventListener('click', save);
      if (input) {
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            save();
          }
        });
      }
    }

    /* ---------- Invitación ---------- */

    const shareInvite = () => share({ title: 'Invitación a ' + church.name, text: invite, url: appLink }, 'Invitación copiada');
    const headerShare = U.$('#shareInvite', container);
    if (headerShare) headerShare.addEventListener('click', shareInvite);
    const shareCodeButton = U.$('#shareCode', container);
    if (shareCodeButton) shareCodeButton.addEventListener('click', shareInvite);

    const copyCodeButton = U.$('#copyCode', container);
    if (copyCodeButton) {
      copyCodeButton.addEventListener('click', async () => {
        const ok = await U.copyText(church.inviteCode || '');
        UI.toast(ok ? 'Código copiado' : 'No pudimos copiar el código', ok ? undefined : 'error');
      });
    }

    const copyLinkButton = U.$('#copyLink', container);
    if (copyLinkButton) {
      copyLinkButton.addEventListener('click', async () => {
        const ok = await U.copyText(appLink);
        UI.toast(ok ? 'Enlace copiado' : 'No pudimos copiar el enlace', ok ? undefined : 'error');
      });
    }

    const shareLinkButton = U.$('#shareLink', container);
    if (shareLinkButton) {
      shareLinkButton.addEventListener('click', () => share({
        title: 'Repertorio · ' + church.name,
        text: 'Repertorio de ' + church.name + ': canciones con letras y acordes, repertorios y ensayos.',
        url: appLink,
      }, 'Enlace copiado para compartir'));
    }

    /* ---------- Miembros (sólo admin) ---------- */

    if (!isAdmin) return;

    const listBox = U.$('#churchMembers', container);
    const countBox = U.$('#churchMemberCount', container);
    if (!listBox) return;

    const load = async () => {
      listBox.innerHTML = '<p class="small muted">Cargando miembros…</p>';
      try {
        const { data, error } = await a.client.rpc('list_members', { p_church_id: church.id });
        if (error) throw error;
        const members = Array.isArray(data) ? data : [];
        if (!container.isConnected) return;
        if (!members.length) {
          listBox.innerHTML = '<p class="small muted">Todavía no hay miembros para mostrar.</p>';
          if (countBox) countBox.textContent = '';
          return;
        }
        if (countBox) countBox.textContent = members.length + ' ' + U.plural(members.length, 'miembro', 'miembros');
        listBox.innerHTML = members.map((member) => memberRowHTML(member, a.user.id)).join('');
      } catch (error) {
        if (!container.isConnected) return;
        listBox.innerHTML = '<div class="read-only-note">' + UI.icon('eye') + '<div><strong>No pudimos cargar la lista</strong>'
          + '<p class="tiny muted">' + U.esc(a.errorText(error)) + '</p></div></div>'
          + '<div class="row wrap" style="gap:8px;margin-top:10px">'
          + '<button type="button" class="btn" id="retryChurchMembers">' + UI.icon('refresh') + 'Reintentar</button>'
          + '</div>';
        const retry = U.$('#retryChurchMembers', container);
        if (retry) retry.addEventListener('click', load);
      }
    };

    load();
  }

  window.ChurchView = { render };
})();
