/* Motor de acordes: análisis, transposición y conversión de formato ChordPro */
(function () {
  'use strict';

  const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const NOTE_INDEX = {
    C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
    'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
  };

  // Cualidades aceptadas: "", m, maj7, m7b5, sus4, add9, 6/9, 7(#9), °, ø, etc.
  const QUALITY_RE = /^(?:(?:maj|min|m|M|dim|aug|sus|add|°|ø|Δ|\+|-)?\d{0,2})?(?:(?:sus|add|maj|min|dim|aug|b|#)\d{0,2})*(?:\/\d+)?(?:\([^)]*\))?$/;
  const SECTION_RE = /^\[([^\]]+)\]$/;

  function parseChord(token) {
    if (!token || typeof token !== 'string') return null;
    const match = /^([A-G](?:#|b)?)(.*)$/.exec(token);
    if (!match) return null;
    let root = match[1];
    let rest = match[2];
    let bass = '';
    const slash = rest.lastIndexOf('/');
    if (slash !== -1) {
      const after = rest.slice(slash + 1);
      if (/^[A-G](?:#|b)?$/.test(after)) {
        bass = after;
        rest = rest.slice(0, slash);
      }
    }
    if (!QUALITY_RE.test(rest)) return null;
    return { root, quality: rest, bass };
  }

  function isChord(token) {
    return parseChord(token) !== null;
  }

  function isChordLine(line) {
    const trimmed = String(line || '').trim();
    if (!trimmed || SECTION_RE.test(trimmed)) return false;
    const tokens = trimmed.split(/\s+/);
    if (!tokens.length) return false;
    return tokens.every((t) => isChord(t));
  }

  const FLAT_MAJOR_ROOTS = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
  const FLAT_MINOR_ROOTS = ['D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab'];

  function keyUsesFlats(key) {
    const chord = parseChord(String(key || '').trim());
    if (!chord) return false;
    if (chord.root.indexOf('b') !== -1) return true;
    if (chord.root.indexOf('#') !== -1) return false;
    const isMinor = /^m(?!aj)/.test(chord.quality);
    return (isMinor ? FLAT_MINOR_ROOTS : FLAT_MAJOR_ROOTS).indexOf(chord.root) !== -1;
  }

  function transposeNote(note, semitones, preferFlat) {
    const index = NOTE_INDEX[note];
    if (index === undefined) return note;
    const next = ((index + (Number(semitones) || 0)) % 12 + 12) % 12;
    return (preferFlat ? FLAT_NAMES : SHARP_NAMES)[next];
  }

  function transposeChord(token, semitones, preferFlat) {
    const chord = parseChord(token);
    if (!chord) return token;
    let out = transposeNote(chord.root, semitones, preferFlat) + chord.quality;
    if (chord.bass) out += '/' + transposeNote(chord.bass, semitones, preferFlat);
    return out;
  }

  function transposeKey(key, semitones, preferFlat) {
    const chord = parseChord(key);
    if (!chord) return key;
    return transposeNote(chord.root, semitones, preferFlat) + chord.quality;
  }

  const MAJOR_FLAT_PITCHES = [1, 3, 8, 10];

  /** Devuelve la tonalidad resultante con la grafía más habitual (Bb antes que A#, Eb antes que D#…). */
  function targetKey(key, semitones) {
    const chord = parseChord(String(key || '').trim());
    if (!chord) return '';
    const shift = Number(semitones) || 0;
    const pitch = ((NOTE_INDEX[chord.root] + shift) % 12 + 12) % 12;
    const isMinor = /^m(?!aj)/.test(chord.quality);
    let preferFlat;
    if (pitch === 6) preferFlat = keyUsesFlats(key);
    else if (isMinor) preferFlat = pitch === 10;
    else preferFlat = MAJOR_FLAT_PITCHES.indexOf(pitch) !== -1;
    return transposeNote(chord.root, shift, preferFlat) + chord.quality;
  }

  /** Distancia en semitonos entre dos tonalidades, en el sentido más corto. */
  function semitoneDelta(fromKey, toKey) {
    const from = parseChord(String(fromKey || '').trim());
    const to = parseChord(String(toKey || '').trim());
    if (!from || !to) return 0;
    const a = NOTE_INDEX[from.root];
    const b = NOTE_INDEX[to.root];
    if (a === undefined || b === undefined) return 0;
    let delta = (b - a + 12) % 12;
    if (delta > 6) delta -= 12;
    return delta;
  }

  /** Transporta todas las líneas de acordes de un contenido, conservando la letra y las columnas. */
  function transposeContent(content, semitones, preferFlat) {
    const shift = Number(semitones) || 0;
    if (!shift) return String(content || '');
    return String(content || '').replace(/\r/g, '').split('\n').map((line) => {
      const trimmed = line.trim();
      if (!trimmed || SECTION_RE.test(trimmed) || !isChordLine(trimmed)) return line;
      return line.replace(/\S+/g, (token) => (isChord(token) ? transposeChord(token, shift, preferFlat) : token));
    }).join('\n');
  }

  function chordTokensWithPositions(line) {
    const result = [];
    const re = /\S+/g;
    let match;
    while ((match = re.exec(line)) !== null) {
      const token = match[0];
      if (isChord(token)) result.push({ chord: token, col: match.index });
    }
    return result;
  }

  /** Convierte texto ChordPro ([G]letra) a líneas de acordes sobre la letra. */
  function convertChordPro(text) {
    const source = String(text || '').replace(/\r/g, '');
    const lines = source.split('\n');
    const output = [];

    lines.forEach((raw) => {
      if (!raw.trim()) { output.push(''); return; }

      const markerOnly = /^\s*(?:\{([^{}]+)\}|\[([^\[\]]+)\])\s*$/.exec(raw);
      if (markerOnly) {
        const label = (markerOnly[1] || markerOnly[2] || '').trim();
        if (label && !isChord(label)) {
          output.push('[' + label + ']');
          return;
        }
      }

      if (raw.indexOf('[') === -1) {
        const plainComment = /^\s*\{([^{}]+)\}\s*$/.exec(raw);
        output.push(plainComment ? '[' + plainComment[1].trim() + ']' : raw.replace(/\s+$/, ''));
        return;
      }

      const parts = raw.match(/\[[^\]]*\]|[^[]+/g) || [];
      let lyric = '';
      let chords = [];
      parts.forEach((part) => {
        if (part.charAt(0) === '[' && part.charAt(part.length - 1) === ']') {
          const chord = part.slice(1, -1).trim();
          if (isChord(chord)) chords.push({ chord, col: lyric.length });
        } else {
          lyric += part;
        }
      });

      if (!chords.length) {
        output.push(lyric.replace(/\s+$/, ''));
        return;
      }

      // Construir la línea de acordes respetando columnas
      let chordLine = '';
      chords.forEach((c) => {
        const target = Math.max(c.col, chordLine.length ? chordLine.length + 1 : 0);
        chordLine += ' '.repeat(Math.max(0, target - chordLine.length)) + c.chord;
      });
      output.push(chordLine.replace(/\s+$/, ''));
      if (lyric.trim()) output.push(lyric.replace(/\s+$/, ''));
    });

    return output.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  /** Divide el contenido en bloques semánticos para renderizar. */
  function parseSongContent(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const blocks = [];
    let i = 0;
    while (i < lines.length) {
      const raw = lines[i];
      const trimmed = raw.trim();

      if (!trimmed) { blocks.push({ type: 'gap' }); i += 1; continue; }

      const section = SECTION_RE.exec(trimmed);
      if (section) { blocks.push({ type: 'section', label: section[1] }); i += 1; continue; }

      if (isChordLine(trimmed)) {
        const next = lines[i + 1];
        const nextTrimmed = next === undefined ? '' : next.trim();
        const nextIsSection = nextTrimmed && SECTION_RE.test(nextTrimmed);
        if (next !== undefined && nextTrimmed && !isChordLine(nextTrimmed) && !nextIsSection) {
          blocks.push({ type: 'pair', chords: chordTokensWithPositions(raw), lyric: next.replace(/\s+$/, '') });
          i += 2;
          continue;
        }
        blocks.push({ type: 'chords', text: trimmed });
        i += 1;
        continue;
      }

      blocks.push({ type: 'lyric', text: raw.replace(/\s+$/, '') });
      i += 1;
    }
    return blocks;
  }

  /** Construye segmentos (acorde + texto) alineados para una línea. */
  function buildSegments(chords, lyric) {
    const text = String(lyric || '');
    if (!chords || !chords.length) return [{ chord: '', text }];
    const segments = [];
    let cursor = 0;

    chords.forEach((item, index) => {
      const start = Math.min(Math.max(item.col, cursor), text.length + 12);
      if (start > cursor) segments.push({ chord: '', text: text.slice(cursor, start) });
      cursor = start;
      const nextCol = index + 1 < chords.length ? chords[index + 1].col : text.length;
      const end = Math.max(start, Math.min(nextCol, text.length));
      segments.push({ chord: item.chord, text: text.slice(start, end) || '\u00a0' });
      cursor = end;
    });

    if (cursor < text.length) segments.push({ chord: '', text: text.slice(cursor) });
    return segments;
  }

  window.Chords = {
    parseChord, isChord, isChordLine, keyUsesFlats,
    transposeNote, transposeChord, transposeKey, targetKey, semitoneDelta, transposeContent,
    chordTokensWithPositions, convertChordPro, parseSongContent, buildSegments,
  };
})();
