import {
  createSong, DEFAULT_GENERATOR, MAX_STEPS, MIN_STEPS,
  type Song, type StepSlot, type Track, type TrackGenerator,
} from './song';
import type { PitchKind, RhythmKind } from './generate';
import { SCALE_PATTERNS, type ScaleName } from './scale';
import { DEFAULT_INSTRUMENT, type InstrumentParams } from '../audio/InstrumentParams';
import { definitionFor } from '../audio/nodes/registry';
import { graphFromParams, presetGraph } from '../audio/graph-presets';
import type { GraphEdge, GraphNode, InstrumentGraph } from '../audio/graph';

/**
 * Save and load, with the version field that makes later migrations possible.
 *
 * Loading is defensive rather than trusting: stored JSON can be from an older
 * build, hand-edited, or truncated, and a song that fails to load should cost
 * you the autosave, not the page. Every field is checked and falls back to the
 * default, so a partially corrupt save still opens.
 */

/**
 * 1: instruments were flat InstrumentParams.
 * 2: instruments are node graphs. v1 patches migrate losslessly via
 *    graphFromParams — every old patch has an exact graph equivalent, so an
 *    autosave from before the editor existed still sounds the same.
 */
export const SONG_VERSION = 2;
export const STORAGE_KEY = 'aria-song';

interface SavedSong {
  version: number;
  song: Song;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function parseStep(value: unknown): StepSlot {
  if (!isRecord(value)) return null;
  const degree = value.degree;
  if (typeof degree !== 'number' || !Number.isFinite(degree)) return null;
  const step: StepSlot = { degree: Math.round(degree) };
  if (typeof value.velocity === 'number') step.velocity = num(value.velocity, 1, 0, 1);
  return step;
}

function parseInstrument(value: unknown): InstrumentParams {
  if (!isRecord(value)) return DEFAULT_INSTRUMENT;
  const filter = isRecord(value.filter) ? value.filter : {};
  const amp = isRecord(value.amp) ? value.amp : {};
  const waveforms = ['sine', 'square', 'sawtooth', 'triangle'];
  const filterTypes = ['lowpass', 'highpass', 'bandpass', 'notch'];
  const waveform = typeof value.waveform === 'string' && waveforms.includes(value.waveform)
    ? (value.waveform as OscillatorType)
    : DEFAULT_INSTRUMENT.waveform;
  const filterType = typeof filter.type === 'string' && filterTypes.includes(filter.type)
    ? (filter.type as BiquadFilterType)
    : DEFAULT_INSTRUMENT.filter.type;

  return {
    waveform,
    detune: num(value.detune, 0, -1200, 1200),
    spread: num(value.spread, DEFAULT_INSTRUMENT.spread, 0, 100),
    filter: {
      type: filterType,
      cutoff: num(filter.cutoff, DEFAULT_INSTRUMENT.filter.cutoff, 20, 20000),
      q: num(filter.q, DEFAULT_INSTRUMENT.filter.q, 0.0001, 40),
      envelopeAmount: num(filter.envelopeAmount, DEFAULT_INSTRUMENT.filter.envelopeAmount, 0, 20000),
    },
    amp: {
      attack: num(amp.attack, DEFAULT_INSTRUMENT.amp.attack, 0.0001, 10),
      decay: num(amp.decay, DEFAULT_INSTRUMENT.amp.decay, 0.0001, 10),
      sustain: num(amp.sustain, DEFAULT_INSTRUMENT.amp.sustain, 0, 1),
      release: num(amp.release, DEFAULT_INSTRUMENT.amp.release, 0.0001, 10),
    },
    gain: num(value.gain, DEFAULT_INSTRUMENT.gain, 0, 1),
  };
}

const PITCH_KINDS: PitchKind[] = ['walk', 'arpeggio', 'drone'];
const RHYTHM_KINDS: RhythmKind[] = ['every', 'euclidean', 'random'];

function parseGenerator(value: unknown, stepCount: number): TrackGenerator {
  if (!isRecord(value)) return { ...DEFAULT_GENERATOR };
  const pitch = PITCH_KINDS.includes(value.pitch as PitchKind)
    ? (value.pitch as PitchKind)
    : DEFAULT_GENERATOR.pitch;
  const rhythm = RHYTHM_KINDS.includes(value.rhythm as RhythmKind)
    ? (value.rhythm as RhythmKind)
    : DEFAULT_GENERATOR.rhythm;
  return {
    pitch,
    rhythm,
    low: Math.round(num(value.low, DEFAULT_GENERATOR.low, -28, 28)),
    high: Math.round(num(value.high, DEFAULT_GENERATOR.high, -28, 28)),
    stepwise: num(value.stepwise, DEFAULT_GENERATOR.stepwise, 0, 1),
    pulses: Math.round(num(value.pulses, DEFAULT_GENERATOR.pulses, 0, stepCount)),
    rotation: Math.round(num(value.rotation, 0, -MAX_STEPS, MAX_STEPS)),
    density: num(value.density, DEFAULT_GENERATOR.density, 0, 1),
    seed: Math.round(num(value.seed, DEFAULT_GENERATOR.seed, 0, 0xffffffff)),
    live: bool(value.live, false),
  };
}

function parseGraphNode(value: unknown): GraphNode | null {
  if (!isRecord(value)) return null;
  const type = typeof value.type === 'string' ? value.type : '';
  const definition = definitionFor(type);
  if (!definition) return null;

  const rawParams = isRecord(value.params) ? value.params : {};
  const params: Record<string, number | string> = {};
  for (const def of definition.params) {
    params[def.name] = num(rawParams[def.name], def.default, def.min, def.max);
  }
  for (const def of definition.choices) {
    const raw = rawParams[def.name];
    params[def.name] = typeof raw === 'string' && def.options.includes(raw) ? raw : def.default;
  }

  const pos = isRecord(value.position) ? value.position : {};
  return {
    id: str(value.id, `${type}-${Math.random().toString(36).slice(2, 8)}`),
    type,
    params,
    position: { x: num(pos.x, 0, -20000, 20000), y: num(pos.y, 0, -20000, 20000) },
  };
}

function parseGraph(value: unknown): InstrumentGraph | null {
  if (!isRecord(value) || !Array.isArray(value.nodes)) return null;
  const nodes = value.nodes.map(parseGraphNode).filter((n): n is GraphNode => n !== null);
  if (nodes.length === 0) return null;

  const ids = new Set(nodes.map((n) => n.id));
  const rawEdges = Array.isArray(value.edges) ? value.edges : [];
  const edges: GraphEdge[] = [];
  for (const raw of rawEdges) {
    if (!isRecord(raw) || !isRecord(raw.from) || !isRecord(raw.to)) continue;
    const from = { node: str(raw.from.node, ''), port: str(raw.from.port, 'out') };
    const to = { node: str(raw.to.node, ''), port: str(raw.to.port, 'in') };
    // Drop edges pointing at nodes that did not survive parsing, rather than
    // leaving the compiler to trip over them.
    if (!ids.has(from.node) || !ids.has(to.node)) continue;
    edges.push({ id: str(raw.id, `e${edges.length}`), from, to });
  }
  return { nodes, edges };
}

function parseTrack(value: unknown, stepCount: number, fallbackInstrument: string): Track | null {
  if (!isRecord(value)) return null;
  const rawSteps = Array.isArray(value.steps) ? value.steps : [];
  return {
    id: str(value.id, `t${Math.random().toString(36).slice(2, 8)}`),
    name: str(value.name, 'track'),
    instrumentId: str(value.instrumentId, fallbackInstrument),
    steps: Array.from({ length: stepCount }, (_, i) => parseStep(rawSteps[i])),
    generator: parseGenerator(value.generator, stepCount),
    gate: num(value.gate, 0.9, 0.05, 8),
    level: num(value.level, 0.8, 0, 1),
    mute: bool(value.mute, false),
    solo: bool(value.solo, false),
    polyphony: Math.round(num(value.polyphony, 6, 1, 16)),
  };
}

/** Rebuilds a Song from unknown JSON, filling anything missing with defaults. */
export function parseSong(raw: unknown): Song {
  const fallback = createSong();
  if (!isRecord(raw)) return fallback;

  const payload = isRecord(raw.song) ? raw.song : raw;
  const stepCount = Math.round(num(payload.stepCount, fallback.stepCount, MIN_STEPS, MAX_STEPS));

  const version = typeof raw.version === 'number' ? raw.version : 1;
  const instrumentsRaw = isRecord(payload.instruments) ? payload.instruments : {};
  const instruments: Record<string, InstrumentGraph> = {};
  for (const [id, value] of Object.entries(instrumentsRaw)) {
    // Either shape may turn up regardless of the stated version, so decide by
    // looking at the value: a graph has nodes, a v1 patch has a waveform.
    const graph = version >= 2 ? parseGraph(value) : null;
    if (graph) {
      instruments[id] = graph;
    } else if (isRecord(value) && Array.isArray(value.nodes)) {
      instruments[id] = parseGraph(value) ?? presetGraph('default');
    } else {
      instruments[id] = graphFromParams(parseInstrument(value));
    }
  }
  if (Object.keys(instruments).length === 0) Object.assign(instruments, fallback.instruments);
  const firstInstrument = Object.keys(instruments)[0];

  const tracksRaw = Array.isArray(payload.tracks) ? payload.tracks : [];
  const tracks = tracksRaw
    .map((t) => parseTrack(t, stepCount, firstInstrument))
    .filter((t): t is Track => t !== null);

  const scaleName = typeof payload.scaleName === 'string' && payload.scaleName in SCALE_PATTERNS
    ? (payload.scaleName as ScaleName)
    : fallback.scaleName;

  return {
    bpm: num(payload.bpm, fallback.bpm, 20, 300),
    stepsPerBeat: Math.round(num(payload.stepsPerBeat, fallback.stepsPerBeat, 1, 8)),
    stepCount,
    key: str(payload.key, fallback.key),
    scaleName,
    instruments,
    tracks: tracks.length > 0 ? tracks : fallback.tracks,
  };
}

export function serializeSong(song: Song): string {
  const payload: SavedSong = { version: SONG_VERSION, song };
  return JSON.stringify(payload);
}

/** Writes the autosave. Storage can throw in private mode, so failures are ignored. */
export function saveSong(song: Song): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeSong(song));
  } catch {
    // Quota exceeded or storage disabled; the song is still in memory.
  }
}

/** Reads the autosave, or null when there is nothing usable stored. */
export function loadSong(): Song | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return parseSong(JSON.parse(stored));
  } catch {
    return null;
  }
}

export function clearSavedSong(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}
