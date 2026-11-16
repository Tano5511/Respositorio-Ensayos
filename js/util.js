/* Utilidades generales */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, (c) => ESC_MAP[c]);
  }

  function el(tag, attrs, html) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((key) => {
        const value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value === true ? '' : value);
      });
    }
    if (html !== undefined && html !== null) node.innerHTML = html;
    return node;
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function debounce(fn, wait) {
    let timer = null;
    return function debounced() {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(null, args), wait || 200);
    };
  }

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function fmtDuration(totalSeconds) {
    const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    return m + ':' + String(sec).padStart(2, '0');
  }

  function fmtDurationLong(totalSeconds) {
    const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    if (h > 0) return h + ' h ' + m + ' min';
    return m + ' min';
  }

  function parseDurationInput(value) {
    const text = String(value || '').trim();
    if (!text) return 0;
    if (/^\d+$/.test(text)) return parseInt(text, 10) * 60; // "4" => 4 minutos
    const parts = text.split(':').map((p) => parseInt(p, 10) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  }

  function todayISO() {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tz).toISOString().slice(0, 10);
  }

  function parseISODate(iso) {
    if (!iso) return null;
    const [y, m, d] = String(iso).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  function fmtDate(iso, opts) {
    const date = parseISODate(iso);
    if (!date) return 'Sin fecha';
    return date.toLocaleDateString('es-ES', opts || { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function fmtDateLong(iso) {
    return fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function weekdayShort(iso) {
    const date = parseISODate(iso);
    return date ? date.toLocaleDateString('es-ES', { weekday: 'long' }) : '';
  }

  function monthShort(iso) {
    const date = parseISODate(iso);
    return date ? date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '') : '';
  }

  function relativeDate(iso) {
    const date = parseISODate(iso);
    if (!date) return '';
    const today = parseISODate(todayISO());
    const diff = Math.round((date - today) / 86400000);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Mañana';
    if (diff === -1) return 'Ayer';
    if (diff > 1 && diff < 7) return 'En ' + diff + ' días';
    if (diff < -1 && diff > -7) return 'Hace ' + Math.abs(diff) + ' días';
    return '';
  }

  function download(filename, text, type) {
    const blob = new Blob([text], { type: type || 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function plural(n, singular, pluralWord) {
    return n === 1 ? singular : pluralWord || singular + 's';
  }

  const ROLE_LABELS = { admin: 'Administrador', editor: 'Editor', musico: 'Músico' };

  function roleLabel(role) {
    return ROLE_LABELS[role] || ROLE_LABELS.musico;
  }

  /* Dirección pública de la app, sin hash ni parámetros.
     En GitHub Pages queda por ejemplo https://usuario.github.io/Respositorio-Ensayos/ */
  function appUrl() {
    try {
      const url = new URL(window.location.href);
      url.hash = '';
      url.search = '';
      url.pathname = url.pathname.replace(/index\.html$/i, '');
      return url.toString();
    } catch (error) {
      return String(window.location.href || '').split('#')[0].split('?')[0];
    }
  }

  function legacyCopy(value) {
    try {
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch (error) {
      return false;
    }
  }

  function copyText(text) {
    const value = String(text || '');
    if (!value) return Promise.resolve(false);
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value).then(
        () => true,
        () => legacyCopy(value)
      );
    }
    return Promise.resolve(legacyCopy(value));
  }

  /* Comparte con el menú del sistema (celular) y, si no está disponible,
     copia el texto al portapapeles. Devuelve shared | copied | cancelled | failed. */
  async function shareText(options) {
    const data = options || {};
    const text = String(data.text || '');
    const url = String(data.url || '');
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.title || document.title,
          text: text,
          url: url || undefined,
        });
        return 'shared';
      } catch (error) {
        if (error && error.name === 'AbortError') return 'cancelled';
      }
    }
    const copied = await copyText(url ? text + '\n' + url : text);
    return copied ? 'copied' : 'failed';
  }

  /* ---------- Links para escuchar ---------- */

  /* Sólo se aceptan direcciones https://. Así se evitan esquemas peligrosos
     como javascript:, data: o http:. */
  function parseHttpsUrl(value) {
    const text = String(value || '').trim();
    if (!/^https:\/\//i.test(text)) return null;
    try {
      const url = new URL(text);
      if (url.protocol !== 'https:' || !url.hostname) return null;
      return url;
    } catch (error) {
      return null;
    }
  }

  function isSafeHttpsUrl(value) {
    return !!parseHttpsUrl(value);
  }

  const LINK_PLATFORMS = [
    { key: 'youtube', name: 'YouTube', domains: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'] },
    { key: 'spotify', name: 'Spotify', domains: ['spotify.com'] },
    { key: 'apple', name: 'Apple Music', domains: ['music.apple.com'] },
    { key: 'soundcloud', name: 'SoundCloud', domains: ['soundcloud.com'] },
    { key: 'deezer', name: 'Deezer', domains: ['deezer.com'] },
    { key: 'tidal', name: 'Tidal', domains: ['tidal.com'] },
    { key: 'vimeo', name: 'Vimeo', domains: ['vimeo.com'] },
    { key: 'bandcamp', name: 'Bandcamp', domains: ['bandcamp.com'] },
  ];

  /* Devuelve { key, name } según el dominio. Para sitios desconocidos
     devuelve el dominio como nombre, por ejemplo "ejemplo.com". */
  function detectLinkPlatform(value) {
    const url = parseHttpsUrl(value);
    if (!url) return { key: '', name: '' };
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const match = LINK_PLATFORMS.find((platform) =>
      platform.domains.some((domain) => host === domain || host.endsWith('.' + domain))
    );
    if (match) return { key: match.key, name: match.name };
    return { key: 'otro', name: host };
  }

  /* Extrae el ID de un video de YouTube. Devuelve '' si la dirección no es de
     YouTube o si no se puede reconocer el video (por ejemplo, una lista). */
  function youtubeVideoId(value) {
    const url = parseHttpsUrl(value);
    if (!url) return '';
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const isYouTube = host === 'youtu.be'
      || host === 'youtube.com'
      || host.endsWith('.youtube.com')
      || host === 'youtube-nocookie.com'
      || host.endsWith('.youtube-nocookie.com');
    if (!isYouTube) return '';

    let id = '';
    if (host === 'youtu.be') {
      id = url.pathname.split('/').filter(Boolean)[0] || '';
    } else if (url.pathname === '/watch') {
      id = url.searchParams.get('v') || '';
    } else {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') id = parts[1] || '';
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
  }

  window.U = {
    $, $$, esc, el, uid, clamp, debounce, normalize,
    fmtDuration, fmtDurationLong, parseDurationInput,
    todayISO, parseISODate, fmtDate, fmtDateLong, weekdayShort, monthShort, relativeDate,
    download, plural, roleLabel, appUrl, copyText, shareText,
    parseHttpsUrl, isSafeHttpsUrl, detectLinkPlatform, youtubeVideoId,
  };
})();
