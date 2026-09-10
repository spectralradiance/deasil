import { mod } from './math';
import { frequencyOf, TWELVE_TET, type Tuning } from './tuning';

/**
 * Pitch-class spellings, index 0 = C. The first entry of each row is the
 * display name; the rest are accepted when parsing. Uses `#` and `b` rather
 * than the typographic sharp and flat.
 */
export const PITCH_CLASS_NAMES: readonly (readonly string[])[] = [
  ['C'],
  ['C#/Db', 'C#', 'Db'],
  ['D'],
  ['D#/Eb', 'D#', 'Eb'],
  ['E'],
  ['F'],
  ['F#/Gb', 'F#', 'Gb'],
  ['G'],
  ['G#/Ab', 'G#', 'Ab'],
  ['A'],
  ['A#/Bb', 'A#', 'Bb'],
  ['B'],
];

/** Steps per octave for the naming scheme above. */
export const CHROMATIC_STEPS = 12;

/**
 * A pitch, stored as an absolute index where 0 is C0 and each step is one
 * twelfth of an octave. Immutable.
 *
 * Naming is inherently 12-TET: `frequency()` honours any tuning, but
 * `name` and `pitchClass` describe the nearest chromatic spelling. A microtonal
 * song addresses pitches by index and scale degree rather than by name.
 */
export class Note {
  readonly index: number;

  constructor(index: number) {
    this.index = Math.round(index);
  }

  /** `new Note(24)`, `Note.of('C2')`, `Note.of('C', 2)`, `Note.of(otherNote)`. */
  static of(value: number | string | Note, octave?: number): Note {
    if (typeof value === 'number') return new Note(value);
    if (value instanceof Note) return new Note(value.index);
    return octave === undefined ? Note.fromName(value) : Note.fromParts(value, octave);
  }

  /** Parses an absolute name such as `C2`, `F#3` or `Bb-1`. */
  static fromName(name: string): Note {
    const match = name.trim().match(/^([A-Ga-g][#b]?)\s*(-?\d+)$/);
    if (!match) throw new Error(`Aria: cannot parse note name "${name}"`);
    return Note.fromParts(match[1], parseInt(match[2], 10));
  }

  /** Builds a note from a pitch-class name and an octave number. */
  static fromParts(pitchClassName: string, octave: number): Note {
    const pitchClass = Note.pitchClassOf(pitchClassName);
    if (pitchClass === null) {
      throw new Error(`Aria: unknown pitch class "${pitchClassName}"`);
    }
    return new Note(CHROMATIC_STEPS * octave + pitchClass);
  }

  /** Pitch-class index (0-11) for a spelling, or null if unrecognised. */
  static pitchClassOf(pitchClassName: string): number | null {
    const wanted = pitchClassName.trim();
    const normalised = wanted.charAt(0).toUpperCase() + wanted.slice(1);
    for (let i = 0; i < PITCH_CLASS_NAMES.length; ++i) {
      if (PITCH_CLASS_NAMES[i].includes(normalised)) return i;
    }
    return null;
  }

  /** Position within the octave, 0-11. */
  get pitchClass(): number {
    return mod(this.index, CHROMATIC_STEPS);
  }

  /** Octave number; C0 is octave 0, and notes below it are negative. */
  get octave(): number {
    return Math.floor(this.index / CHROMATIC_STEPS);
  }

  /** Display spelling without the octave, e.g. `C#/Db`. */
  get pitchClassName(): string {
    return PITCH_CLASS_NAMES[this.pitchClass][0];
  }

  /** Display spelling with the octave, e.g. `C#/Db2`. */
  get name(): string {
    return `${this.pitchClassName}${this.octave}`;
  }

  /** Short spelling preferring sharps, e.g. `C#2` — for the tracker grid. */
  get shortName(): string {
    const spellings = PITCH_CLASS_NAMES[this.pitchClass];
    const sharp = spellings.length > 1 ? spellings[1] : spellings[0];
    return `${sharp}${this.octave}`;
  }

  frequency(tuning: Tuning = TWELVE_TET): number {
    return frequencyOf(this.index, tuning);
  }

  transpose(steps: number): Note {
    return new Note(this.index + steps);
  }

  equals(other: Note): boolean {
    return this.index === other.index;
  }

  toString(): string {
    return this.name;
  }
}
