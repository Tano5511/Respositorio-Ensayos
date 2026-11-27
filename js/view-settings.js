/* Ajustes, perfiles de iglesia, respaldo e importación de datos */
(function () {
  'use strict';

  const U = window.U;
  const UI = window.UI;

  function refreshApp() {
    document.dispatchEvent(new CustomEvent('repertorio:refresh'));
  }

  function slug(value) {
    return U.normalize(String(value || 'iglesia')).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'iglesia';
  }

  function profileRowHTML(profile, total) {
    const counts = profile.songs + ' ' + U.plural(profile.songs, 'canción', 'canciones')
      + ' · ' + profile.setlists + ' ' + U.plural(profile.setlists, 'repertorio', 'repertorios');
    return '<div class="profile-row' + (profile.active ? ' active' : '') + '">'
      + '<div class="profile-main">'
      + '<div class="row wrap" style="gap:6px"><strong>' + U.esc(profile.name) + '</strong>'
      + (profile.active ? '<span class="chip accent">Activo</span>' : '')
      + (profile.readOnly ? '<span class="chip" title="Perfil compartido en solo lectura">' + UI.icon('eye') + ' Solo lectura</span>' : '')
      + '</div>'
      + '<div class="tiny muted">' + counts + '</div>'
      + (profile.readOnly && profile.sharedBy ? '<div class="tiny text-accent">Compartido por ' + U.esc(profile.sharedBy) + '</div>' : '')
      + '</div>'
      + '<div class="row wrap" style="gap:6px">'
      + (profile.active ? '' : '<button type="button" class="btn sm primary" data-switch="' + U.esc(profile.id) + '">Usar</button>')
      + (profile.active && !profile.readOnly ? '<button type="button" class="btn sm ghost" data-rename="' + U.esc(profile.id) + '">Renombrar</button>' : '')
      + (total > 1 ? '<button type="button" class="btn sm ghost icon-only" data-remove-profile="' + U.esc(profile.id) + '" title="Eliminar perfil" aria-label="Eliminar perfil">' + UI.icon('trash') + '</button>' : '')
      + '</div>'
      + '</div>';
  }

  function render(container) {
    document.title = 'Ajustes · Repertorio';
    const settings = Store.state.settings;
    const stats = Store.stats();
    const editable = Store.canEdit;
    const profile = Store.activeProfile;
    const profiles = Store.profileSummaries();
    const auth = window.Auth && window.Auth.isEnabled ? window.Auth : null;
    const account = auth && auth.user ? auth.user : null;
    const church = auth && auth.church ? auth.church : null;
    const canImport = auth ? (editable && auth.isAdmin) : editable;
    // La "Zona de riesgo" borra datos: en la nube es solo para admin.
    // Usa la misma regla que el resto de los botones de borrado.
    const canUseDangerZone = auth ? !!auth.isAdmin : Store.canDelete;
    let bytes = 0;
    try { bytes = new Blob([Store.exportData()]).size; } catch (error) { bytes = 0; }
    const kb = Math.max(1, Math.round(bytes / 1024));

    container.innerHTML = ''
      + '<header class="page-head">'
      + '  <div><div class="eyebrow">' + UI.icon('settings') + ' Configuración</div>'
      + '  <h1>Ajustes</h1>'
      + '  <p class="sub">' + (auth ? 'Cuenta, apariencia y respaldo de tu iglesia.' : 'Perfiles de iglesia, apariencia y respaldo de tus datos.') + '</p></div>'
      + '</header>'
      + '<div class="settings-grid">'
      + (account
        ? '  <section class="card settings-card">'
          + '    <h2>Cuenta</h2>'
          + '    <p class="desc">Sesión iniciada con <strong>' + U.esc(account.email || '') + '</strong>.</p>'
          + (church
            ? '<div class="row wrap" style="gap:6px">'
              + '<span class="chip accent">' + U.esc(church.name) + '</span>'
              + '<span class="chip">' + U.esc(U.roleLabel(auth.role)) + '</span>'
              + (Store.offline ? '<span class="chip">Sin conexión</span>' : '')
              + '</div>'
            : '')
          + (Store.offline
            ? '<div class="read-only-note">' + UI.icon('clock') + '<div><strong>Sin conexión</strong>'
              + '<p class="tiny muted">Estás viendo los últimos datos guardados. Cuando vuelva la conexión se actualiza solo.</p></div></div>'
            : '')
          + '    <div class="row wrap" style="gap:8px;margin-top:16px">'
          + (auth
            ? '      <button type="button" class="btn primary" id="churchProfile">' + UI.icon('link') + 'Perfil de la iglesia</button>'
            : '')
          + (auth.isAdmin
            ? '      <button type="button" class="btn" id="members">' + UI.icon('users') + 'Miembros</button>'
            : '')
          + '      <button type="button" class="btn danger" id="signOut">' + UI.icon('x') + 'Cerrar sesión</button>'
          + '    </div>'
          + '    <p class="tiny muted" style="margin-top:10px">Tus canciones y repertorios se guardan en la nube de tu iglesia y se comparten con sus miembros.</p>'
          + '  </section>'
        : '')
      + (church
        ? '  <section class="card settings-card">'
          + '    <h2>Iglesia</h2>'
          + '    <p class="desc">Estás en <strong>' + U.esc(church.name) + '</strong> como <strong>' + U.esc(U.roleLabel(auth.role)) + '</strong>. Podés sumar otra iglesia sin dejar esta.</p>'
          + '    <div class="row wrap" style="gap:8px;margin-top:12px">'
          + '      <button type="button" class="btn primary" id="addJoinChurch">' + UI.icon('users') + 'Unirme a otra iglesia</button>'
          + '      <button type="button" class="btn" id="addCreateChurch">' + UI.icon('link') + 'Crear otra iglesia</button>'
          + '      <button type="button" class="btn" id="switchChurch">' + UI.icon('users') + 'Cambiar de iglesia</button>'
          + '      <button type="button" class="btn ghost" id="leaveChurch">' + UI.icon('x') + 'Salir de esta iglesia</button>'
          + '    </div>'
          + '    <p class="tiny muted" style="margin-top:10px">Al unirte con el código de una iglesia en la que ya estés, verás «Ya sos miembro» y no se creará una membresía duplicada.</p>'
          + '  </section>'
        : '')
      + window.ServicesView.cardHTML()
      + (auth
        ? ''
        : '  <section class="card settings-card profile-card">'
          + '    <h2>Perfil de iglesia</h2>'
          + '    <p class="desc">Cada iglesia guarda su propia biblioteca en este dispositivo. Cambia de perfil para trabajar con otra iglesia o comparte la tuya en modo solo lectura.</p>'
          + (profile && profile.readOnly
            ? '<div class="read-only-note">' + UI.icon('eye') + '<div><strong>Perfil de solo lectura</strong>'
              + '<p class="tiny muted">' + (profile.sharedBy ? 'Compartido por ' + U.esc(profile.sharedBy) + '. ' : '')
              + 'Puedes ver canciones y repertorios, pero no modificarlos. Cambia a tu propio perfil para editar.</p></div></div>'
            : '')
          + '    <div class="profile-list">' + profiles.map((item) => profileRowHTML(item, profiles.length)).join('') + '</div>'
          + '    <div class="row wrap" style="gap:8px;margin-top:14px">'
          + '      <button type="button" class="btn primary" id="newProfile">' + UI.icon('plus') + 'Nueva iglesia</button>'
          + '      <button type="button" class="btn" id="exportProfile">' + UI.icon('download') + 'Exportar este perfil</button>'
          + '      <button type="button" class="btn" id="importProfile">' + UI.icon('upload') + 'Importar perfil compartido</button>'
          + '      <input type="file" id="importProfileFile" accept="application/json,.json" class="hidden">'
          + '    </div>'
          + '    <p class="tiny muted" style="margin-top:10px">Al exportar se descarga un archivo con las canciones y repertorios de este perfil. La otra iglesia lo importa y queda en solo lectura.</p>'
          + '  </section>')
      + '  <section class="card settings-card">'
      + '    <h2>Apariencia</h2><p class="desc">Elige cómo se ve la aplicación en este dispositivo.</p>'
      + '    <div class="setting-row"><div><div class="label">Tema</div><p class="desc">Claro u oscuro.</p></div>'
      + '      <div class="theme-switch" id="themeSwitch">'
      + '        <button type="button" data-theme-value="dark" class="' + (settings.theme !== 'light' ? 'on' : '') + '">Oscuro</button>'
      + '        <button type="button" data-theme-value="light" class="' + (settings.theme === 'light' ? 'on' : '') + '">Claro</button>'
      + '      </div></div>'
      + '    <div class="setting-row"><div><div class="label">Tamaño de la letra</div><p class="desc">Se usa al abrir una canción.</p></div>'
      + '      <div class="row" style="gap:8px;min-width:150px"><input type="range" id="fontRange" min="13" max="26" step="1" value="' + (Number(settings.fontSize) || 17) + '"><span class="tiny mono nowrap" id="fontValue">' + (Number(settings.fontSize) || 17) + ' px</span></div></div>'
      + '    <div class="setting-row"><div><div class="label">Mostrar acordes</div><p class="desc">Al abrir una canción, mostrar acordes sobre la letra.</p></div>'
      + '      <label class="row" style="gap:6px"><input type="checkbox" id="showChords"' + (settings.showChords !== false ? ' checked' : '') + '></label></div>'
      + (auth ? '' : '    <div class="setting-row"><div><div class="label">Nombre de la iglesia</div><p class="desc">Aparece en la barra lateral y en el archivo compartido.</p></div>'
        + '      <input type="text" id="churchName" value="' + U.esc(settings.churchName || '') + '" placeholder="Mi iglesia" style="max-width:200px"' + (editable ? '' : ' disabled') + '></div>')
      + '  </section>'
      + '  <section class="card settings-card">'
      + '    <h2>Respaldo de datos</h2><p class="desc">' + (auth
        ? 'Descarga una copia de las canciones y repertorios de tu iglesia.'
        : 'Todo se guarda en este navegador. Descarga una copia para no perder nada.') + '</p>'
      + '    <div class="row wrap" style="gap:8px">'
      + '      <button type="button" class="btn" id="exportData">' + UI.icon('download') + 'Exportar respaldo</button>'
      + (canImport ? '      <button type="button" class="btn" id="importData">' + UI.icon('upload') + 'Importar</button>' : '')
      + '      <input type="file" id="importFile" accept="application/json,.json" class="hidden">'
      + '    </div>'
      + '    <p class="tiny muted" style="margin-top:12px">' + (auth
        ? (Store.offline ? 'Sin conexión · copia guardada en este dispositivo' : 'Sincronizado con tu iglesia')
        : (Store.storageOk ? 'Almacenamiento local disponible' : 'Almacenamiento no disponible'))
        + ' · ' + stats.songs + ' canciones · ' + stats.setlists + ' repertorios · aprox. ' + kb + ' KB</p>'
      + (canUseDangerZone && !auth
        ? '    <hr class="divider">'
          + '    <div class="row wrap" style="gap:8px">'
          + '      <button type="button" class="btn ghost" id="restoreDemo">' + UI.icon('refresh') + 'Restaurar datos de ejemplo</button>'
          + '    </div>'
          + '    <p class="tiny muted" style="margin-top:8px">Reemplaza todo por las canciones y repertorios de demostración.</p>'
        : '')
      + '  </section>'
      + '  <section class="card settings-card">'
      + '    <h2>Cómo escribir acordes</h2><p class="desc">El formato es simple y flexible.</p>'
      + '    <div class="stack" style="gap:10px">'
      + '      <div><div class="label" style="margin-bottom:4px">Acordes sobre la letra</div>'
      + '        <pre class="code-block">G           C\nSanto, santo, santo</pre></div>'
      + '      <div><div class="label" style="margin-bottom:4px">Secciones</div>'
      + '        <p class="small muted">Escribe <code>[Verso 1]</code>, <code>[Coro]</code>, <code>[Puente]</code>… en una línea aparte.</p></div>'
      + '      <div><div class="label" style="margin-bottom:4px">ChordPro</div>'
      + '        <p class="small muted">En el editor puedes pegar <code>[G]Santo, [C]santo</code> y convertirlo automáticamente al formato de arriba.</p></div>'
      + '      <div><div class="label" style="margin-bottom:4px">Transposición y capo</div>'
      + '        <p class="small muted">Al abrir una canción elige el tono en el selector o usa − / +. Los acordes se recalculan solos.</p></div>'
      + '    </div>'
      + '  </section>'
      + (canUseDangerZone
        ? '  <section class="card settings-card danger-zone">'
          + '    <h2>Zona de riesgo</h2><p class="desc">Estas acciones no se pueden deshacer.</p>'
          + (auth ? '<p class="tiny muted" style="margin-bottom:12px">Se borrarán para todos los miembros de la iglesia.</p>' : '')
          + '    <button type="button" class="btn danger" id="clearAll">' + UI.icon('trash') + 'Borrar todas las canciones y repertorios</button>'
          + '  </section>'
        : '')
      + '</div>';

    window.ServicesView.bind(container);

    /* ---------- Cuenta ---------- */

    const signOutButton = U.$('#signOut', container);
    if (signOutButton) {
      signOutButton.addEventListener('click', async () => {
        const confirmed = await UI.confirm({
          title: 'Cerrar sesión',
          message: '¿Querés salir de tu cuenta en este dispositivo? Se borrarán las canciones, repertorios y datos de iglesia guardados localmente.',
          confirmLabel: 'Cerrar sesión',
          danger: true,
        });
        if (!confirmed) return;
        await window.Auth.signOut();
      });
    }

    const membersButton = U.$('#members', container);
    if (membersButton) {
      membersButton.addEventListener('click', () => {
        window.location.hash = '#/miembros';
      });
    }

    const churchProfileButton = U.$('#churchProfile', container);
    if (churchProfileButton) {
      churchProfileButton.addEventListener('click', () => {
        window.location.hash = '#/iglesia';
      });
    }

    const addJoinButton = U.$('#addJoinChurch', container);
    if (addJoinButton) {
      addJoinButton.addEventListener('click', () => window.Auth.addChurch());
    }

    const addCreateButton = U.$('#addCreateChurch', container);
    if (addCreateButton) {
      addCreateButton.addEventListener('click', () => window.Auth.addChurch());
    }

    const switchChurchButton = U.$('#switchChurch', container);
    if (switchChurchButton) {
      switchChurchButton.addEventListener('click', () => {
        const headerButton = document.getElementById('churchSwitcher') || document.getElementById('churchSwitcherMobile');
        if (headerButton) {
          headerButton.click();
        } else {
          window.Auth.addChurch();
        }
      });
    }

    const leaveChurchButton = U.$('#leaveChurch', container);
    if (leaveChurchButton) {
      leaveChurchButton.addEventListener('click', async () => {
        const auth = window.Auth;
        const church = auth && auth.church;
        if (!church) return;
        const confirmed = await UI.confirm({
          title: 'Salir de ' + church.name,
          message: 'Vas a perder el acceso a sus canciones y repertorios. Los datos de la iglesia no se borran. '
            + 'Si sos el último administrador, antes tenés que asignar otro administrador.',
          confirmLabel: 'Salir de la iglesia',
          danger: true,
        });
        if (!confirmed) return;
        leaveChurchButton.disabled = true;
        UI.toast('Saliendo de la iglesia…');
        try {
          await auth.leaveChurch(church.id);
          UI.toast('Ya no pertenecés a esa iglesia');
          document.dispatchEvent(new CustomEvent('repertorio:refresh'));
        } catch (error) {
          leaveChurchButton.disabled = false;
          UI.toast(auth.errorText(error), 'error');
        }
      });
    }

    /* ---------- Perfiles ---------- */

    const profileCard = U.$('.profile-card', container);
    if (profileCard) profileCard.addEventListener('click', async (event) => {
      const switchButton = event.target.closest('[data-switch]');
      if (switchButton) {
        if (Store.switchProfile(switchButton.dataset.switch)) {
          UI.toast('Perfil cambiado');
          refreshApp();
        }
        return;
      }

      const renameButton = event.target.closest('[data-rename]');
      if (renameButton) {
        const target = Store.profileSummaries().find((item) => item.id === renameButton.dataset.rename);
        if (!target) return;
        openProfileNameDialog({
          title: 'Renombrar perfil',
          subtitle: 'El nombre se usa en la barra lateral y al compartir.',
          value: target.name,
          confirmLabel: 'Guardar',
          onSave: (name) => {
            if (Store.renameProfile(name)) {
              UI.toast('Perfil renombrado');
              refreshApp();
            }
          },
        });
        return;
      }

      const removeButton = event.target.closest('[data-remove-profile]');
      if (removeButton) {
        const target = Store.profileSummaries().find((item) => item.id === removeButton.dataset.removeProfile);
        if (!target) return;
        const confirmed = await UI.confirm({
          title: 'Eliminar «' + target.name + '»',
          message: 'Se eliminará este perfil y todo su contenido de este dispositivo. Exporta un respaldo antes si quieres conservarlo.',
          confirmLabel: 'Eliminar perfil',
          danger: true,
        });
        if (!confirmed) return;
        if (Store.deleteProfile(target.id)) {
          UI.toast('Perfil eliminado');
          refreshApp();
        }
      }
    });

    const newProfileButton = U.$('#newProfile', container);
    if (newProfileButton) newProfileButton.addEventListener('click', () => {
      openProfileNameDialog({
        title: 'Nueva iglesia',
        subtitle: 'Se crea un perfil vacío con su propia biblioteca.',
        value: '',
        confirmLabel: 'Crear perfil',
        onSave: (name) => {
          Store.createProfile(name);
          UI.toast('Perfil creado');
          refreshApp();
        },
      });
    });

    const exportProfileButton = U.$('#exportProfile', container);
    if (exportProfileButton) exportProfileButton.addEventListener('click', () => {
      const name = (auth && auth.church && auth.church.name)
        || (Store.activeProfile && Store.activeProfile.name)
        || 'iglesia';
      U.download('perfil-' + slug(name) + '-' + U.todayISO() + '.json', Store.exportProfile());
      UI.toast('Perfil exportado');
    });

    const profileFileInput = U.$('#importProfileFile', container);
    const importProfileButton = U.$('#importProfile', container);
    if (importProfileButton && profileFileInput) {
      importProfileButton.addEventListener('click', () => profileFileInput.click());
      profileFileInput.addEventListener('change', () => {
        const file = profileFileInput.files && profileFileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(String(reader.result || '{}'));
            if (!data || !Array.isArray(data.songs)) throw new Error('Formato inválido');
            if (data.kind === 'church-profile') {
              importSharedDialog(data);
            } else {
              importDialog(data, container);
            }
          } catch (error) {
            UI.toast('No se pudo leer el archivo: formato inválido', 'error');
          }
          profileFileInput.value = '';
        };
        reader.onerror = () => {
          UI.toast('No se pudo leer el archivo', 'error');
          profileFileInput.value = '';
        };
        reader.readAsText(file);
      });
    }

    /* ---------- Apariencia ---------- */

    container.querySelectorAll('[data-theme-value]').forEach((button) => {
      button.addEventListener('click', () => {
        const theme = button.dataset.themeValue;
        Store.setSetting('theme', theme);
        UI.applyTheme(Store.state.settings);
        container.querySelectorAll('[data-theme-value]').forEach((other) => {
          other.classList.toggle('on', other.dataset.themeValue === theme);
        });
      });
    });

    const fontRange = U.$('#fontRange', container);
    fontRange.addEventListener('input', () => {
      const size = Number(fontRange.value) || 17;
      U.$('#fontValue', container).textContent = size + ' px';
      document.documentElement.style.setProperty('--song-size', size + 'px');
    });
    fontRange.addEventListener('change', () => {
      Store.setSetting('fontSize', Number(fontRange.value) || 17);
    });

    U.$('#showChords', container).addEventListener('change', (event) => {
      Store.setSetting('showChords', event.target.checked);
    });

    const churchInput = U.$('#churchName', container);
    if (churchInput && editable) {
      churchInput.addEventListener('input', U.debounce(() => {
        const name = churchInput.value.trim();
        Store.setSetting('churchName', name);
        const label = document.getElementById('churchLabel');
        if (label) label.textContent = name || 'Mi iglesia';
      }, 300));
    }

    /* ---------- Respaldo ---------- */

    U.$('#exportData', container).addEventListener('click', () => {
      const stamp = U.todayISO();
      U.download('repertorio-respaldo-' + stamp + '.json', Store.exportData());
      UI.toast('Respaldo descargado');
    });

    const fileInput = U.$('#importFile', container);
    const importButton = U.$('#importData', container);
    if (importButton) importButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result || '{}'));
          if (!data || !Array.isArray(data.songs)) throw new Error('Formato inválido');
          importDialog(data, container);
        } catch (error) {
          UI.toast('No se pudo leer el archivo: formato inválido', 'error');
        }
        fileInput.value = '';
      };
      reader.onerror = () => {
        UI.toast('No se pudo leer el archivo', 'error');
        fileInput.value = '';
      };
      reader.readAsText(file);
    });

    const restoreButton = U.$('#restoreDemo', container);
    if (restoreButton) restoreButton.addEventListener('click', async () => {
      const confirmed = await UI.confirm({
        title: 'Restaurar datos de ejemplo',
        message: 'Se reemplazarán todas las canciones y repertorios actuales por los de demostración.',
        confirmLabel: 'Restaurar',
        danger: true,
      });
      if (!confirmed) return;
      Store.restoreDemo();
      UI.toast('Datos de ejemplo restaurados');
      refreshApp();
    });

    const clearButton = U.$('#clearAll', container);
    if (clearButton) clearButton.addEventListener('click', async () => {
      const confirmed = await UI.confirm({
        title: 'Borrar todos los datos',
        message: 'Se eliminarán todas las canciones y repertorios de este perfil. Descarga un respaldo antes si quieres conservarlos.',
        confirmLabel: 'Borrar todo',
        danger: true,
      });
      if (!confirmed) return;
      Store.clearAll();
      UI.toast('Datos borrados');
      refreshApp();
    });
  }

  /* ---------- Diálogos ---------- */

  function openProfileNameDialog(opts) {
    UI.modal({
      title: opts.title,
      subtitle: opts.subtitle,
      body: '<div class="field"><label for="profileName">Nombre de la iglesia</label>'
        + '<input type="text" id="profileName" value="' + U.esc(opts.value || '') + '" placeholder="Ej.: Iglesia Central" maxlength="60"></div>',
      actions: [
        { label: 'Cancelar', class: 'ghost' },
        {
          label: opts.confirmLabel || 'Guardar',
          class: 'primary',
          onClick: (close, box) => {
            const input = box.querySelector('#profileName');
            const name = input.value.trim();
            if (!name) {
              UI.toast('Escribe un nombre para la iglesia', 'error');
              input.focus();
              return { keepOpen: true };
            }
            opts.onSave(name);
          },
        },
      ],
      onMount: (box) => {
        const input = box.querySelector('#profileName');
        setTimeout(() => { input.focus(); input.select(); }, 40);
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            const primary = box.querySelector('.modal-foot .btn.primary');
            if (primary) primary.click();
          }
        });
      },
    });
  }

  function importSharedDialog(data) {
    const songCount = data.songs.length;
    const listCount = Array.isArray(data.setlists) ? data.setlists.length : 0;
    const name = String(data.profileName || (data.settings && data.settings.churchName) || 'Perfil compartido').trim() || 'Perfil compartido';
    const sharedBy = String(data.sharedBy || '').trim();
    const cloud = !!(window.Auth && window.Auth.isEnabled && window.Auth.user && window.Auth.church);

    if (cloud) {
      UI.modal({
        title: 'Importar repertorio',
        subtitle: name,
        body: '<p class="small">Se agregarán ' + songCount + ' ' + U.plural(songCount, 'canción', 'canciones')
          + ' y ' + listCount + ' ' + U.plural(listCount, 'repertorio', 'repertorios') + ' a tu iglesia.'
          + (sharedBy ? '<br>Compartido por ' + U.esc(sharedBy) : '') + '</p>'
          + '<p class="tiny muted">Las canciones se agregan al final; no se borra nada de lo que ya tenés.</p>',
        actions: [
          { label: 'Cancelar', class: 'ghost' },
          {
            label: 'Importar',
            class: 'primary',
            onClick: () => {
              try {
                const result = Store.importData(data, 'merge');
                UI.toast(result.songs + ' canciones importadas');
                refreshApp();
              } catch (error) {
                UI.toast('No se pudo importar el perfil', 'error');
              }
            },
          },
        ],
      });
      return;
    }

    UI.modal({
      title: 'Importar perfil compartido',
      subtitle: name,
      body: '<div class="read-only-note">' + UI.icon('eye') + '<div><strong>Solo lectura</strong>'
        + '<p class="tiny muted">Podrás ver y usar este perfil, pero no editar sus canciones ni repertorios.</p></div></div>'
        + '<p class="small">' + songCount + ' ' + U.plural(songCount, 'canción', 'canciones') + ' · ' + listCount + ' ' + U.plural(listCount, 'repertorio', 'repertorios')
        + (sharedBy ? '<br>Compartido por ' + U.esc(sharedBy) : '') + '</p>'
        + '<p class="tiny muted">Si ya importaste este perfil antes, se actualizará con la nueva versión.</p>',
      actions: [
        { label: 'Cancelar', class: 'ghost' },
        {
          label: 'Importar y ver',
          class: 'primary',
          onClick: () => {
            try {
              Store.importProfile(data);
              UI.toast('Perfil compartido importado');
              refreshApp();
            } catch (error) {
              UI.toast('No se pudo importar el perfil', 'error');
            }
          },
        },
      ],
    });
  }

  function importDialog(data, container) {
    const songCount = data.songs.length;
    const listCount = Array.isArray(data.setlists) ? data.setlists.length : 0;
    UI.modal({
      title: 'Importar respaldo',
      subtitle: songCount + ' ' + U.plural(songCount, 'canción', 'canciones') + ' · ' + listCount + ' ' + U.plural(listCount, 'repertorio', 'repertorios'),
      body: '<p class="small">¿Cómo quieres importar los datos?<br><br>'
        + '<strong>Fusionar</strong> añade las canciones del archivo a las que ya tienes.<br>'
        + '<strong>Reemplazar</strong> borra lo actual y deja solo el contenido del archivo.</p>',
      actions: [
        { label: 'Cancelar', class: 'ghost' },
        {
          label: 'Fusionar',
          class: 'primary',
          onClick: () => {
            try {
              const result = Store.importData(data, 'merge');
              UI.toast(result.songs + ' canciones importadas');
              UI.renderNav();
              window.location.hash = '#/canciones';
            } catch (error) {
              UI.toast('No se pudo importar el archivo', 'error');
            }
          },
        },
        {
          label: 'Reemplazar todo',
          class: 'danger',
          onClick: () => {
            try {
              Store.importData(data, 'replace');
              UI.toast('Respaldo importado');
              UI.renderNav();
              window.location.hash = '#/canciones';
            } catch (error) {
              UI.toast('No se pudo importar el archivo', 'error');
            }
          },
        },
      ],
    });
  }

  window.SettingsView = { render };
})();
