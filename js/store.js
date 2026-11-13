/* Almacenamiento local y datos de ejemplo */
(function () {
  'use strict';

  const DB_KEY = 'repertorio.v1';
  const PROFILES_KEY = 'repertorio.profiles.v1';
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
      createdAt: now,
      updatedAt: now,
      lastPlayed: '',
      playCount: index === 0 ? 3 : 0,
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

  function profileById(id) {
    return profiles.find((profile) => profile.id === id) || null;
  }

  function activeProfile() {
    return profileById(activeProfileId) || profiles[0] || null;
  }

  function canEdit() {
    const profile = activeProfile();
    return !profile || !profile.readOnly;
  }

  function ensureEditable() {
    if (canEdit()) return true;
    if (window.UI && window.UI.toast) window.UI.toast('Este perfil es solo lectura', 'error');
    return false;
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
      id: raw && raw.id ? raw.id : window.U.uid('profile'),
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
    state.songs.forEach((song) => {
      song.tags = Array.isArray(song.tags) ? song.tags : [];
      song.favorite = !!song.favorite;
      song.playCount = Number(song.playCount) || 0;
      song.capo = Number(song.capo) || 0;
      song.bpm = Number(song.bpm) || 0;
      song.duration = Number(song.duration) || 0;
      if (!song.id) song.id = window.U.uid('song');
      if (!song.content) song.content = '';
    });
    state.setlists.forEach((list) => {
      list.items = Array.isArray(list.items) ? list.items : [];
      list.items.forEach((item) => {
        if (!item.id) item.id = window.U.uid('item');
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
        playCount: 0,
        lastPlayed: '',
        createdAt: timestamp,
      }, payload);
      song.id = window.U.uid('song');
      song.updatedAt = timestamp;
      state.songs.unshift(song);
    }
    song.tags = Array.isArray(song.tags) ? song.tags : [];
    song.capo = Number(song.capo) || 0;
    song.bpm = Number(song.bpm) || 0;
    song.duration = Number(song.duration) || 0;
    commit();
    return song;
  }

  function deleteSong(id) {
    if (!ensureEditable()) return false;
    state.songs = state.songs.filter((song) => song.id !== id);
    state.setlists.forEach((list) => {
      list.items = list.items.filter((item) => item.songId !== id);
    });
    commit();
  }

  function toggleFavorite(id) {
    if (!ensureEditable()) return;
    const song = getSong(id);
    if (!song) return;
    song.favorite = !song.favorite;
    song.updatedAt = new Date().toISOString();
    commit();
    return song.favorite;
  }

  function touchSong(id) {
    if (!canEdit()) return;
    const song = getSong(id);
    if (!song) return;
    song.playCount = (Number(song.playCount) || 0) + 1;
    song.lastPlayed = new Date().toISOString();
    persist();
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
      list.id = window.U.uid('setlist');
      list.createdAt = timestamp;
      list.updatedAt = timestamp;
      state.setlists.unshift(list);
    }
    commit();
    return list;
  }

  function deleteSetlist(id) {
    if (!ensureEditable()) return false;
    state.setlists = state.setlists.filter((list) => list.id !== id);
    commit();
  }

  function duplicateSetlist(id) {
    if (!ensureEditable()) return null;
    const original = getSetlist(id);
    if (!original) return null;
    const copy = {
      id: window.U.uid('setlist'),
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
    return item;
  }

  function removeSetlistItem(setlistId, itemId) {
    if (!ensureEditable()) return false;
    const list = getSetlist(setlistId);
    if (!list) return;
    list.items = list.items.filter((item) => item.id !== itemId);
    list.updatedAt = new Date().toISOString();
    commit();
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

  function exportProfile() {
    const profile = activeProfile();
    return JSON.stringify({
      app: 'repertorio',
      version: 1,
      kind: 'church-profile',
      exportedAt: new Date().toISOString(),
      profileId: profile ? (profile.sourceId || profile.id) : '',
      profileName: profile ? profile.name : '',
      sharedBy: profile ? (profile.sharedBy || profile.name) : '',
      songs: state.songs,
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

  function exportData() {
    return JSON.stringify({
      app: 'repertorio',
      version: 1,
      exportedAt: new Date().toISOString(),
      songs: state.songs,
      setlists: state.setlists,
      settings: state.settings,
    }, null, 2);
  }

  function importData(data, mode) {
    if (!ensureEditable()) return false;
    if (!data || !Array.isArray(data.songs)) throw new Error('El archivo no contiene canciones válidas.');
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
    state.songs.forEach((song) => {
      song.tags = Array.isArray(song.tags) ? song.tags : [];
      if (!song.content) song.content = '';
    });
    commit();
    return { songs: data.songs.length, setlists: (data.setlists || []).length };
  }

  function restoreDemo() {
    if (!ensureEditable()) return false;
    applyData(seed());
    commit();
    return true;
  }

  function clearAll() {
    if (!ensureEditable()) return false;
    applyData({ songs: [], setlists: [], settings: state.settings });
    commit();
    return true;
  }

  window.Store = {
    CATEGORIES,
    state,
    load, subscribe,
    getSong, saveSong, deleteSong, toggleFavorite, touchSong,
    getSetlist, saveSetlist, deleteSetlist, duplicateSetlist,
    addSongToSetlist, updateSetlistItem, removeSetlistItem, moveSetlistItem,
    setlistSongs, setlistDuration,
    setSetting, setSettings,
    allTags, allAuthors, allServices, stats,
    exportData, importData, restoreDemo, clearAll,
    profileSummaries, switchProfile, createProfile, renameProfile, deleteProfile,
    exportProfile, importProfile,
    get canEdit() { return canEdit(); },
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
