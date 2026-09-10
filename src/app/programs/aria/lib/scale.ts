import { mod } from './math';
import { Note } from './note';

/** Step sizes, in chromatic steps, walking upward from the root. */
export type ScalePattern = readonly number[];

export const SCALE_PATTERNS = {
  chromatic: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  major: [2, 2, 1, 2, 2, 2, 1],
  natural_minor: [2, 1, 2, 2, 1, 2, 2],
  harmonic_minor: [2, 1, 2, 2, 1, 3, 1],
  melodic_minor: [2, 1, 2, 2, 2, 2, 1],
  major_pentatonic: [2, 2, 3, 2, 3],
  minor_pentatonic: [3, 2, 2, 3, 2],
  blues: [3, 2, 1, 1, 3, 2],
  ionian: [2, 2, 1, 2, 2, 2, 1],
  dorian: [2, 1, 2, 2, 2, 1, 2],
  phrygian: [1, 2, 2, 2, 1, 2, 2],
  lydian: [2, 2, 2, 1, 2, 2, 1],
  mixolydian: [2, 2, 1, 2, 2, 1, 2],
  aeolian: [2, 1, 2, 2, 1, 2, 2],
  locrian: [1, 2, 2, 1, 2, 2, 2],
  whole_tone: [2, 2, 2, 2, 2, 2],
  whole_half_diminished: [2, 1, 2, 1, 2, 1, 2, 1],
  half_whole_diminished: [1, 2, 1, 2, 1, 2, 1, 2],
} as const satisfies Record<string, ScalePattern>;

export type ScaleName = keyof typeof SCALE_PATTERNS;

export const SCALE_NAMES = Object.keys(SCALE_PATTERNS) as ScaleName[];

/**
 * A rooted scale, addressed by degree rather than by semitone.
 *
 * Degree 0 is the root, positive degrees ascend, negative degrees descend, and
 * degrees beyond the pattern length wrap into higher or lower octaves. Storing
 * music as degrees is what lets a whole song change mode at once.
 *
 * Lookup is O(1): step sizes are summed once into a cumulative table at
 * construction. The prototype re-walked the pattern on every call, and walked
 * it incorrectly downward — it consumed step sizes starting at `pattern[0]`
 * rather than `pattern[length - 1]`, so degree -1 of C major came out as Bb
 * instead of B.
 */
export class Scale {
  readonly root: Note;
  readonly pattern: ScalePattern;
  /** Chromatic steps spanned by one full turn of the pattern; 12 for most. */
  readonly span: number;
  /** cumulative[i] = steps from the root up to degree i. Length = size + 1. */
  private readonly cumulative: readonly number[];

  constructor(root: Note | string | number, pattern: ScalePattern | ScaleName) {
    this.root = Note.of(root);
    this.pattern = typeof pattern === 'string' ? SCALE_PATTERNS[pattern] : pattern;

    if (this.pattern.length === 0) {
      throw new Error('Aria: a scale needs at least one step');
    }
    if (this.pattern.some((step) => !Number.isFinite(step) || step <= 0)) {
      throw new Error('Aria: scale steps must be positive numbers');
    }

    const cumulative: number[] = [0];
    for (let i = 0; i < this.pattern.length; ++i) {
      cumulative.push(cumulative[i] + this.pattern[i]);
    }
    this.cumulative = cumulative;
    this.span = cumulative[this.pattern.length];
  }

  /** Number of degrees before the pattern repeats. */
  get size(): number {
    return this.pattern.length;
  }

  /** Chromatic steps from the root to the given degree; negative descends. */
  offsetOf(degree: number): number {
    const octaves = Math.floor(degree / this.size);
    return octaves * this.span + this.cumulative[mod(degree, this.size)];
  }

  /** The note at a scale degree. */
  noteAt(degree: number): Note {
    return new Note(this.root.index + this.offsetOf(degree));
  }

  /** Absolute pitch index at a scale degree, skipping Note allocation. */
  indexAt(degree: number): number {
    return this.root.index + this.offsetOf(degree);
  }

  /** True when a pitch index falls on a degree of this scale. */
  contains(index: number): boolean {
    // mod keeps the offset in [0, span), so it can only match cumulative[0..size-1].
    const offset = mod(index - this.root.index, this.span);
    return this.cumulative.indexOf(offset) !== -1;
  }

  /** The notes of one octave, degree 0 up to but excluding degree `size`. */
  octaveNotes(): Note[] {
    return Array.from({ length: this.size }, (_, i) => this.noteAt(i));
  }

  withRoot(root: Note | string | number): Scale {
    return new Scale(root, this.pattern);
  }

  withPattern(pattern: ScalePattern | ScaleName): Scale {
    return new Scale(this.root, pattern);
  }
}
