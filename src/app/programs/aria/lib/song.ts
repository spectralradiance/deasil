import type { InstrumentGraph } from '../audio/graph';
import { presetGraph } from '../audio/graph-presets';
import { SCALE_PATTERNS, type ScaleName } from './scale';
import { mod } from './math';
import {
  generateArpeggio, generatePhrase, generateTrackPhrase, randomSeed,
  type PitchKind, type RhythmKind,
} from './generate';

/**
 * The song model.
 *
 * A step holds a scale *degree*, never a semitone. That is the decision the
 * whole program rests on: the key and the mode live on the song, so changing
 * either re-voices every pattern at once instead of transposing recorded
 * pitches. Semitones are derived at schedule time and stored nowhere.
 *
 * Tracks and patterns are separate axes, as in every tracker. A **track** is a
 * channel: what instrument it plays through, how loud, how many voices. A
 * **pattern** is a block of bars holding one **lane** of notes per track. The
 * **order** lists patterns in the sequence they play. Keeping channel config
 * out of the pattern is what lets you mute a track once rather than in every
 * pattern you have written.
 *
 * Everything here is plain serializable data — no class instances, no Web Audio
 * references — so a song round-trips through JSON unchanged.
 */

export interface Step {
  degree: number;
  /** 0-1. Absent means the track's default. */
  velocity?: number;
}

/** A step slot is either a note or empty. */
export type StepSlot = Step | null;

/**
 * Per-lane generation settings.
 *
 * `live` means the lane's steps are re-derived from these settings, so a slider
 * is a musical control you move against the running loop. Turning it off
 * ("keep") leaves the notes exactly as they were, now as ordinary editable
 * data. Typing into a live lane keeps it too — an edit you would otherwise lose
 * on the next re-roll.
 */
export interface TrackGenerator {
  pitch: PitchKind;
  rhythm: RhythmKind;
  low: number;
  high: number;
  stepwise: number;
  /** Onsets, for the euclidean rhythm. */
  pulses: number;
  rotation: number;
  /** Onset chance, for the random rhythm. */
  density: number;
  seed: number;
  live: boolean;
}

export const DEFAULT_GENERATOR: TrackGenerator = {
  pitch: 'walk',
  rhythm: 'euclidean',
  low: -2,
  high: 7,
  stepwise: 0.7,
  pulses: 7,
  rotation: 0,
  density: 0.6,
  seed: 1,
  live: false,
};

/** One track's content inside one pattern. */
export interface Lane {
  steps: StepSlot[];
  generator: TrackGenerator;
}

/** A channel. Global to the song, shared by every pattern. */
export interface Track {
  id: string;
  name: string;
  instrumentId: string;
  /** Note length as a multiple of the step length; above 1, notes overlap. */
  gate: number;
  level: number;
  mute: boolean;
  solo: boolean;
  polyphony: number;
}

export interface Pattern {
  id: string;
  name: string;
  stepCount: number;
  /** Keyed by track id. A track with no lane here simply rests. */
  lanes: Record<string, Lane>;
}

export interface Song {
  bpm: number;
  /** Steps per quarter note. 4 gives sixteenth-note resolution. */
  stepsPerBeat: number;
  /** Root note name, e.g. "C3". */
  key: string;
  scaleName: ScaleName;
  tracks: Track[];
  patterns: Pattern[];
  /** Pattern ids, in the sequence they play. May repeat. */
  order: string[];
  instruments: Record<string, InstrumentGraph>;
}

export const MIN_STEPS = 4;
export const MAX_STEPS = 64;
export const MAX_TRACKS = 8;
export const MAX_PATTERNS = 16;

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}${idCounter}`;
}

export function emptySteps(count: number): StepSlot[] {
  return new Array<StepSlot>(count).fill(null);
}

export function createLane(stepCount: number, overrides: Partial<Lane> = {}): Lane {
  return {
    steps: emptySteps(stepCount),
    generator: { ...DEFAULT_GENERATOR },
    ...overrides,
  };
}

export function createTrack(
  name: string,
  instrumentId: string,
  overrides: Partial<Track> = {},
): Track {
  return {
    id: nextId('t'),
    name,
    instrumentId,
    gate: 0.9,
    level: 0.8,
    mute: false,
    solo: false,
    polyphony: 6,
    ...overrides,
  };
}

export function createPattern(
  name: string,
  stepCount: number,
  trackIds: string[],
  lanes: Record<string, Lane> = {},
): Pattern {
  const filled: Record<string, Lane> = {};
  for (const id of trackIds) filled[id] = lanes[id] ?? createLane(stepCount);
  return { id: nextId('p'), name, stepCount, lanes: filled };
}

/** Turns a phrase of degrees and rests into step slots. */
function toSteps(phrase: (number | null)[], count: number): StepSlot[] {
  return Array.from({ length: count }, (_, i) => {
    const degree = phrase[mod(i, Math.max(1, phrase.length))];
    return degree === null || degree === undefined ? null : { degree };
  });
}

/**
 * A starting song: four channels, two patterns, already playing something.
 *
 * An empty grid on first visit means pressing play does nothing, which reads as
 * broken rather than blank. Everything here is deterministic, so the opening
 * bars are the same for everyone. The second pattern is a variation, so the
 * order list has something real to sequence.
 */
export function createSong(): Song {
  const stepCount = 16;
  const tracks = [
    createTrack('lead', 'lead'),
    createTrack('bass', 'bass', { gate: 0.8, polyphony: 2 }),
    createTrack('pluck', 'pluck', { level: 0.6 }),
    createTrack('pad', 'pad', { gate: 3.5, level: 0.5, polyphony: 3 }),
  ];
  const [lead, bass, pluck, pad] = tracks.map((t) => t.id);
  const trackIds = tracks.map((t) => t.id);

  const leadA = generatePhrase({
    length: stepCount, low: -2, high: 7, restDensity: 0.3, stepwise: 0.8, seed: 20260909,
  });
  const leadB = generatePhrase({
    length: stepCount, low: 0, high: 9, restDensity: 0.35, stepwise: 0.6, seed: 4242,
  });
  const bassA = Array.from({ length: stepCount }, (_, i) =>
    (i % 4 === 0 ? (i === 12 ? -3 : -7) : null));
  const bassB = Array.from({ length: stepCount }, (_, i) =>
    (i % 4 === 0 ? (i === 8 ? -5 : -7) : null));
  const pluckLine = generateArpeggio(0, stepCount, [0, 2, 4], 2, 7)
    .map((degree, i) => (i % 2 === 1 ? degree : null));
  const padLine = Array.from({ length: stepCount }, (_, i) => (i === 0 ? 0 : i === 8 ? 3 : null));

  const patternA = createPattern('A', stepCount, trackIds, {
    [lead]: createLane(stepCount, { steps: toSteps(leadA, stepCount) }),
    [bass]: createLane(stepCount, { steps: toSteps(bassA, stepCount) }),
    [pluck]: createLane(stepCount, { steps: toSteps(pluckLine, stepCount) }),
    [pad]: createLane(stepCount, { steps: toSteps(padLine, stepCount) }),
  });
  const patternB = createPattern('B', stepCount, trackIds, {
    [lead]: createLane(stepCount, { steps: toSteps(leadB, stepCount) }),
    [bass]: createLane(stepCount, { steps: toSteps(bassB, stepCount) }),
    [pluck]: createLane(stepCount, { steps: toSteps(pluckLine, stepCount) }),
    [pad]: createLane(stepCount, { steps: toSteps(padLine, stepCount) }),
  });

  return {
    bpm: 110,
    stepsPerBeat: 4,
    key: 'C3',
    scaleName: 'dorian',
    tracks,
    patterns: [patternA, patternB],
    order: [patternA.id, patternA.id, patternB.id, patternA.id],
    instruments: {
      lead: presetGraph('default'),
      bass: presetGraph('bass'),
      pluck: presetGraph('pluck'),
      pad: presetGraph('pad'),
    },
  };
}

// ---- lookups ----------------------------------------------------------------

/** Degrees per octave for the song's mode, needed by the arpeggio generator. */
export function scaleSizeOf(song: Song): number {
  return SCALE_PATTERNS[song.scaleName]?.length ?? 7;
}

export function findPattern(song: Song, patternId: string): Pattern | undefined {
  return song.patterns.find((p) => p.id === patternId);
}

/**
 * Whether a track should sound. Solo is exclusive across the song: if any track
 * is soloed, the others are silent regardless of their own mute flag.
 */
export function isAudible(song: Song, track: Track): boolean {
  const anySolo = song.tracks.some((t) => t.solo);
  return anySolo ? track.solo : !track.mute;
}

/** Total steps in one pass through the order list. */
export function orderLength(song: Song): number {
  return song.order.reduce((total, id) => total + (findPattern(song, id)?.stepCount ?? 0), 0);
}

/**
 * Maps a monotonic step counter onto a position in the arrangement.
 *
 * The scheduler counts upward without wrapping, because patterns may differ in
 * length and the wrap point is therefore not a constant. Walking the order here
 * keeps that knowledge in one place.
 */
export function positionAt(song: Song, step: number): { orderIndex: number; row: number } | null {
  const total = orderLength(song);
  if (total <= 0 || song.order.length === 0) return null;
  let remaining = mod(step, total);
  for (let i = 0; i < song.order.length; ++i) {
    const pattern = findPattern(song, song.order[i]);
    const length = pattern?.stepCount ?? 0;
    if (length <= 0) continue;
    if (remaining < length) return { orderIndex: i, row: remaining };
    remaining -= length;
  }
  return { orderIndex: 0, row: 0 };
}

// ---- pattern edits ----------------------------------------------------------

export function updatePattern(song: Song, patternId: string, patch: Partial<Pattern>): Song {
  return {
    ...song,
    patterns: song.patterns.map((p) => (p.id === patternId ? { ...p, ...patch } : p)),
  };
}

export function updateLane(
  song: Song,
  patternId: string,
  trackId: string,
  patch: Partial<Lane>,
): Song {
  const pattern = findPattern(song, patternId);
  if (!pattern) return song;
  const lane = pattern.lanes[trackId] ?? createLane(pattern.stepCount);
  return updatePattern(song, patternId, {
    lanes: { ...pattern.lanes, [trackId]: { ...lane, ...patch } },
  });
}

export function setStep(
  song: Song,
  patternId: string,
  trackId: string,
  index: number,
  step: StepSlot,
): Song {
  const lane = findPattern(song, patternId)?.lanes[trackId];
  if (!lane) return song;
  const steps = lane.steps.slice();
  steps[index] = step;
  return updateLane(song, patternId, trackId, { steps });
}

export function clearLane(song: Song, patternId: string, trackId: string): Song {
  const pattern = findPattern(song, patternId);
  if (!pattern) return song;
  return updateLane(song, patternId, trackId, { steps: emptySteps(pattern.stepCount) });
}

/** Shifts a lane's notes by whole steps, wrapping inside the pattern. */
export function rotateLane(song: Song, patternId: string, trackId: string, by: number): Song {
  const lane = findPattern(song, patternId)?.lanes[trackId];
  if (!lane) return song;
  const n = lane.steps.length;
  return updateLane(song, patternId, trackId, {
    steps: Array.from({ length: n }, (_, i) => lane.steps[mod(i - by, n)]),
  });
}

/** Transposes a lane by whole scale degrees. */
export function transposeLane(song: Song, patternId: string, trackId: string, by: number): Song {
  const lane = findPattern(song, patternId)?.lanes[trackId];
  if (!lane) return song;
  return updateLane(song, patternId, trackId, {
    steps: lane.steps.map((s) => (s === null ? null : { ...s, degree: s.degree + by })),
  });
}

/**
 * Resizes one pattern. Growing pads with rests; shrinking truncates. Both keep
 * the material that fits rather than regenerating, so nudging a pattern's
 * length does not throw away what you have written.
 */
export function setPatternLength(song: Song, patternId: string, stepCount: number): Song {
  const pattern = findPattern(song, patternId);
  if (!pattern) return song;
  const count = Math.max(MIN_STEPS, Math.min(MAX_STEPS, Math.round(stepCount)));
  if (count === pattern.stepCount) return song;

  const lanes: Record<string, Lane> = {};
  for (const [trackId, lane] of Object.entries(pattern.lanes)) {
    lanes[trackId] = {
      ...lane,
      steps: Array.from({ length: count }, (_, i) => lane.steps[i] ?? null),
    };
  }
  // Live lanes fill the new length rather than trailing rests behind them.
  return regenerateLivePattern(
    updatePattern(song, patternId, { stepCount: count, lanes }),
    patternId,
  );
}

export function addPattern(song: Song, copyFrom?: string): Song {
  if (song.patterns.length >= MAX_PATTERNS) return song;
  const source = copyFrom ? findPattern(song, copyFrom) : undefined;
  const trackIds = song.tracks.map((t) => t.id);
  const name = String.fromCharCode(65 + (song.patterns.length % 26));
  const lanes: Record<string, Lane> = {};
  if (source) {
    for (const id of trackIds) {
      const lane = source.lanes[id];
      lanes[id] = lane
        ? { steps: lane.steps.slice(), generator: { ...lane.generator } }
        : createLane(source.stepCount);
    }
  }
  const pattern = createPattern(name, source?.stepCount ?? 16, trackIds, lanes);
  return { ...song, patterns: [...song.patterns, pattern], order: [...song.order, pattern.id] };
}

export function removePattern(song: Song, patternId: string): Song {
  if (song.patterns.length <= 1) return song;
  const patterns = song.patterns.filter((p) => p.id !== patternId);
  const order = song.order.filter((id) => id !== patternId);
  return { ...song, patterns, order: order.length > 0 ? order : [patterns[0].id] };
}

// ---- order edits ------------------------------------------------------------

export function appendToOrder(song: Song, patternId: string): Song {
  return { ...song, order: [...song.order, patternId] };
}

export function setOrderSlot(song: Song, index: number, patternId: string): Song {
  return { ...song, order: song.order.map((id, i) => (i === index ? patternId : id)) };
}

export function removeOrderSlot(song: Song, index: number): Song {
  if (song.order.length <= 1) return song;
  return { ...song, order: song.order.filter((_, i) => i !== index) };
}

export function moveOrderSlot(song: Song, index: number, delta: number): Song {
  const target = index + delta;
  if (target < 0 || target >= song.order.length) return song;
  const order = song.order.slice();
  [order[index], order[target]] = [order[target], order[index]];
  return { ...song, order };
}

// ---- track edits ------------------------------------------------------------

export function updateTrack(song: Song, trackId: string, patch: Partial<Track>): Song {
  return {
    ...song,
    tracks: song.tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)),
  };
}

export function addTrack(song: Song): Song {
  if (song.tracks.length >= MAX_TRACKS) return song;
  const instrumentId = Object.keys(song.instruments)[0] ?? 'lead';
  const track = createTrack(`track ${song.tracks.length + 1}`, instrumentId);
  return {
    ...song,
    tracks: [...song.tracks, track],
    // Every pattern gains an empty lane, so the new channel exists everywhere.
    patterns: song.patterns.map((p) => ({
      ...p,
      lanes: { ...p.lanes, [track.id]: createLane(p.stepCount) },
    })),
  };
}

export function removeTrack(song: Song, trackId: string): Song {
  if (song.tracks.length <= 1) return song;
  return {
    ...song,
    tracks: song.tracks.filter((t) => t.id !== trackId),
    patterns: song.patterns.map((p) => {
      const lanes = { ...p.lanes };
      delete lanes[trackId];
      return { ...p, lanes };
    }),
  };
}

// ---- generation -------------------------------------------------------------

/** Re-derives one lane's steps from its generator settings. */
export function regenerateLane(song: Song, patternId: string, trackId: string): Song {
  const pattern = findPattern(song, patternId);
  const lane = pattern?.lanes[trackId];
  if (!pattern || !lane) return song;
  const phrase = generateTrackPhrase(lane.generator, pattern.stepCount, scaleSizeOf(song));
  return updateLane(song, patternId, trackId, { steps: toSteps(phrase, pattern.stepCount) });
}

/** Re-derives every live lane in one pattern. */
export function regenerateLivePattern(song: Song, patternId: string): Song {
  const pattern = findPattern(song, patternId);
  if (!pattern) return song;
  const size = scaleSizeOf(song);
  const lanes: Record<string, Lane> = {};
  for (const [trackId, lane] of Object.entries(pattern.lanes)) {
    lanes[trackId] = lane.generator.live
      ? {
          ...lane,
          steps: toSteps(
            generateTrackPhrase(lane.generator, pattern.stepCount, size),
            pattern.stepCount,
          ),
        }
      : lane;
  }
  return updatePattern(song, patternId, { lanes });
}

/**
 * Re-derives every live lane in the song. Called when something they all depend
 * on changes — the mode — so a live lane never drifts out of sync with the song
 * around it.
 */
export function regenerateLiveLanes(song: Song): Song {
  return song.patterns.reduce((current, p) => regenerateLivePattern(current, p.id), song);
}

export function setGenerator(
  song: Song,
  patternId: string,
  trackId: string,
  patch: Partial<TrackGenerator>,
): Song {
  const lane = findPattern(song, patternId)?.lanes[trackId];
  if (!lane) return song;
  const next = updateLane(song, patternId, trackId, {
    generator: { ...lane.generator, ...patch },
  });
  return next.patterns.find((p) => p.id === patternId)?.lanes[trackId]?.generator.live
    ? regenerateLane(next, patternId, trackId)
    : next;
}

export function reseedLane(song: Song, patternId: string, trackId: string): Song {
  return setGenerator(song, patternId, trackId, { seed: randomSeed() });
}

/**
 * Turns generation off, keeping the notes it produced. The steps are already
 * real data, so this only clears the flag — nothing is rewritten.
 */
export function keepLane(song: Song, patternId: string, trackId: string): Song {
  return setGenerator(song, patternId, trackId, { live: false });
}
