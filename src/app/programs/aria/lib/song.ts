import type { InstrumentParams } from '../audio/InstrumentParams';
import { DEFAULT_INSTRUMENT, PRESETS } from '../audio/InstrumentParams';
import type { ScaleName } from './scale';
import { mod } from './math';
import { generateArpeggio, generatePhrase } from './generate';

/**
 * The song model.
 *
 * A step holds a scale *degree*, never a semitone. That is the decision the
 * whole program rests on: the key and the mode live on the song, so changing
 * either re-voices every pattern at once instead of transposing recorded
 * pitches. Semitones are derived at schedule time and stored nowhere.
 *
 * Everything here is a plain serializable object with no class instances and no
 * Web Audio references, so a song round-trips through JSON unchanged.
 */

export interface Step {
  degree: number;
  /** 0-1. Absent means the track's default. */
  velocity?: number;
}

/** A step slot is either a note or empty. */
export type StepSlot = Step | null;

export interface Track {
  id: string;
  name: string;
  instrumentId: string;
  steps: StepSlot[];
  /** Note length as a multiple of the step length; above 1, notes overlap. */
  gate: number;
  /** Track level, 0-1. */
  level: number;
  mute: boolean;
  solo: boolean;
  polyphony: number;
}

export interface Song {
  bpm: number;
  /** Steps per quarter note. 4 gives sixteenth-note resolution. */
  stepsPerBeat: number;
  stepCount: number;
  /** Root note name, e.g. "C3". */
  key: string;
  scaleName: ScaleName;
  tracks: Track[];
  instruments: Record<string, InstrumentParams>;
}

export const MIN_STEPS = 4;
export const MAX_STEPS = 64;
export const MAX_TRACKS = 8;

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}${idCounter}`;
}

export function emptySteps(count: number): StepSlot[] {
  return new Array<StepSlot>(count).fill(null);
}

export function createTrack(
  name: string,
  instrumentId: string,
  stepCount: number,
  overrides: Partial<Track> = {},
): Track {
  return {
    id: nextId('t'),
    name,
    instrumentId,
    steps: emptySteps(stepCount),
    gate: 0.9,
    level: 0.8,
    mute: false,
    solo: false,
    polyphony: 6,
    ...overrides,
  };
}

/** Turns a phrase of degrees and rests into step slots. */
function toSteps(phrase: (number | null)[], count: number): StepSlot[] {
  return Array.from({ length: count }, (_, i) => {
    const degree = phrase[mod(i, Math.max(1, phrase.length))];
    return degree === null || degree === undefined ? null : { degree };
  });
}

/**
 * A starting song: four named tracks over four contrasting presets, already
 * playing something. An empty grid on first visit means pressing play does
 * nothing, which reads as broken rather than as blank. Everything here is
 * deterministic, so the opening bar is the same for everyone.
 */
export function createSong(): Song {
  const stepCount = 16;
  const lead = generatePhrase({
    length: stepCount, low: -2, high: 7, restDensity: 0.3, stepwise: 0.8, seed: 20260909,
  });
  // Root on each downbeat, with the fifth leading back in on the last eighth.
  const bass = Array.from({ length: stepCount }, (_, i) =>
    i % 4 === 0 ? (i === 12 ? -3 : -7) : null);
  // Offbeat sixteenths, so the pluck sits between the bass hits.
  const pluck = generateArpeggio(0, stepCount, [0, 2, 4], 2, 7)
    .map((degree, i) => (i % 2 === 1 ? degree : null));
  const pad = Array.from({ length: stepCount }, (_, i) => (i === 0 ? 0 : i === 8 ? 3 : null));

  return {
    bpm: 110,
    stepsPerBeat: 4,
    stepCount,
    key: 'C3',
    scaleName: 'dorian',
    instruments: {
      lead: PRESETS.default ?? DEFAULT_INSTRUMENT,
      bass: PRESETS.bass,
      pluck: PRESETS.pluck,
      pad: PRESETS.pad,
    },
    tracks: [
      createTrack('lead', 'lead', stepCount, { steps: toSteps(lead, stepCount) }),
      createTrack('bass', 'bass', stepCount, {
        gate: 0.8, polyphony: 2, steps: toSteps(bass, stepCount),
      }),
      createTrack('pluck', 'pluck', stepCount, {
        level: 0.6, steps: toSteps(pluck, stepCount),
      }),
      createTrack('pad', 'pad', stepCount, {
        gate: 3.5, level: 0.5, polyphony: 3, steps: toSteps(pad, stepCount),
      }),
    ],
  };
}

// ---- pure updates ----------------------------------------------------------

export function setStep(song: Song, trackId: string, index: number, step: StepSlot): Song {
  return {
    ...song,
    tracks: song.tracks.map((track) => {
      if (track.id !== trackId) return track;
      const steps = track.steps.slice();
      steps[index] = step;
      return { ...track, steps };
    }),
  };
}

export function updateTrack(song: Song, trackId: string, patch: Partial<Track>): Song {
  return {
    ...song,
    tracks: song.tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)),
  };
}

export function clearTrack(song: Song, trackId: string): Song {
  return updateTrack(song, trackId, { steps: emptySteps(song.stepCount) });
}

/**
 * Resizes every track. Growing pads with rests; shrinking truncates. Both keep
 * the material that fits rather than regenerating, so nudging the loop length
 * does not throw away what you have written.
 */
export function setStepCount(song: Song, stepCount: number): Song {
  const count = Math.max(MIN_STEPS, Math.min(MAX_STEPS, Math.round(stepCount)));
  if (count === song.stepCount) return song;
  return {
    ...song,
    stepCount: count,
    tracks: song.tracks.map((track) => ({
      ...track,
      steps: Array.from({ length: count }, (_, i) => track.steps[i] ?? null),
    })),
  };
}

export function addTrack(song: Song): Song {
  if (song.tracks.length >= MAX_TRACKS) return song;
  const instrumentId = Object.keys(song.instruments)[0] ?? 'lead';
  return {
    ...song,
    tracks: [...song.tracks, createTrack(`track ${song.tracks.length + 1}`, instrumentId, song.stepCount)],
  };
}

export function removeTrack(song: Song, trackId: string): Song {
  if (song.tracks.length <= 1) return song;
  return { ...song, tracks: song.tracks.filter((t) => t.id !== trackId) };
}

/**
 * Whether a track should sound. Solo is exclusive across the song: if any track
 * is soloed, the others are silent regardless of their own mute flag.
 */
export function isAudible(song: Song, track: Track): boolean {
  const anySolo = song.tracks.some((t) => t.solo);
  return anySolo ? track.solo : !track.mute;
}

/** Fills a track with a phrase, mapping nulls to rests. */
export function fillTrack(song: Song, trackId: string, phrase: (number | null)[]): Song {
  return updateTrack(song, trackId, {
    steps: Array.from({ length: song.stepCount }, (_, i) => {
      const degree = phrase[mod(i, Math.max(1, phrase.length))];
      return degree === null || degree === undefined ? null : { degree };
    }),
  });
}

/** Shifts every note in a track by whole steps, wrapping around the loop. */
export function rotateTrack(song: Song, trackId: string, by: number): Song {
  const track = song.tracks.find((t) => t.id === trackId);
  if (!track) return song;
  const n = track.steps.length;
  return updateTrack(song, trackId, {
    steps: Array.from({ length: n }, (_, i) => track.steps[mod(i - by, n)]),
  });
}

/** Transposes every note in a track by whole scale degrees. */
export function transposeTrack(song: Song, trackId: string, by: number): Song {
  const track = song.tracks.find((t) => t.id === trackId);
  if (!track) return song;
  return updateTrack(song, trackId, {
    steps: track.steps.map((s) => (s === null ? null : { ...s, degree: s.degree + by })),
  });
}
