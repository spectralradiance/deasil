/**
 * Seeded randomness for draws.
 *
 * When the querent writes a message, the draw is seeded from that message plus
 * the oracle, the spread and today's date: asking the same question of the same
 * spread on the same day gives the same answer, while a different wording, a
 * different spread or another day gives a fresh one. A blank message falls back
 * to the browser's cryptographic randomness.
 */

export type Rng = () => number;

/** cyrb128: hashes a string into four 32-bit words. */
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** sfc32: small fast counter PRNG, returns floats in [0, 1). */
function sfc32(a: number, b: number, c: number, d: number): Rng {
  return () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/** Uniform floats in [0, 1) from crypto.getRandomValues. */
function cryptoRng(): Rng {
  const buf = new Uint32Array(1);
  return () => {
    crypto.getRandomValues(buf);
    return buf[0] / 4294967296;
  };
}

/** Collapse case and whitespace so trivial retyping doesn't change the draw. */
export function normalizeMessage(message: string): string {
  return message.trim().replace(/\s+/g, ' ').toLowerCase();
}

function localDateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * The RNG for one draw. `context` should name the oracle and spread so a
 * question asked of the runes doesn't mirror the same question asked of tarot.
 */
export function createDrawRng(message: string, context: string, date = new Date()): Rng {
  const normalized = normalizeMessage(message);
  if (!normalized) return cryptoRng();
  const rng = sfc32(...cyrb128(`${normalized}|${context}|${localDateKey(date)}`));
  // Discard the first outputs; sfc32 needs a few rounds to mix a fresh seed.
  for (let i = 0; i < 15; i++) rng();
  return rng;
}

/** Draws `count` distinct items from `pool`, each optionally reversed. */
export function drawFrom<T>(pool: readonly T[], count: number, rng: Rng, allowReversals: boolean): { item: T; isReversed: boolean }[] {
  const remaining = [...pool];
  const result: { item: T; isReversed: boolean }[] = [];
  for (let i = 0; i < count && remaining.length; i++) {
    const item = remaining.splice(Math.floor(rng() * remaining.length), 1)[0];
    // Always consume the reversal roll so toggling reversals doesn't reshuffle the cards.
    const roll = rng();
    result.push({ item, isReversed: allowReversals && roll < 0.5 });
  }
  return result;
}
