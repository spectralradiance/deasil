import { mod } from './math';

/**
 * Scale-degree phrase generation.
 *
 * Every function here is pure and seeded: same seed, same phrase, always. That
 * matters twice over — a generated pattern can be stored as its seed plus its
 * settings rather than as notes, and the phase-4 panel and the stretch-goal
 * expression DSL can both sit on exactly these functions with plain arguments.
 *
 * Output is scale degrees, never semitones. A phrase generated in dorian
 * transposes into any other mode by changing the scale it is read through.
 */

export type Rng = () => number;

/**
 * mulberry32. Small, fast, and good enough for musical randomness; chosen over
 * `Math.random` because reproducibility is the point.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

/** A generated phrase. `null` is a rest. */
export type Phrase = (number | null)[];

export interface PhraseOptions {
  /** Number of steps to fill. */
  length: number;
  /** Lowest scale degree, inclusive. */
  low: number;
  /** Highest scale degree, inclusive. */
  high: number;
  /** Fraction of steps left as rests, 0-1. */
  restDensity?: number;
  seed?: number;
  /**
   * 0 picks degrees independently, as the prototype did. 1 constrains each
   * degree to be adjacent to the previous one. Between the two, the walk is
   * increasingly likely to step rather than leap — which is most of the
   * difference between a random sequence and something that sounds intended.
   */
  stepwise?: number;
}

function pickInRange(rng: Rng, low: number, high: number): number {
  return low + Math.floor(rng() * (high - low + 1));
}

/**
 * A phrase of independent or stepwise-constrained degrees.
 */
export function generatePhrase(options: PhraseOptions): Phrase {
  const { length, restDensity = 0, seed = 0, stepwise = 0 } = options;
  const low = Math.min(options.low, options.high);
  const high = Math.max(options.low, options.high);
  const rng = createRng(seed);
  const bias = Math.max(0, Math.min(1, stepwise));
  const rest = Math.max(0, Math.min(1, restDensity));

  const phrase: Phrase = [];
  let previous = pickInRange(rng, low, high);

  for (let i = 0; i < length; ++i) {
    if (rest > 0 && rng() < rest) {
      phrase.push(null);
      continue;
    }
    let degree: number;
    if (rng() < bias) {
      // Step by a second or a third, reflected back into range at the edges.
      const stride = rng() < 0.7 ? 1 : 2;
      const direction = rng() < 0.5 ? -1 : 1;
      degree = previous + stride * direction;
      if (degree < low || degree > high) degree = previous - stride * direction;
      if (degree < low || degree > high) degree = pickInRange(rng, low, high);
    } else {
      degree = pickInRange(rng, low, high);
    }
    phrase.push(degree);
    previous = degree;
  }
  return phrase;
}

/**
 * An arpeggio over the degrees of a chord built on `root`, cycling through
 * `octaves` of it. Deterministic, no seed needed.
 */
export function generateArpeggio(
  root: number,
  length: number,
  shape: readonly number[] = [0, 2, 4],
  octaves = 1,
  scaleSize = 7,
): Phrase {
  const phrase: Phrase = [];
  const span = shape.length * Math.max(1, octaves);
  for (let i = 0; i < length; ++i) {
    const position = mod(i, span);
    const octave = Math.floor(position / shape.length);
    phrase.push(root + shape[mod(position, shape.length)] + octave * scaleSize);
  }
  return phrase;
}

/** Rotates a phrase, as the prototype's Melody.rotate did. */
export function rotate(phrase: Phrase, by: number): Phrase {
  if (phrase.length === 0) return [];
  const n = mod(by, phrase.length);
  return [...phrase.slice(phrase.length - n), ...phrase.slice(0, phrase.length - n)];
}

/** Repeats a phrase to fill `length` steps. */
export function repeatTo(phrase: Phrase, length: number): Phrase {
  if (phrase.length === 0) return new Array(length).fill(null);
  return Array.from({ length }, (_, i) => phrase[mod(i, phrase.length)]);
}

/** Transposes every sounding degree, leaving rests alone. */
export function transpose(phrase: Phrase, by: number): Phrase {
  return phrase.map((d) => (d === null ? null : d + by));
}
