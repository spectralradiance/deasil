/**
 * Chord voicings, in scale degrees.
 *
 * A chord here is not stored data — it is a *voicing applied at schedule
 * time*, exactly as a key and a mode are. A lane still holds one degree per
 * step; the chord says how many notes that degree sounds as, and the scale
 * decides what they actually are. Which means a triad in dorian and the same
 * triad in phrygian are different chords built from the same stored song, and
 * changing the mode re-voices every chord at once without rewriting a note.
 *
 * The offsets are degrees, not semitones, so they follow whatever scale they
 * are read through. In a seven-note mode `[0, 2, 4]` is the familiar triad; in
 * a pentatonic the same stack lands on that scale's own third and fifth, which
 * is the right answer rather than an approximation of one.
 */

export type ChordName =
  | 'none'
  | 'octave'
  | 'fifth'
  | 'triad'
  | 'sus'
  | 'seventh'
  | 'ninth'
  | 'spread';

export const CHORD_NAMES: readonly ChordName[] = [
  'none', 'octave', 'fifth', 'triad', 'sus', 'seventh', 'ninth', 'spread',
];

/**
 * The degree offsets a chord adds above the written note.
 *
 * `scaleSize` is the number of degrees in an octave of the lane's mode, which
 * the octave-spanning voicings need: an octave is "however many degrees this
 * scale has", not a fixed seven.
 */
export function chordOffsets(name: ChordName, scaleSize: number): readonly number[] {
  const octave = Math.max(1, Math.round(scaleSize));
  switch (name) {
    case 'octave': return [0, octave];
    case 'fifth': return [0, 4];
    case 'triad': return [0, 2, 4];
    case 'sus': return [0, 3, 4];
    case 'seventh': return [0, 2, 4, 6];
    case 'ninth': return [0, 2, 4, 6 + octave];
    // Wide voicing: root, fifth, then the third an octave up, which is how a
    // pad avoids the muddy stack a close triad makes in a low register.
    case 'spread': return [0, 4, 2 + octave];
    default: return [0];
  }
}

/** How many voices one note of this chord will ask the track for. */
export function chordSize(name: ChordName, scaleSize = 7): number {
  return chordOffsets(name, scaleSize).length;
}

/** A one-line description, for the panel's help text. */
export const CHORD_HELP: Record<ChordName, string> = {
  none: 'One note per step, as written.',
  octave: 'The note doubled an octave up.',
  fifth: 'Root and fifth — no third, so it sits in any mode.',
  triad: 'Root, third and fifth of the lane’s scale.',
  sus: 'Root, fourth and fifth: the third is withheld.',
  seventh: 'A triad with the seventh on top.',
  ninth: 'A triad with the ninth an octave above.',
  spread: 'Root, fifth, and the third an octave up — open, for low registers.',
};
