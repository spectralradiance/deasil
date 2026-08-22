import { RUNES } from './rune-data';
import { OGHAM } from './ogham-data';
import { enrichedCards } from './tarot-data';
import { SPREADS, type DrawnCard, type SpreadPosition } from './tarot-constants';
import type {
  AnyReading,
  DivinationToken,
  DrawSpread,
  DrawnToken,
  TarotReadingRecord,
  TokenReadingRecord,
} from './ReadingEntry';

/** Query-string key holding the encoded reading JSON. */
export const READING_PARAM = 'r';

type SavedCard = { n: string; r?: 1 };

type SavedTarot = {
  k: 't';
  s: string;
  c: SavedCard[];
  p?: { n: string; d?: string }[];
  rv?: 1;
};

type SavedTokens = {
  k: 'r' | 'o';
  s: string;
  t: SavedCard[];
  p?: string[];
};

type SavedReading = SavedTarot | SavedTokens;

function toRuneToken(r: (typeof RUNES)[number]): DivinationToken {
  return {
    id: r.name, symbol: r.symbol, name: r.name,
    secondary: r.phoneme, keywords: r.keywords,
    upright: r.upright, reversed: r.reversed || undefined,
  };
}

function toOghamToken(o: (typeof OGHAM)[number]): DivinationToken {
  return {
    id: o.name, symbol: o.symbol, name: o.name,
    secondary: o.tree, keywords: o.keywords,
    upright: o.meaning,
  };
}

function serializeCard(name: string, isReversed: boolean): SavedCard {
  return isReversed ? { n: name, r: 1 } : { n: name };
}

function serializeReading(reading: AnyReading): SavedReading {
  if (reading.kind === 'tarot') {
    const saved: SavedTarot = {
      k: 't',
      s: reading.spread.name,
      c: reading.cards.map(c => serializeCard(c.name, c.isReversed)),
    };
    if (reading.spread.count === null && reading.positions?.length) {
      saved.p = reading.positions.map(p => p.description ? { n: p.name, d: p.description } : { n: p.name });
    }
    if (reading.hasReversals) saved.rv = 1;
    return saved;
  }
  const saved: SavedTokens = {
    k: reading.label === 'Ogham' ? 'o' : 'r',
    s: reading.spread.name,
    t: reading.tokens.map(t => serializeCard(t.id, t.isReversed)),
  };
  if (reading.spread.positions?.length) saved.p = reading.spread.positions;
  return saved;
}

function hydrateTarot(saved: SavedTarot, id: number): TarotReadingRecord | null {
  const cards: DrawnCard[] = [];
  for (const item of saved.c) {
    const card = enrichedCards.find(c => c.name === item.n);
    if (!card) continue;
    cards.push({ ...card, isReversed: item.r === 1 });
  }
  if (!cards.length) return null;
  const spread = SPREADS.find(s => s.name === saved.s) ?? SPREADS[0];
  const positions: SpreadPosition[] | undefined = spread.count === null
    ? saved.p?.map(p => ({ name: p.n, description: p.d ?? '' }))
    : spread.positions;
  return {
    kind: 'tarot',
    id,
    cards,
    spread,
    positions,
    hasReversals: saved.rv === 1 || cards.some(c => c.isReversed),
    startRevealed: true,
  };
}

function hydrateTokens(saved: SavedTokens, id: number): TokenReadingRecord | null {
  const catalog = saved.k === 'o' ? OGHAM.map(toOghamToken) : RUNES.map(toRuneToken);
  const tokens: DrawnToken[] = [];
  for (const item of saved.t) {
    const token = catalog.find(t => t.id === item.n);
    if (!token) continue;
    tokens.push({ ...token, isReversed: item.r === 1 });
  }
  if (!tokens.length) return null;
  const spread: DrawSpread = {
    name: saved.s,
    count: tokens.length,
    positions: saved.p,
  };
  const states = new Map<number, { revealed: true; infoOpen: true }>();
  tokens.forEach((_, i) => states.set(i, { revealed: true, infoOpen: true }));
  return {
    kind: 'tokens',
    id,
    label: saved.k === 'o' ? 'Ogham' : 'Runes',
    tokens,
    spread,
    states,
  };
}

function hydrateReading(saved: SavedReading, id: number): AnyReading | null {
  if (!saved || typeof saved !== 'object' || !('k' in saved)) return null;
  if (saved.k === 't') return hydrateTarot(saved, id);
  if (saved.k === 'r' || saved.k === 'o') return hydrateTokens(saved, id);
  return null;
}

function jsonToBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToJson(raw: string): string | null {
  try {
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((raw.length + 3) % 4);
    const bin = atob(padded);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function parseSavedJson(json: string): AnyReading[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) return [];
  const readings: AnyReading[] = [];
  for (const item of parsed) {
    const reading = hydrateReading(item as SavedReading, readings.length);
    if (reading) readings.push(reading);
  }
  return readings;
}

/** Compact JSON of drawn cards / tokens, then base64url so the URL is opaque. */
export function encodeReadings(readings: AnyReading[]): string {
  return jsonToBase64Url(JSON.stringify(readings.map(serializeReading)));
}

export function decodeReadings(raw: string): AnyReading[] {
  try {
    const json = base64UrlToJson(raw) ?? raw;
    return parseSavedJson(json);
  } catch {
    return [];
  }
}

export function writeReadingsToUrl(readings: AnyReading[]) {
  const url = new URL(window.location.href);
  if (readings.length) url.searchParams.set(READING_PARAM, encodeReadings(readings));
  else url.searchParams.delete(READING_PARAM);
  window.history.replaceState(null, '', url);
}

export function readReadingsFromUrl(): AnyReading[] {
  const raw = new URL(window.location.href).searchParams.get(READING_PARAM);
  return raw ? decodeReadings(raw) : [];
}
