import { newEdgeId, type GraphEdge, type GraphNode, type InstrumentGraph } from './graph';
import { defaultParams } from './nodes/registry';
import { DEFAULT_INSTRUMENT, PRESETS, type InstrumentParams } from './InstrumentParams';

/**
 * Starting graphs, and the bridge from the flat phase-2 patch format.
 *
 * `graphFromParams` is what lets a song saved before the graph existed keep
 * playing: every old patch has an exact graph equivalent, so the migration is
 * lossless rather than a reset to defaults.
 */

function node(
  id: string,
  type: string,
  x: number,
  y: number,
  params: Record<string, number | string> = {},
): GraphNode {
  return { id, type, position: { x, y }, params: { ...defaultParams(type), ...params } };
}

function edge(from: string, to: string, port = 'in'): GraphEdge {
  return { id: newEdgeId(), from: { node: from, port: 'out' }, to: { node: to, port } };
}

/**
 * The exact graph equivalent of a flat phase-2 patch.
 *
 * Two details keep it lossless. Each oscillator's level is 1/count, which is
 * the same normalisation the old voice applied by dividing the envelope peak.
 * And the amp envelope's `amount` carries the patch gain, because the envelope
 * curve itself runs 0..velocity — so amount × velocity reproduces the old
 * peak of gain × velocity.
 */
export function graphFromParams(params: InstrumentParams): InstrumentGraph {
  const stereo = params.spread > 0;
  const level = stereo ? 0.5 : 1;

  const nodes: GraphNode[] = [
    node('osc1', 'oscillator', 0, 0, {
      waveform: params.waveform,
      detune: params.detune - (stereo ? params.spread : 0),
      level,
    }),
    node('filter', 'filter', 260, 60, {
      kind: params.filter.type,
      cutoff: params.filter.cutoff,
      resonance: params.filter.q,
    }),
    node('amp', 'gain', 520, 60, { level: 1 }),
    node('output', 'output', 780, 60),
    node('ampEnv', 'envelope', 260, 260, {
      attack: params.amp.attack,
      decay: params.amp.decay,
      sustain: params.amp.sustain,
      release: params.amp.release,
      amount: params.gain,
    }),
  ];

  const edges: GraphEdge[] = [
    edge('osc1', 'filter'),
    edge('filter', 'amp'),
    edge('amp', 'output'),
    edge('ampEnv', 'amp', 'level'),
  ];

  if (stereo) {
    nodes.splice(1, 0, node('osc2', 'oscillator', 0, 150, {
      waveform: params.waveform,
      detune: params.detune + params.spread,
      level,
    }));
    edges.splice(1, 0, edge('osc2', 'filter'));
  }

  if (params.filter.envelopeAmount !== 0) {
    nodes.push(node('filterEnv', 'envelope', 520, 260, {
      attack: params.amp.attack,
      decay: params.amp.decay,
      sustain: 0,
      release: params.amp.release,
      amount: params.filter.envelopeAmount,
    }));
    edges.push(edge('filterEnv', 'filter', 'cutoff'));
  }

  return { nodes, edges };
}

/** A patch that shows what the graph can do that the flat format could not. */
function spaceGraph(): InstrumentGraph {
  return {
    nodes: [
      node('osc1', 'oscillator', 0, 0, { waveform: 'triangle', detune: -6, level: 0.5 }),
      node('osc2', 'oscillator', 0, 150, { waveform: 'sawtooth', detune: 6, level: 0.3 }),
      node('filter', 'filter', 260, 60, { kind: 'lowpass', cutoff: 900, resonance: 6 }),
      node('amp', 'gain', 520, 60, { level: 1 }),
      node('delay', 'delay', 780, 60, { time: 0.33, feedback: 0.4, mix: 0.35 }),
      node('reverb', 'reverb', 1040, 60, { size: 2.6, decay: 2.4, mix: 0.35 }),
      node('output', 'output', 1300, 60),
      node('ampEnv', 'envelope', 260, 300, {
        attack: 0.02, decay: 0.35, sustain: 0.5, release: 0.5, amount: 0.45,
      }),
      node('filterEnv', 'envelope', 520, 300, {
        attack: 0.05, decay: 0.6, sustain: 0, release: 0.4, amount: 2600,
      }),
      node('vibrato', 'lfo', 0, 320, { waveform: 'sine', rate: 4.5, amount: 8 }),
    ],
    edges: [
      edge('osc1', 'filter'),
      edge('osc2', 'filter'),
      edge('filter', 'amp'),
      edge('amp', 'delay'),
      edge('delay', 'reverb'),
      edge('reverb', 'output'),
      edge('ampEnv', 'amp', 'level'),
      edge('filterEnv', 'filter', 'cutoff'),
      edge('vibrato', 'osc1', 'detune'),
      edge('vibrato', 'osc2', 'detune'),
    ],
  };
}

/** Noise through a bandpass with a fast envelope — a hi-hat or a snare body. */
function percussionGraph(): InstrumentGraph {
  return {
    nodes: [
      node('noise', 'noise', 0, 0, { level: 0.8 }),
      node('filter', 'filter', 260, 0, { kind: 'bandpass', cutoff: 3200, resonance: 3 }),
      node('amp', 'gain', 520, 0, { level: 1 }),
      node('output', 'output', 780, 0),
      node('ampEnv', 'envelope', 260, 220, {
        attack: 0.001, decay: 0.08, sustain: 0, release: 0.05, amount: 0.5,
      }),
    ],
    edges: [
      edge('noise', 'filter'),
      edge('filter', 'amp'),
      edge('amp', 'output'),
      edge('ampEnv', 'amp', 'level'),
    ],
  };
}

export const GRAPH_PRESETS: Record<string, () => InstrumentGraph> = {
  default: () => graphFromParams(DEFAULT_INSTRUMENT),
  pluck: () => graphFromParams(PRESETS.pluck),
  bass: () => graphFromParams(PRESETS.bass),
  pad: () => graphFromParams(PRESETS.pad),
  glass: () => graphFromParams(PRESETS.glass),
  space: spaceGraph,
  percussion: percussionGraph,
};

export const GRAPH_PRESET_NAMES = Object.keys(GRAPH_PRESETS);

export function presetGraph(name: string): InstrumentGraph {
  return (GRAPH_PRESETS[name] ?? GRAPH_PRESETS.default)();
}
