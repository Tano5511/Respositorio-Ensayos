/* Almacenamiento local y datos de ejemplo */
(function () {
  'use strict';

  const DB_KEY = 'repertorio.v1';
  const PROFILES_KEY = 'repertorio.profiles.v1';
  const SETTINGS_KEY = 'repertorio.settings.v1';
  const CLOUD_CACHE_PREFIX = 'repertorio.cloud.v1.';
  const LAST_SYNC_PREFIX = 'repertorio.lastSync.v1.';
  const CHURCH_KEY = 'repertorio.iglesiaActiva.v1';
  const IMPORT_ASKED_PREFIX = 'repertorio.importAsked.v1.';
  /* Columnas explícitas: chords/lyrics se mantienen porque el buscador y el
     lector trabajan sobre song.content (chordpro) y song.lyrics. */
  const SONG_COLUMNS = 'id, title, author, key, lyrics, chords, notes, bpm, duration, category, difficulty, tags, links, summary, favorite, created_at, updated_at';
  const SETLIST_COLUMNS = 'id, name, date, service, notes, items, created_at, updated_at';

  /* Límites del resumen por parte. Se aplican al leer y al escribir para que
     un respaldo manipulado o una canción antigua nunca rompa la vista. */
  const SUMMARY_MAX_PARTS = 40;
  const SUMMARY_NAME_MAX = 40;
  const SUMMARY_PHRASE_MAX = 120;
  const SUMMARY_DEGREES_MAX = 400;
  const SUMMARY_DEGREES_MAX_LINES = 8;
  const SUMMARY_NOTE_MAX = 120;
  const SYNC_PAGE_SIZE = 200;
  const MAX_SYNC_SONGS = 5000;
  const MAX_SYNC_SETLISTS = 2000;
  const SYNC_SKEW_MS = 2000;
  const CATEGORIES = ['Alabanza', 'Adoración', 'Comunión', 'Entrada', 'Salida', 'Himno', 'Especial', 'Navidad', 'Infantil'];

  const DEFAULT_SETTINGS = {
    theme: 'dark',
    fontSize: 17,
    showChords: true,
    churchName: 'Mi iglesia',
    defaultKey: 'G',
    lastView: '#/repertorios',
  };

  /* ---------- Datos de ejemplo ---------- */

  const SEED_SONGS = [
    {
      title: 'Santo, Santo, Santo',
      author: 'Tradicional',
      key: 'G',
      bpm: 72,
      duration: 250,
      category: 'Himno',
      difficulty: 'Fácil',
      tags: ['himno', 'clásico', 'congregacional'],
      notes: 'Entrar suave con guitarra. El último coro subir dinámica.',
      favorite: true,
      chordpro: `[Verso 1]
[G]Santo, santo, [C]santo, [G]Señor omnipo[D]tente
[G]Dios en tres [Em]personas, [Am]bendito [D]Señor
[G]Santo, santo, [C]santo, [G]misericor[D]dioso
[C]Dios de [G]gloria, [D]santo [G]Señor

[Coro]
[C]Santo, [G]santo, [D]santo es el [Em]Señor
[C]Santo, [G]santo, [D]digno de loor
[C]Toda la [G]tierra [D]llena está de [Em]Ti
[C]Santo, [G]santo, [D]santo [G]Señor`,
    },
    {
      title: 'Gracia admirable',
      author: 'John Newton · Tradicional',
      key: 'G',
      bpm: 76,
      duration: 240,
      category: 'Himno',
      difficulty: 'Fácil',
      tags: ['himno', 'clásico', 'gracia'],
      notes: 'Se puede tocar en 3/4 o 4/4. Cuidar el final en G.',
      favorite: false,
      chordpro: `[Verso 1]
[G]Gracia admi[G7]rable, [C]cuán dulce [G]es
[G]Que salvo a [Em]un infeliz [A7]como [D]yo
[G]Estaba per[G7]dido, [C]mas me bus[G]có
[Em]Ciego era, [D]mas ahora [G]veo

[Verso 2]
[G]Mi corazón [G7]temía, [C]pero encon[G]tré
[G]En Cristo [Em]la paz [A7]que tanto an[D]helé
[G]Su gracia [G7]me enseñó [C]a confi[G]ar
[Em]Y en Su [D]amor poder [G]descansar`,
    },
    {
      title: 'Cuán firme cimiento',
      author: 'Tradicional',
      key: 'G',
      bpm: 80,
      duration: 230,
      category: 'Adoración',
      difficulty: 'Media',
      tags: ['himno', 'clásico', 'fe'],
      notes: 'El coro puede repetirse dos veces al final.',
      favorite: true,
      chordpro: `[Verso 1]
[G]Cuán firme ci[C]miento, [G]puesto en [D]Dios
[G]Por Su pala[C]bra [G]firme [D]estoy
[G]Él es mi espe[C]ranza, [G]mi salva[D]ción
[Em]En medio [C]de la [G]tribula[D]ción

[Coro]
[C]No temeré, [G]Él está con[D]migo
[C]No temeré, [G]Su amor es [D]fiel
[C]Aunque la [G]tierra [D]temblar [Em]pueda
[C]Mi roca [G]firme es [D]Él`,
    },
    {
      title: 'Roca de la eternidad',
      author: 'Augustus Toplady · Tradicional',
      key: 'C',
      bpm: 70,
      duration: 260,
      category: 'Comunión',
      difficulty: 'Media',
      tags: ['himno', 'comunión', 'clásico'],
      notes: 'Ideal para el momento de la comunión. Bajar volumen.',
      favorite: false,
      chordpro: `[Verso 1]
[C]Roca de la e[F]ternidad, [C]herido [G]por mí
[C]Deja que Tu [F]sangre y [C]agua [G]fluyan [C]aquí
[C]Lava mis cul[F]pas, [C]sáname [G]Señor
[C]Y escon[F]de mi [C]vida [G]en [C]Ti

[Verso 2]
[C]Mientras tenga a[F]liento, [C]cantaré Tu [G]amor
[C]Tu gracia me [F]alcanzó, [C]me dio salva[G]ción
[C]Cuando mis [F]fuerzas [C]lleguen a su [G]fin
[C]Tu fidelidad [F]me sostendrá [C]a [G]mí`,
    },
    {
      title: 'En la cruz',
      author: 'Tradicional',
      key: 'G',
      bpm: 74,
      duration: 245,
      category: 'Comunión',
      difficulty: 'Media',
      tags: ['himno', 'cruz', 'comunión'],
      notes: 'Se puede hacer solo con piano y voz.',
      favorite: false,
      chordpro: `[Verso 1]
[G]En la cruz, [C]en la cruz, [G]dónde mi Salva[D]dor
[G]Derramó [C]Su preciosa [G]sangre, [D]todo mi [G]ser
[G]Allí vi [C]la luz, [G]allí hallé per[D]dón
[C]Y mi co[G]razón [D]halló salva[G]ción

[Coro]
[C]En la [G]cruz, [D]en la [Em]cruz
[C]Me a[G]mó y [D]me salvó [G]allí
[C]En la [G]cruz, [D]en la [Em]cruz
[C]Mi [G]vida [D]entrego a [G]Ti`,
    },
    {
      title: 'Noche de paz',
      author: 'Tradicional',
      key: 'C',
      bpm: 68,
      duration: 210,
      category: 'Navidad',
      difficulty: 'Fácil',
      tags: ['navidad', 'villancico', 'clásico'],
      notes: 'Para el culto de Navidad. Arreglo acústico.',
      favorite: false,
      chordpro: `[Verso 1]
[C]Noche de [F]paz, [C]noche de a[G]mor
[C]Todo du[F]erme, [C]solo vel[G]an
[C]En la es[F]cena [C]los santos [G]dos
[C]Que al [F]niño [C]Jesús [G]cuidan con a[C]mor

[Coro]
[F]Duerme, [C]duerme, [G]príncipe de [C]paz
[F]Duerme, [C]duerme, [G]príncipe de [C]paz`,
    },
    {
      title: 'Te alabo, Señor',
      author: 'Equipo de alabanza',
      key: 'D',
      bpm: 128,
      duration: 255,
      category: 'Alabanza',
      difficulty: 'Fácil',
      tags: ['alabanza', 'alegre', 'congregacional'],
      notes: 'Canción de entrada. Empezar con el riff de intro y subir energía.',
      favorite: true,
      chordpro: `[Intro]
[D] [A] [Bm] [G]
[D] [A] [Bm] [G]

[Verso 1]
[D]Te alabo, Señor, [A]con todo mi corazón
[Bm]Cada mañana [G]me recuerdas Tu bondad
[D]Aunque la noche [A]sea larga y oscura
[Bm]Tu luz me guía [G]y me da paz

[Coro]
[D]Cantaré, [A]cantaré
[Bm]De Tu amor [G]no callaré
[D]Toda mi vida [A]Te alabaré
[Bm]Por siempre [G]Te adoraré`,
    },
    {
      title: 'Tu fidelidad',
      author: 'Equipo de alabanza',
      key: 'G',
      bpm: 76,
      duration: 280,
      category: 'Adoración',
      difficulty: 'Media',
      tags: ['adoración', 'contemporáneo', 'fidelidad'],
      notes: 'Dejar espacio instrumental después del segundo coro.',
      favorite: true,
      chordpro: `[Verso 1]
[G]Tu fidelidad [C]es grande, [G]nunca falla [D]Tu amor
[G]Cada promesa [C]que has dicho [G]se cumple, [D]Señor
[Em]Cuando no entiendo [C]el camino, [G]confiaré en [D]Ti
[Em]Porque Tú eres [C]fiel, [D]siempre fiel

[Coro]
[C]Tu fidelidad [G]me sostiene
[D]Tu misericordia [Em]no se acaba
[C]Nueva cada [G]mañana
[D]Grande es Tu [G]fidelidad`,
    },
  ];

  const SEED_SETLISTS = [
    {
      name: 'Culto dominical',
      date: '2026-11-15',
      service: 'Culto dominical',
      notes: 'Entrar con "Te alabo, Señor". Cuidar transiciones hacia adoración.',
      songs: ['Te alabo, Señor', 'Santo, Santo, Santo', 'Tu fidelidad', 'Gracia admirable'],
      statuses: [true, true, false, false],
    },
    {
      name: 'Ensayo de miércoles',
      date: '2026-11-18',
      service: 'Ensayo',
      notes: 'Repasar finales y cambios de tonalidad. Traer cables extra.',
      songs: ['Roca de la eternidad', 'En la cruz', 'Cuán firme cimiento'],
      statuses: [false, false, false],
    },
    {
      name: 'Culto de Navidad',
      date: '2026-12-20',
      service: 'Culto especial',
      notes: 'Programa especial de Navidad. Invitar al coro infantil.',
      songs: ['Noche de paz', 'Santo, Santo, Santo'],
      statuses: [false, false],
    },
  ];

  const now = new Date().toISOString();

  function seed() {
    const songs = SEED_SONGS.map((raw, index) => ({
      id: 'song_seed_' + (index + 1),
      title: raw.title,
      author: raw.author,
      key: raw.key,
      capo: 0,
      bpm: raw.bpm,
      duration: raw.duration,
      category: raw.category,
      difficulty: raw.difficulty,
      tags: raw.tags.slice(),
      notes: raw.notes,
      favorite: raw.favorite,
      content: window.Chords.convertChordPro(raw.chordpro),
      summary: [],
      createdAt: now,
      updatedAt: now,
    }));

    const byTitle = {};
    songs.forEach((song) => { byTitle[song.title] = song.id; });

    const setlists = SEED_SETLISTS.map((raw, index) => ({
      id: 'setlist_seed_' + (index + 1),
      name: raw.name,
      date: raw.date,
      service: raw.service,
      notes: raw.notes,
      items: raw.songs.map((title, i) => ({
        id: window.U.uid('item'),
        songId: byTitle[title],
        keyOverride: '',
        capoOverride: '',
        notes: '',
        done: !!raw.statuses[i],
      })),
      createdAt: now,
      updatedAt: now,
    }));

    return { songs, setlists, settings: Object.assign({}, DEFAULT_SETTINGS) };
  }

  /* ---------- Estado y persistencia ---------- */

  const state = {
    songs: [],
    setlists: [],
    settings: Object.assign({}, DEFAULT_SETTINGS),
  };

  const listeners = [];
  let storageOk = true;
  let profiles = [];
  let activeProfileId = '';
  let offline = false;
  const writeQueues = new Map();
  let loadedSessionKey = '';

  function profileById(id) {
    return profiles.find((profile) => profile.id === id) || null;
  }

  function activeProfile() {
    return profileById(activeProfileId) || profiles[0] || null;
  }

  function hasWriteRole() {
    const Auth = window.Auth;
    return !!(Auth && (Auth.isAdmin || Auth.isEditor));
  }

  function canEdit() {
    if (cloudEnabled()) return hasWriteRole() && navigator.onLine !== false;
    const profile = activeProfile();
    return !profile || !profile.readOnly;
  }

  /* Borrar canciones y repertorios es una acción de admin.
     En modo local no hay roles de servidor, así que se mantiene el comportamiento
     de siempre: quien puede editar, puede borrar. */
  function canDelete() {
    if (!cloudEnabled()) return canEdit();
    return !!(window.Auth && window.Auth.isAdmin && navigator.onLine !== false);
  }

  function readOnlyReason() {
    if (canEdit()) return '';
    if (!cloudEnabled()) return 'profile';
    if (!hasWriteRole()) return 'role';
    return 'offline';
  }

  function readOnlyMessage() {
    const reason = readOnlyReason();
    if (reason === 'role') return 'Solo los administradores y editores pueden editar';
    if (reason === 'offline') return 'Sin conexión: no se pueden guardar cambios';
    return 'Este perfil es solo lectura';
  }

  function canWriteNow() {
    if (!cloudEnabled()) return canEdit();
    if (!hasWriteRole()) {
      if (window.UI && window.UI.toast) window.UI.toast(readOnlyMessage(), 'error');
      return false;
    }
    if (navigator.onLine === false) {
      if (window.UI && window.UI.toast) window.UI.toast(readOnlyMessage(), 'error');
      return false;
    }
    return true;
  }

  function ensureEditable() {
    if (canWriteNow()) return true;
    if (window.UI && window.UI.toast && !cloudEnabled()) window.UI.toast('Este perfil es solo lectura', 'error');
    return false;
  }

  /* Acciones delicadas: en la nube sólo las puede hacer un administrador. */
  function ensureAdmin(label) {
    if (!cloudEnabled()) return ensureEditable();
    if (!window.Auth || !window.Auth.isAdmin) {
      if (window.UI && window.UI.toast) {
        window.UI.toast('Solo un administrador puede ' + (label || 'hacer esta acción'), 'error');
      }
      return false;
    }
    if (navigator.onLine === false) {
      if (window.UI && window.UI.toast) window.UI.toast(readOnlyMessage(), 'error');
      return false;
    }
    return true;
  }

  /* ---------------- Nube (Supabase) ----------------
     En modo nube el estado en memoria es la fuente para dibujar la interfaz.
     Supabase es la fuente de verdad: cada cambio se envía en segundo plano y,
     si falla, se avisa y se vuelve a cargar lo que hay en el servidor.
     localStorage sólo guarda una copia para poder leer sin conexión. */

  function cloudEnabled() {
    const Auth = window.Auth;
    return !!(Auth && Auth.isEnabled && Auth.user && Auth.church);
  }

  function authClient() {
    return window.Auth ? window.Auth.client : null;
  }

  function activeChurchId() {
    const Auth = window.Auth;
    return Auth && Auth.church ? Auth.church.id : '';
  }

  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-'
      + hex.slice(16, 20) + '-' + hex.slice(20);
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
  }

  /* Los IDs viajan en hrefs y data-*. Si vienen de un respaldo manipulado,
     los regeneramos en vez de confiar en su contenido. */
  const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;
  function safeId(value, prefix) {
    const text = String(value === null || value === undefined ? '' : value);
    return SAFE_ID.test(text) ? text : window.U.uid(prefix || 'id');
  }

  function toInt(value, min, max) {
    const number = Math.round(Number(value) || 0);
    if (number < min) return min;
    if (max !== undefined && number > max) return max;
    return number;
  }

  /* Limpia la lista de links de una canción. Acepta strings sueltos por si
     vienen de un respaldo viejo. Descarta cualquier URL que no sea https://
     y quita duplicados. */
  function normalizeLinks(raw) {
    const list = Array.isArray(raw) ? raw : [];
    const seen = new Set();
    const links = [];
    for (let index = 0; index < list.length && links.length < 20; index += 1) {
      const item = list[index];
      const source = typeof item === 'string' ? { url: item } : item;
      if (!source || typeof source !== 'object') continue;
      const url = String(source.url || '').trim();
      if (!window.U.isSafeHttpsUrl(url)) continue;
      const key = url.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const label = String(source.label || '').trim().slice(0, 40);
      links.push(label ? { url: url, label: label } : { url: url });
    }
    return links;
  }

  function summaryText(value, max) {
    if (value === null || value === undefined || typeof value === 'object') return '';
    return String(value).trim().slice(0, max);
  }

  /* Los grados pueden tener un renglón por sucesión. Se conservan los saltos
     de línea (normalizando CRLF/CR a LF), se descartan solo caracteres de
     control peligrosos y se quitan los espacios sobrantes al final de cada
     línea. Nunca se interpreta HTML: sigue siendo texto plano. */
  function summaryDegreesText(value) {
    if (value === null || value === undefined || typeof value === 'object') return '';
    return String(value)
      .replace(/\r\n?/g, '\n')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/^[ \t\n]+|[ \t\n]+$/g, '')
      .slice(0, SUMMARY_DEGREES_MAX)
      .split('\n')
      .slice(0, SUMMARY_DEGREES_MAX_LINES)
      .map((line) => line.replace(/[ \t]+$/g, ''))
      .join('\n');
  }

  /* Resumen por parte: una lista ordenada de objetos
     { name, phrase, degrees, note }. Se acepta también `customName` por si
     viene de un respaldo donde el nombre libre se guardó aparte. Todo se
     convierte a texto plano (nunca HTML) y se recorta a los límites. Las
     canciones sin resumen quedan con [] y siguen funcionando igual. */
  function normalizeSummary(raw) {
    const list = Array.isArray(raw) ? raw : [];
    const parts = [];
    for (let index = 0; index < list.length && parts.length < SUMMARY_MAX_PARTS; index += 1) {
      const item = list[index];
      if (!item || typeof item !== 'object') continue;
      let name = summaryText(item.name, SUMMARY_NAME_MAX);
      const custom = summaryText(item.customName, SUMMARY_NAME_MAX);
      if ((!name || name === 'Otro') && custom) name = custom;
      const phrase = summaryText(item.phrase, SUMMARY_PHRASE_MAX);
      const degrees = summaryDegreesText(item.degrees);
      const note = summaryText(item.note, SUMMARY_NOTE_MAX);
      if (!name && !phrase && !degrees && !note) continue;
      parts.push({ name: name, phrase: phrase, degrees: degrees, note: note });
    }
    return parts;
  }

  function plainLyrics(content) {
    if (!content || !window.Chords) return '';
    return window.Chords.parseSongContent(content).map((block) => {
      if (block.type === 'pair') return block.lyric || '';
      if (block.type === 'lyric') return block.text || '';
      if (block.type === 'section') return '[' + block.label + ']';
      return '';
    }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function toSongRow(song, churchId) {
    const content = String(song.content || '');
    return {
      id: song.id,
      church_id: churchId,
      title: String(song.title || '').trim().slice(0, 200),
      key: String(song.key || ''),
      lyrics: song.lyrics !== undefined ? String(song.lyrics || '') : plainLyrics(content),
      chords: content,
      notes: String(song.notes || ''),
      author: String(song.author || ''),
      bpm: toInt(song.bpm, 0, 400),
      duration: toInt(song.duration, 0),
      category: String(song.category || ''),
      difficulty: String(song.difficulty || ''),
      tags: Array.isArray(song.tags) ? song.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
      links: normalizeLinks(song.links),
      summary: normalizeSummary(song.summary),
      favorite: !!song.favorite,
    };
  }

  function fromSongRow(row) {
    return {
      id: row.id,
      title: row.title || '',
      author: row.author || '',
      key: row.key || '',
      capo: 0,
      bpm: Number(row.bpm) || 0,
      duration: Number(row.duration) || 0,
      category: row.category || '',
      difficulty: row.difficulty || '',
      tags: Array.isArray(row.tags) ? row.tags.slice() : [],
      links: normalizeLinks(row.links),
      summary: normalizeSummary(row.summary),
      notes: row.notes || '',
      favorite: !!row.favorite,
      content: row.chords || '',
      lyrics: row.lyrics || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
    };
  }

  function normalizeItem(item) {
    const capo = item.capoOverride !== undefined ? item.capoOverride
      : (item.capo_override !== undefined && item.capo_override !== null ? String(item.capo_override) : '');
    return {
      id: item.id || window.U.uid('item'),
      songId: item.songId || item.song_id || '',
      keyOverride: item.keyOverride !== undefined ? item.keyOverride : (item.key_override || ''),
      capoOverride: capo,
      notes: item.notes || '',
      done: !!item.done,
    };
  }

  function toSetlistRow(list, churchId) {
    return {
      id: list.id,
      church_id: churchId,
      name: String(list.name || '').trim().slice(0, 160),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(list.date || '')) ? list.date : window.U.todayISO(),
      notes: String(list.notes || ''),
      service: String(list.service || ''),
      items: (Array.isArray(list.items) ? list.items : []).map((item) => ({
        id: item.id,
        song_id: item.songId || null,
        key_override: item.keyOverride || '',
        capo_override: item.capoOverride === '' || item.capoOverride === null || item.capoOverride === undefined
          ? null
          : toInt(item.capoOverride, 0, 11),
        notes: item.notes || '',
        done: !!item.done,
      })),
    };
  }

  function fromSetlistRow(row) {
    return {
      id: row.id,
      name: row.name || '',
      date: row.date || '',
      service: row.service || '',
      notes: row.notes || '',
      items: (Array.isArray(row.items) ? row.items : []).map(normalizeItem),
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
    };
  }

  function queueOp(key, task) {
    const previous = writeQueues.get(key) || Promise.resolve();
    const next = previous.then(task, task);
    const tracked = next.catch(() => {}).then(() => {
      if (writeQueues.get(key) === tracked) writeQueues.delete(key);
    });
    writeQueues.set(key, tracked);
    return next;
  }

  function writeErrorMessage(error) {
    if (window.Auth && typeof window.Auth.errorText === 'function') {
      return window.Auth.errorText(error);
    }
    return (error && (error.message || error.error_description)) || '';
  }

  function handleWriteError(error, label) {
    console.error('[store] No se pudo guardar ' + (label || 'el cambio'), error);
    const message = writeErrorMessage(error);
    if (window.UI && window.UI.toast) {
      window.UI.toast(message || ('No se pudo guardar ' + (label || 'el cambio') + '.'), 'error');
    }
    if (!navigator.onLine) setOffline(true);
    scheduleResync();
  }

  function setOffline(value) {
    offline = !!value;
    const node = document.getElementById('offlineNote');
    if (node) {
      node.hidden = !offline;
      if (offline) node.textContent = 'Sin conexión · mostrando los últimos datos guardados';
    }
    const storageNote = document.getElementById('storageNote');
    if (storageNote && window.Auth && window.Auth.isEnabled) {
      storageNote.textContent = offline
        ? 'Sin conexión · mostrando datos guardados.'
        : 'Tus datos se sincronizan con tu iglesia.';
    }
  }

  let resyncTimer = 0;
  function scheduleResync() {
    if (resyncTimer) return;
    resyncTimer = window.setTimeout(() => {
      resyncTimer = 0;
      loadCloud({ force: true }).then(() => {
        notify();
        document.dispatchEvent(new CustomEvent('repertorio:refresh'));
      });
    }, 700);
  }

  function writeSong(song) {
    if (!cloudEnabled()) return Promise.resolve();
    const churchId = activeChurchId();
    const row = toSongRow(song, churchId);
    return queueOp('song:' + song.id, async () => {
      const { error } = await authClient().from('songs').upsert(row, { onConflict: 'id' });
      if (error) throw error;
    }).catch((error) => handleWriteError(error, 'la canción'));
  }

  function deleteSongRow(id) {
    if (!cloudEnabled()) return Promise.resolve();
    const churchId = activeChurchId();
    return queueOp('song:' + id, async () => {
      const { error } = await authClient().from('songs').delete().eq('id', id).eq('church_id', churchId);
      if (error) throw error;
    }).catch((error) => handleWriteError(error, 'la canción'));
  }

  function writeSetlist(list) {
    if (!cloudEnabled()) return Promise.resolve();
    const churchId = activeChurchId();
    const row = toSetlistRow(list, churchId);
    return queueOp('setlist:' + list.id, async () => {
      const { error } = await authClient().from('setlists').upsert(row, { onConflict: 'id' });
      if (error) throw error;
    }).catch((error) => handleWriteError(error, 'el repertorio'));
  }

  function deleteSetlistRow(id) {
    if (!cloudEnabled()) return Promise.resolve();
    const churchId = activeChurchId();
    return queueOp('setlist:' + id, async () => {
      const { error } = await authClient().from('setlists').delete().eq('id', id).eq('church_id', churchId);
      if (error) throw error;
    }).catch((error) => handleWriteError(error, 'el repertorio'));
  }

  async function insertRows(table, rows) {
    const chunkSize = 100;
    for (let index = 0; index < rows.length; index += chunkSize) {
      const chunk = rows.slice(index, index + chunkSize);
      const { error } = await authClient().from(table).insert(chunk);
      if (error) throw error;
    }
  }

  function cacheKey(churchId) {
    return CLOUD_CACHE_PREFIX + churchId;
  }

  function sessionKey() {
    const user = window.Auth && window.Auth.user ? window.Auth.user.id : 'anon';
    return user + '|' + activeChurchId();
  }

  function lastSyncKey() {
    const user = window.Auth && window.Auth.user ? window.Auth.user.id : 'anon';
    return LAST_SYNC_PREFIX + user + '.' + activeChurchId();
  }

  function readLastSync() {
    try { return window.localStorage.getItem(lastSyncKey()) || ''; } catch (error) { return ''; }
  }

  function writeLastSync(value) {
    try { window.localStorage.setItem(lastSyncKey(), value); } catch (error) { /* sin almacenamiento */ }
  }

  /* Trae filas en páginas pequeñas sin mostrar paginación al usuario.
     Se detiene al llegar al tope de seguridad y lo informa. */
  async function fetchPaged(table, columns, churchId, options) {
    const opts = options || {};
    const max = opts.max || SYNC_PAGE_SIZE;
    const rows = [];
    let from = 0;
    let truncated = false;

    while (rows.length < max) {
      const to = Math.min(from + SYNC_PAGE_SIZE, max) - 1;
      let query = authClient().from(table).select(columns).eq('church_id', churchId);
      if (opts.since) query = query.gte('updated_at', opts.since);
      if (opts.orderBy) query = query.order(opts.orderBy, { ascending: !!opts.ascending });
      const { data, error } = await query.range(from, to);
      if (error) throw error;
      const chunk = data || [];
      rows.push.apply(rows, chunk);
      if (chunk.length < to - from + 1) break;
      from += chunk.length;
    }
    if (rows.length >= max) truncated = true;
    return { rows: rows, truncated: truncated };
  }

  function notifySyncLimit(truncated) {
    if (!truncated) return;
    const labels = [];
    if (truncated.songs) labels.push('canciones');
    if (truncated.setlists) labels.push('repertorios');
    if (!labels.length) return;
    const message = 'Se cargó una parte de la biblioteca por el límite de seguridad (' + labels.join(' y ') + ').';
    if (window.UI && window.UI.toast) window.UI.toast(message, 'error');
    else console.warn('[store] ' + message);
  }

  function mergeRows(kind, incoming, churchId) {
    const target = kind === 'song' ? state.songs : state.setlists;
    const map = new Map();
    target.forEach((item) => map.set(item.id, item));
    const bulkPending = writeQueues.has('bulk:' + churchId);
    incoming.forEach((item) => {
      if (bulkPending || writeQueues.has(kind + ':' + item.id)) return;
      map.set(item.id, item);
    });
    const merged = Array.from(map.values());
    if (kind === 'song') state.songs = merged;
    else state.setlists = merged;
  }

  function reconcileDeleted(kind, ids, churchId) {
    const valid = new Set(ids.map((row) => row.id));
    const bulkPending = writeQueues.has('bulk:' + churchId);
    const keep = (item) => valid.has(item.id) || bulkPending || writeQueues.has(kind + ':' + item.id);
    if (kind === 'song') state.songs = state.songs.filter(keep);
    else state.setlists = state.setlists.filter(keep);
  }

  function writeCloudCache() {
    if (!cloudEnabled()) return;
    const churchId = activeChurchId();
    try {
      window.localStorage.setItem(cacheKey(churchId), JSON.stringify({
        version: 1,
        churchId: churchId,
        savedAt: new Date().toISOString(),
        songs: state.songs,
        setlists: state.setlists,
      }));
      storageOk = true;
    } catch (error) {
      storageOk = false;
    }
  }

  function readCloudCache(churchId) {
    try {
      const raw = window.localStorage.getItem(cacheKey(churchId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.songs) || !Array.isArray(parsed.setlists)) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function readLocalSettings() {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function writeLocalSettings() {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch (error) {
      storageOk = false;
    }
  }

  /* Al salir, no debe quedar ninguna copia de los datos de la iglesia en el
     dispositivo. Se borran las cachés por iglesia y la iglesia activa, y se
     quita el nombre de iglesia de las preferencias sin perder tema/fuente. */
  function clearStoredChurchData() {
    [window.localStorage, window.sessionStorage].forEach((storage) => {
      try {
        Object.keys(storage).slice().forEach((key) => {
          if (key.indexOf(CLOUD_CACHE_PREFIX) === 0
            || key.indexOf(LAST_SYNC_PREFIX) === 0
            || key.indexOf(CHURCH_KEY) === 0) {
            storage.removeItem(key);
          }
        });
      } catch (error) { /* sin almacenamiento */ }
    });
    try {
      const saved = readLocalSettings();
      if (saved && Object.prototype.hasOwnProperty.call(saved, 'churchName')) {
        delete saved.churchName;
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(saved));
      }
    } catch (error) { /* sin almacenamiento */ }
    loadedSessionKey = '';
  }

  /* El Service Worker sólo guarda archivos estáticos, pero por si entrara
     alguna respuesta de la API en una caché de runtime, la descartamos. */
  function clearRuntimeCache() {
    if (!('serviceWorker' in navigator)) return;
    const message = { type: 'CLEAR_RUNTIME_CACHE' };
    try {
      if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage(message);
    } catch (error) { /* sin controlador */ }
    try {
      if (navigator.serviceWorker.ready && typeof navigator.serviceWorker.ready.then === 'function') {
        navigator.serviceWorker.ready.then((registration) => {
          if (registration && registration.active) registration.active.postMessage(message);
        }).catch(() => {});
      }
    } catch (error) { /* sin service worker */ }
  }

  async function loadCloud(options) {
    if (!cloudEnabled()) return state;
    const opts = options || {};
    const Auth = window.Auth;
    const churchId = activeChurchId();
    const key = sessionKey();

    /* Una vez por usuario + iglesia: navegar no vuelve a pedir la biblioteca.
       Al reconectar o tras un error de escritura se fuerza una recarga. */
    if (!opts.force && loadedSessionKey === key) return state;

    const savedSettings = readLocalSettings();
    if (savedSettings) state.settings = Object.assign({}, state.settings, savedSettings);
    if (Auth.church && Auth.church.name) state.settings.churchName = Auth.church.name;

    const cached = readCloudCache(churchId);
    const since = opts.force ? '' : readLastSync();
    const incremental = !!(since && cached && cached.churchId === churchId);

    applyData({
      songs: cached ? cached.songs : [],
      setlists: cached ? cached.setlists : [],
      settings: state.settings,
    });

    try {
      let songsResult;
      let setlistsResult;
      if (incremental) {
        const results = await Promise.all([
          fetchPaged('songs', SONG_COLUMNS, churchId, {
            since: since, orderBy: 'updated_at', ascending: false, max: MAX_SYNC_SONGS,
          }),
          fetchPaged('setlists', SETLIST_COLUMNS, churchId, {
            since: since, orderBy: 'updated_at', ascending: false, max: MAX_SYNC_SETLISTS,
          }),
          fetchPaged('songs', 'id', churchId, {
            orderBy: 'id', ascending: true, max: MAX_SYNC_SONGS + 1,
          }),
          fetchPaged('setlists', 'id', churchId, {
            orderBy: 'id', ascending: true, max: MAX_SYNC_SETLISTS + 1,
          }),
        ]);
        songsResult = results[0];
        setlistsResult = results[1];
        /* Los ids permiten detectar borrados hechos por otro administrador.
           Si hay más filas que el tope, no eliminamos nada para no perder datos. */
        if (!results[2].truncated) reconcileDeleted('song', results[2].rows, churchId);
        if (!results[3].truncated) reconcileDeleted('setlist', results[3].rows, churchId);
      } else {
        const results = await Promise.all([
          fetchPaged('songs', SONG_COLUMNS, churchId, {
            orderBy: 'updated_at', ascending: false, max: MAX_SYNC_SONGS,
          }),
          fetchPaged('setlists', SETLIST_COLUMNS, churchId, {
            orderBy: 'date', ascending: false, max: MAX_SYNC_SETLISTS,
          }),
        ]);
        songsResult = results[0];
        setlistsResult = results[1];
      }

      mergeRows('song', songsResult.rows.map(fromSongRow), churchId);
      mergeRows('setlist', setlistsResult.rows.map(fromSetlistRow), churchId);
      applyData({ songs: state.songs, setlists: state.setlists, settings: state.settings });
      if (Auth.church && Auth.church.name) state.settings.churchName = Auth.church.name;
      writeCloudCache();
      writeLocalSettings();
      /* Pequeño margen hacia atrás por si el reloj del dispositivo va adelantado. */
      writeLastSync(new Date(Date.now() - SYNC_SKEW_MS).toISOString());
      loadedSessionKey = key;
      setOffline(false);
      notifySyncLimit({
        songs: songsResult.truncated,
        setlists: setlistsResult.truncated,
      });
    } catch (error) {
      console.error('[store] No se pudieron cargar los datos de la iglesia', error);
      if (!cached) {
        applyData({ songs: [], setlists: [], settings: state.settings });
      }
      setOffline(true);
    }

    return state;
  }

  /* ---------------- Importar la biblioteca local la primera vez ---------------- */

  function importAskedKey() {
    const userId = window.Auth && window.Auth.user ? window.Auth.user.id : 'anon';
    return IMPORT_ASKED_PREFIX + userId + '.' + activeChurchId();
  }

  function importAsked() {
    try { return window.localStorage.getItem(importAskedKey()) || ''; } catch (error) { return ''; }
  }

  function markImportAsked(value) {
    try { window.localStorage.setItem(importAskedKey(), value); } catch (error) { /* sin almacenamiento */ }
  }

  function isDemoLibrary(songs) {
    return Array.isArray(songs) && songs.length > 0
      && songs.every((song) => /^song_seed_/.test(String((song && song.id) || '')));
  }

  function localSnapshot() {
    const stored = readProfiles();
    if (stored) {
      const active = stored.profiles.find((profile) => profile.id === stored.activeId) || stored.profiles[0];
      const data = (active && active.data) || {};
      const songs = Array.isArray(data.songs) ? data.songs : [];
      return {
        name: (active && active.name) || 'Mi iglesia',
        songs: songs,
        setlists: Array.isArray(data.setlists) ? data.setlists : [],
        demo: isDemoLibrary(songs),
      };
    }
    const legacy = readStorage();
    if (legacy && Array.isArray(legacy.songs)) {
      return {
        name: (legacy.settings && legacy.settings.churchName) || 'Mi iglesia',
        songs: legacy.songs,
        setlists: Array.isArray(legacy.setlists) ? legacy.setlists : [],
        demo: isDemoLibrary(legacy.songs),
      };
    }
    return null;
  }

  function pendingImport() {
    if (!cloudEnabled() || !window.Auth.isAdmin) return null;
    if (state.songs.length || state.setlists.length) return null;
    if (importAsked()) return null;
    const snapshot = localSnapshot();
    if (!snapshot || snapshot.demo) return null;
    if (!snapshot.songs.length && !snapshot.setlists.length) return null;
    return snapshot;
  }

  function prepareLocalSongs(rawSongs) {
    const map = new Map();
    const songs = [];
    (rawSongs || []).forEach((raw) => {
      if (!raw) return;
      const title = String(raw.title || '').trim();
      if (!title) return;
      const song = {
        id: uuid(),
        title: title,
        author: raw.author || '',
        key: raw.key || '',
        capo: toInt(raw.capo, 0, 11),
        bpm: toInt(raw.bpm, 0, 400),
        duration: toInt(raw.duration, 0),
        category: raw.category || '',
        difficulty: raw.difficulty || '',
        tags: Array.isArray(raw.tags) ? raw.tags.slice() : [],
        links: normalizeLinks(raw.links),
        summary: normalizeSummary(raw.summary),
        notes: raw.notes || '',
        favorite: !!raw.favorite,
        content: raw.content || '',
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (raw.id) map.set(raw.id, song.id);
      songs.push(song);
    });
    return { songs: songs, map: map };
  }

  function prepareLocalSetlists(rawSetlists, songIdMap) {
    return (rawSetlists || []).filter(Boolean).map((raw) => {
      const items = (Array.isArray(raw.items) ? raw.items : []).map((item) => {
        const oldSongId = item.songId || item.song_id || '';
        const songId = songIdMap.get(oldSongId) || (isUuid(oldSongId) ? oldSongId : '');
        if (!songId) return null;
        return {
          id: item.id || window.U.uid('item'),
          songId: songId,
          keyOverride: item.keyOverride !== undefined ? item.keyOverride : (item.key_override || ''),
          capoOverride: item.capoOverride !== undefined && item.capoOverride !== null
            ? String(item.capoOverride)
            : (item.capo_override === undefined || item.capo_override === null ? '' : String(item.capo_override)),
          notes: item.notes || '',
          done: !!item.done,
        };
      }).filter(Boolean);
      return {
        id: uuid(),
        name: String(raw.name || 'Repertorio').trim().slice(0, 160) || 'Repertorio',
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.date || '')) ? raw.date : window.U.todayISO(),
        service: raw.service || '',
        notes: raw.notes || '',
        items: items,
      };
    });
  }

  async function importLocal() {
    if (!cloudEnabled() || !window.Auth.isAdmin) return { songs: 0, setlists: 0 };
    const snapshot = pendingImport();
    if (!snapshot) return { songs: 0, setlists: 0 };

    const prepared = prepareLocalSongs(snapshot.songs);
    const setlists = prepareLocalSetlists(snapshot.setlists, prepared.map);
    const churchId = activeChurchId();

    state.songs = prepared.songs.concat(state.songs);
    state.setlists = setlists.concat(state.setlists);
    writeCloudCache();
    notify();

    try {
      await insertRows('songs', prepared.songs.map((song) => toSongRow(song, churchId)));
      await insertRows('setlists', setlists.map((list) => toSetlistRow(list, churchId)));
      markImportAsked('done');
      await loadCloud({ force: true });
      notify();
      return { songs: prepared.songs.length, setlists: setlists.length };
    } catch (error) {
      handleWriteError(error, 'la importación');
      return { songs: 0, setlists: 0, error: writeErrorMessage(error) };
    }
  }

  function skipImport() {
    markImportAsked('skipped');
  }

  function readStorage() {
    try {
      const raw = window.localStorage.getItem(DB_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      storageOk = false;
      return null;
    }
  }

  function readProfiles() {
    try {
      const raw = window.localStorage.getItem(PROFILES_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.profiles) || !parsed.profiles.length) return null;
      return parsed;
    } catch (error) {
      storageOk = false;
      return null;
    }
  }

  function normalizeProfile(raw) {
    const data = raw && raw.data ? raw.data : {};
    const now = new Date().toISOString();
    return {
      id: safeId(raw && raw.id, 'profile'),
      name: (raw && raw.name) || (data.settings && data.settings.churchName) || 'Mi iglesia',
      createdAt: (raw && raw.createdAt) || now,
      updatedAt: (raw && raw.updatedAt) || now,
      readOnly: !!(raw && raw.readOnly),
      sharedBy: (raw && raw.sharedBy) || '',
      sourceId: (raw && raw.sourceId) || '',
      data: {
        songs: Array.isArray(data.songs) ? data.songs : [],
        setlists: Array.isArray(data.setlists) ? data.setlists : [],
        settings: Object.assign({}, DEFAULT_SETTINGS, data.settings || {}),
      },
    };
  }

  function activateProfile(profile) {
    if (!profile) return;
    activeProfileId = profile.id;
    applyData(profile.data || {});
    profile.data = { songs: state.songs, setlists: state.setlists, settings: state.settings };
  }

  function writeProfiles() {
    window.localStorage.setItem(PROFILES_KEY, JSON.stringify({
      app: 'repertorio-perfiles',
      version: 1,
      activeId: activeProfileId,
      profiles: profiles,
    }));
  }

  function persist() {
    if (cloudEnabled()) {
      writeLocalSettings();
      writeCloudCache();
      return;
    }
    const profile = activeProfile();
    if (profile) {
      profile.data = { songs: state.songs, setlists: state.setlists, settings: state.settings };
      profile.updatedAt = new Date().toISOString();
    }
    try {
      window.localStorage.setItem(DB_KEY, JSON.stringify({
        app: 'repertorio',
        version: 1,
        savedAt: new Date().toISOString(),
        songs: state.songs,
        setlists: state.setlists,
        settings: state.settings,
      }));
      writeProfiles();
      storageOk = true;
    } catch (error) {
      storageOk = false;
      if (window.UI && window.UI.toast) {
        window.UI.toast('No se pudo guardar: almacenamiento lleno o bloqueado', 'error');
      }
    }
  }

  function applyData(data) {
    state.songs = Array.isArray(data.songs) ? data.songs : [];
    state.setlists = Array.isArray(data.setlists) ? data.setlists : [];
    state.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings || {});

    const songIdMap = new Map();
    state.songs.forEach((song) => {
      const previousId = song.id;
      song.id = safeId(song.id, 'song');
      if (previousId && String(previousId) !== song.id) songIdMap.set(String(previousId), song.id);
      song.tags = Array.isArray(song.tags) ? song.tags : [];
      song.links = normalizeLinks(song.links);
      song.summary = normalizeSummary(song.summary);
      song.favorite = !!song.favorite;
      /* Respaldos de versiones anteriores pueden traer estos contadores:
         se ignoran para que no vuelvan a guardarse ni exportarse. */
      delete song.playCount;
      delete song.lastPlayed;
      song.capo = Number(song.capo) || 0;
      song.bpm = Number(song.bpm) || 0;
      song.duration = Number(song.duration) || 0;
      if (!song.content) song.content = '';
    });
    state.setlists.forEach((list) => {
      list.id = safeId(list.id, 'setlist');
      list.items = Array.isArray(list.items) ? list.items : [];
      list.items.forEach((item) => {
        item.id = safeId(item.id, 'item');
        const rawSongId = String(item.songId === null || item.songId === undefined ? '' : item.songId);
        if (songIdMap.has(rawSongId)) item.songId = songIdMap.get(rawSongId);
        else item.songId = SAFE_ID.test(rawSongId) ? rawSongId : '';
        item.done = !!item.done;
      });
    });
  }

  function load() {
    const stored = readProfiles();
    if (stored) {
      profiles = stored.profiles.map(normalizeProfile);
      const requested = profiles.find((profile) => profile.id === stored.activeId);
      activateProfile(requested || profiles[0]);
      persist();
      return state;
    }

    const legacy = readStorage();
    const data = legacy && Array.isArray(legacy.songs) ? legacy : seed();
    const now = new Date().toISOString();
    const name = (data.settings && data.settings.churchName) || 'Mi iglesia';
    profiles = [normalizeProfile({
      id: window.U.uid('profile'),
      name: name,
      createdAt: now,
      updatedAt: now,
      readOnly: false,
      data: data,
    })];
    activeProfileId = profiles[0].id;
    activateProfile(profiles[0]);
    persist();
    return state;
  }

  function notify() {
    listeners.forEach((fn) => {
      try { fn(state); } catch (error) { console.error(error); }
    });
  }

  function commit() {
    persist();
    notify();
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    };
  }

  function clearSession() {
    if (!window.Auth || !window.Auth.isEnabled) return;
    state.songs = [];
    state.setlists = [];
    state.settings = Object.assign({}, state.settings, { churchName: DEFAULT_SETTINGS.churchName });
    clearStoredChurchData();
    notify();
    clearRuntimeCache();
  }

  window.addEventListener('offline', () => {
    if (cloudEnabled()) setOffline(true);
  });

  window.addEventListener('online', () => {
    if (!cloudEnabled()) return;
    setOffline(false);
    if (window.UI && window.UI.toast) window.UI.toast('Conexión restablecida');
    loadCloud({ force: true }).then(() => {
      notify();
      document.dispatchEvent(new CustomEvent('repertorio:refresh'));
    });
  });

  /* ---------- Canciones ---------- */

  function getSong(id) {
    return state.songs.find((song) => song.id === id) || null;
  }

  function saveSong(payload) {
    if (!ensureEditable()) return null;
    const timestamp = new Date().toISOString();
    let song;
    if (payload.id && getSong(payload.id)) {
      song = getSong(payload.id);
      Object.keys(payload).forEach((key) => {
        if (payload[key] !== undefined) song[key] = payload[key];
      });
      song.updatedAt = timestamp;
    } else {
      song = Object.assign({
        capo: 0,
        favorite: false,
        notes: '',
        tags: [],
        createdAt: timestamp,
      }, payload);
      song.id = cloudEnabled() ? uuid() : window.U.uid('song');
      song.updatedAt = timestamp;
      state.songs.unshift(song);
    }
    song.tags = Array.isArray(song.tags) ? song.tags : [];
    song.links = normalizeLinks(song.links);
    song.summary = normalizeSummary(song.summary);
    delete song.playCount;
    delete song.lastPlayed;
    song.capo = Number(song.capo) || 0;
    song.bpm = Number(song.bpm) || 0;
    song.duration = Number(song.duration) || 0;
    commit();
    writeSong(song);
    return song;
  }

  function deleteSong(id) {
    if (!ensureAdmin('borrar canciones')) return false;
    const affected = [];
    state.songs = state.songs.filter((song) => song.id !== id);
    state.setlists.forEach((list) => {
      const before = list.items.length;
      list.items = list.items.filter((item) => item.songId !== id);
      if (list.items.length !== before) {
        list.updatedAt = new Date().toISOString();
        affected.push(list);
      }
    });
    commit();
    if (cloudEnabled()) {
      deleteSongRow(id);
      affected.forEach((list) => writeSetlist(list));
    }
  }

  function toggleFavorite(id) {
    if (!ensureEditable()) return;
    const song = getSong(id);
    if (!song) return;
    song.favorite = !song.favorite;
    song.updatedAt = new Date().toISOString();
    commit();
    writeSong(song);
    return song.favorite;
  }

  /* ---------- Repertorios ---------- */

  function getSetlist(id) {
    return state.setlists.find((list) => list.id === id) || null;
  }

  function saveSetlist(payload) {
    if (!ensureEditable()) return null;
    const timestamp = new Date().toISOString();
    let list;
    if (payload.id && getSetlist(payload.id)) {
      list = getSetlist(payload.id);
      Object.keys(payload).forEach((key) => {
        if (payload[key] !== undefined) list[key] = payload[key];
      });
      list.updatedAt = timestamp;
    } else {
      list = Object.assign({
        name: 'Nuevo repertorio',
        date: window.U.todayISO(),
        service: 'Culto dominical',
        notes: '',
        items: [],
      }, payload);
      list.id = cloudEnabled() ? uuid() : window.U.uid('setlist');
      list.createdAt = timestamp;
      list.updatedAt = timestamp;
      state.setlists.unshift(list);
    }
    commit();
    writeSetlist(list);
    return list;
  }

  function deleteSetlist(id) {
    if (!ensureAdmin('borrar repertorios')) return false;
    state.setlists = state.setlists.filter((list) => list.id !== id);
    commit();
    deleteSetlistRow(id);
  }

  function duplicateSetlist(id) {
    if (!ensureEditable()) return null;
    const original = getSetlist(id);
    if (!original) return null;
    const copy = {
      id: cloudEnabled() ? uuid() : window.U.uid('setlist'),
      name: original.name + ' (copia)',
      date: original.date,
      service: original.service,
      notes: original.notes,
      items: original.items.map((item) => Object.assign({}, item, { id: window.U.uid('item'), done: false })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.setlists.unshift(copy);
    commit();
    writeSetlist(copy);
    return copy;
  }

  function addSongToSetlist(setlistId, songId) {
    if (!ensureEditable()) return false;
    const list = getSetlist(setlistId);
    if (!list) return null;
    const item = {
      id: window.U.uid('item'),
      songId,
      keyOverride: '',
      capoOverride: '',
      notes: '',
      done: false,
    };
    list.items.push(item);
    list.updatedAt = new Date().toISOString();
    commit();
    writeSetlist(list);
    return item;
  }

  function updateSetlistItem(setlistId, itemId, patch) {
    if (!ensureEditable()) return false;
    const list = getSetlist(setlistId);
    if (!list) return;
    const item = list.items.find((entry) => entry.id === itemId);
    if (!item) return;
    Object.assign(item, patch);
    list.updatedAt = new Date().toISOString();
    commit();
    writeSetlist(list);
    return item;
  }

  function removeSetlistItem(setlistId, itemId) {
    if (!ensureEditable()) return false;
    const list = getSetlist(setlistId);
    if (!list) return;
    list.items = list.items.filter((item) => item.id !== itemId);
    list.updatedAt = new Date().toISOString();
    commit();
    writeSetlist(list);
  }

  function moveSetlistItem(setlistId, itemId, direction) {
    if (!ensureEditable()) return false;
    const list = getSetlist(setlistId);
    if (!list) return;
    const index = list.items.findIndex((item) => item.id === itemId);
    if (index === -1) return;
    const target = index + direction;
    if (target < 0 || target >= list.items.length) return;
    const items = list.items;
    const temp = items[index];
    items[index] = items[target];
    items[target] = temp;
    list.updatedAt = new Date().toISOString();
    commit();
    writeSetlist(list);
  }

  function setlistSongs(list) {
    return list.items
      .map((item) => ({ item, song: getSong(item.songId) }))
      .filter((entry) => entry.song);
  }

  function setlistDuration(list) {
    return setlistSongs(list).reduce((total, entry) => total + (Number(entry.song.duration) || 0), 0);
  }

  /* ---------- Ajustes ---------- */

  function setSetting(key, value) {
    if (cloudEnabled()) {
      // En modo nube, la apariencia y preferencias se guardan sólo en este dispositivo.
      state.settings[key] = value;
      writeLocalSettings();
      notify();
      return;
    }
    // Apariencia es preferencia del dispositivo: se permite aun en perfiles de solo lectura.
    const localOnly = key === 'theme' || key === 'fontSize' || key === 'showChords';
    if (!localOnly && !ensureEditable()) return;
    state.settings[key] = value;
    if (key === 'churchName') {
      const profile = activeProfile();
      const clean = String(value || '').trim();
      if (profile && clean) profile.name = clean;
    }
    persist();
    notify();
  }

  function setSettings(patch) {
    if (cloudEnabled()) {
      Object.assign(state.settings, patch || {});
      writeLocalSettings();
      notify();
      return;
    }
    if (!ensureEditable()) return;
    Object.assign(state.settings, patch);
    if (patch && patch.churchName) {
      const profile = activeProfile();
      const clean = String(patch.churchName || '').trim();
      if (profile && clean) profile.name = clean;
    }
    persist();
    notify();
  }

  /* ---------- Perfiles de iglesia ---------- */

  function profileSummaries() {
    return profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      readOnly: !!profile.readOnly,
      sharedBy: profile.sharedBy || '',
      active: profile.id === activeProfileId,
      songs: profile.data && Array.isArray(profile.data.songs) ? profile.data.songs.length : 0,
      setlists: profile.data && Array.isArray(profile.data.setlists) ? profile.data.setlists.length : 0,
      updatedAt: profile.updatedAt,
    }));
  }

  function switchProfile(id) {
    if (id === activeProfileId) return true;
    const target = profileById(id);
    if (!target) return false;
    persist();
    activateProfile(target);
    commit();
    return true;
  }

  function createProfile(name) {
    if (!profiles.length) return null;
    const clean = String(name || '').trim() || 'Nueva iglesia';
    const now = new Date().toISOString();
    persist();
    const profile = normalizeProfile({
      id: window.U.uid('profile'),
      name: clean,
      createdAt: now,
      updatedAt: now,
      readOnly: false,
      data: {
        songs: [],
        setlists: [],
        settings: Object.assign({}, DEFAULT_SETTINGS, { churchName: clean }),
      },
    });
    profiles.push(profile);
    activateProfile(profile);
    commit();
    return profile.id;
  }

  function renameProfile(name) {
    if (!ensureEditable()) return false;
    const profile = activeProfile();
    const clean = String(name || '').trim();
    if (!profile || !clean) return false;
    profile.name = clean;
    state.settings.churchName = clean;
    commit();
    return true;
  }

  function deleteProfile(id) {
    const index = profiles.findIndex((profile) => profile.id === id);
    if (index === -1 || profiles.length <= 1) return false;
    const wasActive = activeProfileId === id;
    profiles.splice(index, 1);
    if (wasActive) activateProfile(profiles[Math.min(index, profiles.length - 1)]);
    commit();
    return true;
  }

  /* Los respaldos nuevos no incluyen contadores de reproducción. Si el
     archivo viene de una versión anterior, esos campos se descartan. */
  function songForBackup(song) {
    const clean = Object.assign({}, song);
    delete clean.playCount;
    delete clean.lastPlayed;
    return clean;
  }

  function exportProfile() {
    if (cloudEnabled()) {
      const church = window.Auth.church;
      return JSON.stringify({
        app: 'repertorio',
        version: 1,
        kind: 'church-profile',
        exportedAt: new Date().toISOString(),
        profileId: church ? church.id : '',
        profileName: church ? church.name : '',
        sharedBy: church ? church.name : '',
        songs: state.songs.map(songForBackup),
        setlists: state.setlists,
        settings: state.settings,
      }, null, 2);
    }
    const profile = activeProfile();
    return JSON.stringify({
      app: 'repertorio',
      version: 1,
      kind: 'church-profile',
      exportedAt: new Date().toISOString(),
      profileId: profile ? (profile.sourceId || profile.id) : '',
      profileName: profile ? profile.name : '',
      sharedBy: profile ? (profile.sharedBy || profile.name) : '',
      songs: state.songs.map(songForBackup),
      setlists: state.setlists,
      settings: state.settings,
    }, null, 2);
  }

  function importProfile(data) {
    if (!data || !Array.isArray(data.songs)) throw new Error('El archivo no contiene un perfil válido.');
    const sourceId = String(data.profileId || '');
    const name = String(data.profileName || (data.settings && data.settings.churchName) || 'Perfil compartido').trim() || 'Perfil compartido';
    const sharedBy = String(data.sharedBy || '').trim();
    const now = new Date().toISOString();
    const profileData = {
      songs: data.songs,
      setlists: Array.isArray(data.setlists) ? data.setlists : [],
      settings: Object.assign({}, data.settings || {}, { churchName: name }),
    };

    const existing = sourceId ? profiles.find((profile) => profile.sourceId === sourceId) : null;
    if (existing) {
      existing.name = name;
      existing.sharedBy = sharedBy;
      existing.updatedAt = now;
      existing.data = profileData;
      activateProfile(existing);
      commit();
      return existing.id;
    }

    const profile = normalizeProfile({
      id: window.U.uid('profile'),
      name: name,
      createdAt: now,
      updatedAt: now,
      readOnly: true,
      sharedBy: sharedBy,
      sourceId: sourceId,
      data: profileData,
    });
    profiles.push(profile);
    activateProfile(profile);
    commit();
    return profile.id;
  }

  /* ---------- Utilidades de datos ---------- */

  function allTags() {
    const map = new Map();
    state.songs.forEach((song) => {
      (song.tags || []).forEach((tag) => {
        const clean = String(tag).trim();
        if (!clean) return;
        map.set(clean, (map.get(clean) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
      .map(([tag, count]) => ({ tag, count }));
  }

  function allAuthors() {
    const set = new Set();
    state.songs.forEach((song) => {
      if (song.author) set.add(song.author.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }

  function allServices() {
    const set = new Set(['Culto dominical', 'Ensayo', 'Culto especial', 'Reunión de jóvenes', 'Vigilia', 'Boda']);
    state.setlists.forEach((list) => {
      if (list.service) set.add(list.service);
    });
    return Array.from(set);
  }

  function stats() {
    const totalSeconds = state.songs.reduce((total, song) => total + (Number(song.duration) || 0), 0);
    const upcoming = state.setlists
      .filter((list) => list.date && list.date >= window.U.todayISO())
      .sort((a, b) => a.date.localeCompare(b.date));
    return {
      songs: state.songs.length,
      setlists: state.setlists.length,
      tags: allTags().length,
      totalSeconds,
      upcoming: upcoming[0] || null,
      favorites: state.songs.filter((song) => song.favorite).length,
    };
  }

  /* ---------- Importar / exportar ---------- */

  function importDataCloud(data, mode) {
    if (!window.Auth.isAdmin) throw new Error('Solo los administradores pueden importar datos.');
    const churchId = activeChurchId();
    const prepared = prepareLocalSongs(data.songs);
    const setlists = prepareLocalSetlists(Array.isArray(data.setlists) ? data.setlists : [], prepared.map);
    const replace = mode === 'replace';

    if (replace) {
      state.songs = [];
      state.setlists = [];
    }
    state.songs = prepared.songs.concat(state.songs);
    state.setlists = setlists.concat(state.setlists);
    commit();

    queueOp('bulk:' + churchId, async () => {
      if (replace) {
        const songsDelete = await authClient().from('songs').delete().eq('church_id', churchId);
        if (songsDelete.error) throw songsDelete.error;
        const listsDelete = await authClient().from('setlists').delete().eq('church_id', churchId);
        if (listsDelete.error) throw listsDelete.error;
      }
      await insertRows('songs', prepared.songs.map((song) => toSongRow(song, churchId)));
      await insertRows('setlists', setlists.map((list) => toSetlistRow(list, churchId)));
    }).catch((error) => handleWriteError(error, 'la importación'));

    return { songs: prepared.songs.length, setlists: setlists.length };
  }

  function exportData() {
    return JSON.stringify({
      app: 'repertorio',
      version: 1,
      exportedAt: new Date().toISOString(),
      songs: state.songs.map(songForBackup),
      setlists: state.setlists,
      settings: state.settings,
    }, null, 2);
  }

  function importData(data, mode) {
    if (!data || !Array.isArray(data.songs)) throw new Error('El archivo no contiene canciones válidas.');
    if (cloudEnabled()) return importDataCloud(data, mode);
    if (!ensureEditable()) return false;
    if (mode === 'replace') {
      applyData({
        songs: data.songs,
        setlists: Array.isArray(data.setlists) ? data.setlists : [],
        settings: data.settings || state.settings,
      });
    } else {
      const existing = new Set(state.songs.map((song) => song.id));
      const idMap = new Map();
      data.songs.forEach((song) => {
        if (!song.id || existing.has(song.id)) {
          const previousId = song.id;
          song.id = window.U.uid('song');
          if (previousId) idMap.set(previousId, song.id);
        }
        existing.add(song.id);
        state.songs.push(song);
      });
      if (Array.isArray(data.setlists)) {
        const listIds = new Set(state.setlists.map((list) => list.id));
        data.setlists.forEach((list) => {
          if (!list.id || listIds.has(list.id)) list.id = window.U.uid('setlist');
          listIds.add(list.id);
          (list.items || []).forEach((item) => {
            if (!item.id) item.id = window.U.uid('item');
            if (item.songId && idMap.has(item.songId)) item.songId = idMap.get(item.songId);
          });
          state.setlists.push(list);
        });
      }
    }
    applyData({ songs: state.songs, setlists: state.setlists, settings: state.settings });
    commit();
    return { songs: data.songs.length, setlists: (data.setlists || []).length };
  }

  function restoreDemo() {
    if (!ensureAdmin('restaurar los datos de ejemplo')) return false;
    if (cloudEnabled()) {
      importDataCloud(seed(), 'replace');
      return true;
    }
    applyData(seed());
    commit();
    return true;
  }

  function clearAll() {
    if (!ensureAdmin('borrar todos los datos')) return false;
    if (cloudEnabled()) {
      const churchId = activeChurchId();
      state.songs = [];
      state.setlists = [];
      commit();
      queueOp('bulk:' + churchId, async () => {
        const songsDelete = await authClient().from('songs').delete().eq('church_id', churchId);
        if (songsDelete.error) throw songsDelete.error;
        const listsDelete = await authClient().from('setlists').delete().eq('church_id', churchId);
        if (listsDelete.error) throw listsDelete.error;
      }).catch((error) => handleWriteError(error, 'el borrado'));
      return true;
    }
    applyData({ songs: [], setlists: [], settings: state.settings });
    commit();
    return true;
  }

  window.Store = {
    CATEGORIES,
    state,
    load, loadCloud, subscribe, clearSession,
    pendingImport, importLocal, skipImport,
    getSong, saveSong, deleteSong, toggleFavorite,
    getSetlist, saveSetlist, deleteSetlist, duplicateSetlist,
    addSongToSetlist, updateSetlistItem, removeSetlistItem, moveSetlistItem,
    setlistSongs, setlistDuration,
    setSetting, setSettings,
    allTags, allAuthors, allServices, stats,
    exportData, importData, restoreDemo, clearAll,
    profileSummaries, switchProfile, createProfile, renameProfile, deleteProfile,
    exportProfile, importProfile,
    get canEdit() { return canEdit(); },
    get canDelete() { return canDelete(); },
    get readOnlyReason() { return readOnlyReason(); },
    get readOnlyMessage() { return readOnlyMessage(); },
    get isCloud() { return cloudEnabled(); },
    get offline() { return offline; },
    get activeProfile() {
      const profile = activeProfile();
      return profile ? {
        id: profile.id,
        name: profile.name,
        readOnly: !!profile.readOnly,
        sharedBy: profile.sharedBy || '',
      } : null;
    },
    get storageOk() { return storageOk; },
  };
})();
