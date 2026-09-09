/**
 * Pitch index -> frequency, decoupled from 12-tone equal temperament.
 *
 * A pitch index is an integer count of steps where index 0 is C0 and each
 * `division` steps is one octave. In the default 12-TET that makes index 0
 * 16.352 Hz, matching the constant the prototype hardcoded.
 */

export interface Tuning {
  /** Frequency in Hz of the reference pitch, A4. */
  referenceHz: number;
  /** Steps per octave. 12 = semitones, 24 = quarter tones, 19/31 = meantone. */
  division: number;
}

export const TWELVE_TET: Tuning = { referenceHz: 440, division: 12 };

/**
 * Index of the reference pitch (A4) for a given division: four whole octaves,
 * plus the C-to-A distance scaled into that division. 57 in 12-TET.
 */
export function referenceIndex(division: number): number {
  return division * 4 + Math.round((division * 9) / 12);
}

/** Frequency in Hz of a pitch index under the given tuning. */
export function frequencyOf(index: number, tuning: Tuning = TWELVE_TET): number {
  const { referenceHz, division } = tuning;
  return referenceHz * Math.pow(2, (index - referenceIndex(division)) / division);
}

/**
 * Inverse of `frequencyOf`, returning a possibly fractional index. Useful for
 * mapping external pitch sources (MIDI, analysis) back onto a tuning.
 */
export function indexOf(frequencyHz: number, tuning: Tuning = TWELVE_TET): number {
  const { referenceHz, division } = tuning;
  return referenceIndex(division) + division * Math.log2(frequencyHz / referenceHz);
}

/**
 * Frequency of a MIDI note number, for hardware input later. MIDI 69 is A4,
 * and MIDI note numbers are always 12-TET regardless of the song's tuning.
 */
export function frequencyOfMidi(midiNote: number, referenceHz = 440): number {
  return referenceHz * Math.pow(2, (midiNote - 69) / 12);
}
