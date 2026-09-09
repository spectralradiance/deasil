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

// ---- rhythm ----------------------------------------------------------------

export type RhythmKind = 'every' | 'euclidean' | 'random';

/**
 * Euclidean rhythm: spreads `pulses` onsets as evenly as possible over `steps`.
 *
 * This is the Bresenham line-drawing formulation, which produces the same
 * necklaces as Bjorklund's algorithm for every input we care about, in a
 * fraction of the code. (3, 8) gives the tresillo, (5, 8) the cinquillo,
 * (7, 16) a clave — the patterns that turn up in most of the world's music, out
 * of one integer.
 */
export function euclideanRhythm(pulses: number, steps: number, rotation = 0): boolean[] {
  const n = Math.max(0, Math.floor(steps));
  const k = Math.max(0, Math.min(n, Math.floor(pulses)));
  if (n === 0) return [];
  if (k === 0) return new Array<boolean>(n).fill(false);

  const raw: boolean[] = [];
  // Seeded at n - k so the accumulator crosses on the very first step: the
  // pattern then begins on an onset, which is what a downbeat wants. (3, 8)
  // comes out as the tresillo x..x..x. rather than a rotation of it.
  let bucket = n - k;
  for (let i = 0; i < n; ++i) {
    bucket += k;
    if (bucket >= n) {
      bucket -= n;
      raw.push(true);
    } else {
      raw.push(false);
    }
  }
  // Rotate so the pattern can start somewhere other than its first onset.
  return Array.from({ length: n }, (_, i) => raw[mod(i - rotation, n)]);
}

export interface RhythmOptions {
  length: number;
  kind: RhythmKind;
  /** Onsets, for the euclidean kind. */
  pulses?: number;
  /** Steps to rotate the euclidean pattern by. */
  rotation?: number;
  /** Chance of an onset, for the random kind, 0-1. */
  density?: number;
  seed?: number;
}

/** A mask of which steps carry a note. */
export function generateRhythm(options: RhythmOptions): boolean[] {
  const { length, kind, pulses = 4, rotation = 0, density = 0.6, seed = 0 } = options;
  if (kind === 'every') return new Array<boolean>(length).fill(true);
  if (kind === 'euclidean') return euclideanRhythm(pulses, length, rotation);
  // Offset the seed so a track's rhythm and its pitches do not move in lockstep
  // when the seed changes.
  const rng = createRng(seed ^ 0x9e3779b9);
  return Array.from({ length }, () => rng() < density);
}

// ---- composed track generation ---------------------------------------------

export type PitchKind = 'walk' | 'arpeggio' | 'drone';

export interface TrackGeneratorOptions {
  pitch: PitchKind;
  rhythm: RhythmKind;
  low: number;
  high: number;
  stepwise: number;
  pulses: number;
  rotation: number;
  density: number;
  seed: number;
}

/**
 * Rhythm and pitch are generated separately and then combined: the mask decides
 * *when* a note happens, the pitch generator decides *what* it is. Keeping them
 * apart means changing the rhythm does not re-roll the melody, and changing the
 * melody does not disturb the groove.
 */
export function generateTrackPhrase(
  options: TrackGeneratorOptions,
  length: number,
  scaleSize: number,
): Phrase {
  const mask = generateRhythm({
    length,
    kind: options.rhythm,
    pulses: options.pulses,
    rotation: options.rotation,
    density: options.density,
    seed: options.seed,
  });

  let pitches: Phrase;
  if (options.pitch === 'arpeggio') {
    pitches = generateArpeggio(options.low, length, [0, 2, 4], 2, scaleSize);
  } else if (options.pitch === 'drone') {
    pitches = new Array<number | null>(length).fill(options.low);
  } else {
    pitches = generatePhrase({
      length,
      low: options.low,
      high: options.high,
      stepwise: options.stepwise,
      seed: options.seed,
    });
  }

  return Array.from({ length }, (_, i) => (mask[i] ? pitches[i] ?? null : null));
}
