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

// ---- additional patches ------------------------------------------------------
//
// Each of these is a small demonstration of one thing the graph format buys
// over the flat patch: several oscillators at real intervals, an envelope
// pointed somewhere other than a gain, an LFO in the audio path, or an effect
// chain after the amp. They are written by hand rather than derived, because
// the point of each is a piece of wiring the old format could not express.

/** Three sines an octave apart — drawbars, near enough. */
function organGraph(): InstrumentGraph {
  return {
    nodes: [
      node('osc1', 'oscillator', 0, 0, { waveform: 'sine', octave: 0, level: 0.5 }),
      node('osc2', 'oscillator', 0, 150, { waveform: 'sine', octave: 1, level: 0.28 }),
      node('osc3', 'oscillator', 0, 300, { waveform: 'sine', octave: -1, level: 0.22 }),
      node('filter', 'filter', 260, 60, { kind: 'lowpass', cutoff: 4200, resonance: 0.8 }),
      node('amp', 'gain', 520, 60, { level: 1 }),
      node('reverb', 'reverb', 780, 60, { size: 1.6, decay: 2, mix: 0.18 }),
      node('output', 'output', 1040, 60),
      node('ampEnv', 'envelope', 260, 300, {
        attack: 0.01, decay: 0.05, sustain: 0.95, release: 0.12, amount: 0.4,
      }),
    ],
    edges: [
      edge('osc1', 'filter'), edge('osc2', 'filter'), edge('osc3', 'filter'),
      edge('filter', 'amp'), edge('amp', 'reverb'), edge('reverb', 'output'),
      edge('ampEnv', 'amp', 'level'),
    ],
  };
}

/** Struck metal: a fifth above the fundamental, no sustain, long tail. */
function bellGraph(): InstrumentGraph {
  return {
    nodes: [
      node('osc1', 'oscillator', 0, 0, { waveform: 'sine', level: 0.5 }),
      // 703 cents is a just fifth rather than a tempered one; the slow beating
      // against the fundamental is most of what makes this read as metal.
      node('osc2', 'oscillator', 0, 150, { waveform: 'sine', detune: 703, level: 0.3 }),
      node('osc3', 'oscillator', 0, 300, { waveform: 'sine', octave: 2, detune: -14, level: 0.12 }),
      node('amp', 'gain', 520, 60, { level: 1 }),
      node('reverb', 'reverb', 780, 60, { size: 3.4, decay: 3, mix: 0.4 }),
      node('output', 'output', 1040, 60),
      node('ampEnv', 'envelope', 260, 300, {
        attack: 0.002, decay: 2.2, sustain: 0, release: 1.6, amount: 0.5,
      }),
    ],
    edges: [
      edge('osc1', 'amp'), edge('osc2', 'amp'), edge('osc3', 'amp'),
      edge('amp', 'reverb'), edge('reverb', 'output'),
      edge('ampEnv', 'amp', 'level'),
    ],
  };
}

/** Saw stack, filter sweep and a little grit — the classic brass gesture. */
function brassGraph(): InstrumentGraph {
  return {
    nodes: [
      node('osc1', 'oscillator', 0, 0, { waveform: 'sawtooth', detune: -7, level: 0.4 }),
      node('osc2', 'oscillator', 0, 150, { waveform: 'sawtooth', detune: 7, level: 0.4 }),
      node('filter', 'filter', 260, 60, { kind: 'lowpass', cutoff: 700, resonance: 3 }),
      node('drive', 'drive', 520, 60, { amount: 18 }),
      node('amp', 'gain', 780, 60, { level: 1 }),
      node('reverb', 'reverb', 1040, 60, { size: 1.4, decay: 1.8, mix: 0.16 }),
      node('output', 'output', 1300, 60),
      node('ampEnv', 'envelope', 260, 320, {
        attack: 0.06, decay: 0.2, sustain: 0.8, release: 0.22, amount: 0.34,
      }),
      node('filterEnv', 'envelope', 520, 320, {
        attack: 0.09, decay: 0.5, sustain: 0.25, release: 0.3, amount: 3400,
      }),
      node('vibrato', 'lfo', 0, 320, { waveform: 'sine', rate: 5.2, amount: 6 }),
    ],
    edges: [
      edge('osc1', 'filter'), edge('osc2', 'filter'),
      edge('filter', 'drive'), edge('drive', 'amp'),
      edge('amp', 'reverb'), edge('reverb', 'output'),
      edge('ampEnv', 'amp', 'level'), edge('filterEnv', 'filter', 'cutoff'),
      edge('vibrato', 'osc1', 'detune'), edge('vibrato', 'osc2', 'detune'),
    ],
  };
}

/** Wide detuned saws with a slow swell, and an LFO drifting the cutoff. */
function stringsGraph(): InstrumentGraph {
  return {
    nodes: [
      node('osc1', 'oscillator', 0, 0, { waveform: 'sawtooth', detune: -11, level: 0.3 }),
      node('osc2', 'oscillator', 0, 150, { waveform: 'sawtooth', detune: 11, level: 0.3 }),
      node('osc3', 'oscillator', 0, 300, { waveform: 'triangle', octave: -1, level: 0.24 }),
      node('filter', 'filter', 260, 60, { kind: 'lowpass', cutoff: 2100, resonance: 1.2 }),
      node('amp', 'gain', 520, 60, { level: 1 }),
      node('reverb', 'reverb', 780, 60, { size: 4, decay: 3.2, mix: 0.42 }),
      node('output', 'output', 1040, 60),
      node('ampEnv', 'envelope', 260, 320, {
        attack: 0.5, decay: 0.6, sustain: 0.75, release: 1.4, amount: 0.34,
      }),
      node('swell', 'lfo', 0, 460, { waveform: 'triangle', rate: 0.22, amount: 320 }),
    ],
    edges: [
      edge('osc1', 'filter'), edge('osc2', 'filter'), edge('osc3', 'filter'),
      edge('filter', 'amp'), edge('amp', 'reverb'), edge('reverb', 'output'),
      edge('ampEnv', 'amp', 'level'), edge('swell', 'filter', 'cutoff'),
    ],
  };
}

/** An LFO on a resonant cutoff. The filter is the instrument here, not the saw. */
function wobbleGraph(): InstrumentGraph {
  return {
    nodes: [
      node('osc1', 'oscillator', 0, 0, { waveform: 'sawtooth', octave: -1, level: 0.55 }),
      node('osc2', 'oscillator', 0, 150, { waveform: 'square', octave: -2, level: 0.3 }),
      node('filter', 'filter', 260, 60, { kind: 'lowpass', cutoff: 520, resonance: 13 }),
      node('drive', 'drive', 520, 60, { amount: 34 }),
      node('amp', 'gain', 780, 60, { level: 1 }),
      node('output', 'output', 1040, 60),
      node('ampEnv', 'envelope', 260, 320, {
        attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.1, amount: 0.3,
      }),
      node('wobble', 'lfo', 0, 320, { waveform: 'sine', rate: 5.5, amount: 900 }),
    ],
    edges: [
      edge('osc1', 'filter'), edge('osc2', 'filter'),
      edge('filter', 'drive'), edge('drive', 'amp'), edge('amp', 'output'),
      edge('ampEnv', 'amp', 'level'), edge('wobble', 'filter', 'cutoff'),
    ],
  };
}

/** Wooden and dry: a bandpass picks one partial out of a triangle. */
function marimbaGraph(): InstrumentGraph {
  return {
    nodes: [
      node('osc1', 'oscillator', 0, 0, { waveform: 'triangle', level: 0.6 }),
      node('osc2', 'oscillator', 0, 150, { waveform: 'sine', octave: 2, level: 0.18 }),
      node('filter', 'filter', 260, 60, { kind: 'bandpass', cutoff: 1400, resonance: 2.4 }),
      node('amp', 'gain', 520, 60, { level: 1 }),
      node('reverb', 'reverb', 780, 60, { size: 1, decay: 1.6, mix: 0.14 }),
      node('output', 'output', 1040, 60),
      node('ampEnv', 'envelope', 260, 300, {
        attack: 0.002, decay: 0.38, sustain: 0, release: 0.2, amount: 0.55,
      }),
    ],
    edges: [
      edge('osc1', 'filter'), edge('osc2', 'filter'),
      edge('filter', 'amp'), edge('amp', 'reverb'), edge('reverb', 'output'),
      edge('ampEnv', 'amp', 'level'),
    ],
  };
}

/**
 * A kick drum, which is really a pitch envelope: the sine starts two octaves
 * up and falls onto the fundamental inside 55ms. That drop is the thump, and
 * it is exactly the wiring the flat patch format had no way to describe.
 */
function kickGraph(): InstrumentGraph {
  return {
    nodes: [
      node('osc1', 'oscillator', 0, 0, { waveform: 'sine', octave: -1, level: 0.9 }),
      node('drive', 'drive', 260, 60, { amount: 22 }),
      node('amp', 'gain', 520, 60, { level: 1 }),
      node('output', 'output', 780, 60),
      node('ampEnv', 'envelope', 260, 300, {
        attack: 0.001, decay: 0.3, sustain: 0, release: 0.08, amount: 0.9,
      }),
      node('pitchEnv', 'envelope', 0, 300, {
        attack: 0.001, decay: 0.055, sustain: 0, release: 0.02, amount: 2400,
      }),
    ],
    edges: [
      edge('osc1', 'drive'), edge('drive', 'amp'), edge('amp', 'output'),
      edge('ampEnv', 'amp', 'level'), edge('pitchEnv', 'osc1', 'detune'),
    ],
  };
}

/** Noise for the rattle, a tuned triangle for the body. */
function snareGraph(): InstrumentGraph {
  return {
    nodes: [
      node('noise', 'noise', 0, 0, { level: 0.7 }),
      node('body', 'oscillator', 0, 150, { waveform: 'triangle', octave: -1, level: 0.35 }),
      node('filter', 'filter', 260, 60, { kind: 'bandpass', cutoff: 1900, resonance: 1.6 }),
      node('amp', 'gain', 520, 60, { level: 1 }),
      node('reverb', 'reverb', 780, 60, { size: 0.8, decay: 1.4, mix: 0.2 }),
      node('output', 'output', 1040, 60),
      node('ampEnv', 'envelope', 260, 300, {
        attack: 0.001, decay: 0.16, sustain: 0, release: 0.08, amount: 0.55,
      }),
    ],
    edges: [
      edge('noise', 'filter'), edge('body', 'filter'),
      edge('filter', 'amp'), edge('amp', 'reverb'), edge('reverb', 'output'),
      edge('ampEnv', 'amp', 'level'),
    ],
  };
}

/** Highpassed noise, gone almost before it arrives. */
function hatGraph(): InstrumentGraph {
  return {
    nodes: [
      node('noise', 'noise', 0, 0, { level: 0.5 }),
      node('filter', 'filter', 260, 0, { kind: 'highpass', cutoff: 7800, resonance: 1 }),
      node('amp', 'gain', 520, 0, { level: 1 }),
      node('output', 'output', 780, 0),
      node('ampEnv', 'envelope', 260, 220, {
        attack: 0.001, decay: 0.045, sustain: 0, release: 0.03, amount: 0.4,
      }),
    ],
    edges: [
      edge('noise', 'filter'), edge('filter', 'amp'), edge('amp', 'output'),
      edge('ampEnv', 'amp', 'level'),
    ],
  };
}

/** A sine an octave down and nothing else. Leaves room for everything above it. */
function subGraph(): InstrumentGraph {
  return {
    nodes: [
      node('osc1', 'oscillator', 0, 0, { waveform: 'sine', octave: -1, level: 0.9 }),
      node('filter', 'filter', 260, 0, { kind: 'lowpass', cutoff: 320, resonance: 0.7 }),
      node('amp', 'gain', 520, 0, { level: 1 }),
      node('output', 'output', 780, 0),
      node('ampEnv', 'envelope', 260, 220, {
        attack: 0.012, decay: 0.1, sustain: 0.85, release: 0.1, amount: 0.5,
      }),
    ],
    edges: [
      edge('osc1', 'filter'), edge('filter', 'amp'), edge('amp', 'output'),
      edge('ampEnv', 'amp', 'level'),
    ],
  };
}

/** Breathy and slow, smeared by a delay before the reverb gets to it. */
function choirGraph(): InstrumentGraph {
  return {
    nodes: [
      node('osc1', 'oscillator', 0, 0, { waveform: 'triangle', detune: -9, level: 0.34 }),
      node('osc2', 'oscillator', 0, 150, { waveform: 'triangle', detune: 9, level: 0.34 }),
      node('breath', 'noise', 0, 300, { level: 0.05 }),
      node('filter', 'filter', 260, 60, { kind: 'lowpass', cutoff: 1500, resonance: 2 }),
      node('amp', 'gain', 520, 60, { level: 1 }),
      node('delay', 'delay', 780, 60, { time: 0.19, feedback: 0.22, mix: 0.24 }),
      node('reverb', 'reverb', 1040, 60, { size: 4.6, decay: 3.6, mix: 0.46 }),
      node('output', 'output', 1300, 60),
      node('ampEnv', 'envelope', 260, 340, {
        attack: 0.42, decay: 0.5, sustain: 0.8, release: 1.2, amount: 0.34,
      }),
      node('vibrato', 'lfo', 0, 460, { waveform: 'sine', rate: 4.8, amount: 5 }),
    ],
    edges: [
      edge('osc1', 'filter'), edge('osc2', 'filter'), edge('breath', 'filter'),
      edge('filter', 'amp'), edge('amp', 'delay'), edge('delay', 'reverb'),
      edge('reverb', 'output'),
      edge('ampEnv', 'amp', 'level'),
      edge('vibrato', 'osc1', 'detune'), edge('vibrato', 'osc2', 'detune'),
    ],
  };
}

/** A square wave and a square LFO on its pitch: the arpeggio-on-one-voice trick. */
function arcadeGraph(): InstrumentGraph {
  return {
    nodes: [
      node('osc1', 'oscillator', 0, 0, { waveform: 'square', level: 0.45 }),
      node('amp', 'gain', 520, 60, { level: 1 }),
      node('output', 'output', 780, 60),
      node('ampEnv', 'envelope', 260, 300, {
        attack: 0.001, decay: 0.09, sustain: 0.4, release: 0.04, amount: 0.34,
      }),
      // A square LFO jumps rather than glides, so this reads as two alternating
      // pitches a fourth apart rather than as vibrato.
      node('jump', 'lfo', 0, 300, { waveform: 'square', rate: 12, amount: 350 }),
    ],
    edges: [
      edge('osc1', 'amp'), edge('amp', 'output'),
      edge('ampEnv', 'amp', 'level'), edge('jump', 'osc1', 'detune'),
    ],
  };
}

/** Plucked string: instant attack, long decay, no sustain at all. */
function harpGraph(): InstrumentGraph {
  return {
    nodes: [
      node('osc1', 'oscillator', 0, 0, { waveform: 'triangle', level: 0.5 }),
      node('osc2', 'oscillator', 0, 150, { waveform: 'sawtooth', detune: 5, level: 0.16 }),
      node('filter', 'filter', 260, 60, { kind: 'lowpass', cutoff: 2600, resonance: 1.5 }),
      node('amp', 'gain', 520, 60, { level: 1 }),
      node('delay', 'delay', 780, 60, { time: 0.27, feedback: 0.26, mix: 0.2 }),
      node('reverb', 'reverb', 1040, 60, { size: 2.4, decay: 2.4, mix: 0.3 }),
      node('output', 'output', 1300, 60),
      node('ampEnv', 'envelope', 260, 320, {
        attack: 0.002, decay: 1.1, sustain: 0, release: 0.7, amount: 0.5,
      }),
      node('filterEnv', 'envelope', 520, 320, {
        attack: 0.002, decay: 0.5, sustain: 0, release: 0.3, amount: 2200,
      }),
    ],
    edges: [
      edge('osc1', 'filter'), edge('osc2', 'filter'),
      edge('filter', 'amp'), edge('amp', 'delay'), edge('delay', 'reverb'),
      edge('reverb', 'output'),
      edge('ampEnv', 'amp', 'level'), edge('filterEnv', 'filter', 'cutoff'),
    ],
  };
}

/** Very slow, very wide, very long. Built to be held under everything else. */
function droneGraph(): InstrumentGraph {
  return {
    nodes: [
      node('osc1', 'oscillator', 0, 0, { waveform: 'sawtooth', detune: -24, level: 0.26 }),
      node('osc2', 'oscillator', 0, 150, { waveform: 'sawtooth', detune: 24, level: 0.26 }),
      node('osc3', 'oscillator', 0, 300, { waveform: 'sine', octave: -1, level: 0.3 }),
      node('filter', 'filter', 260, 60, { kind: 'lowpass', cutoff: 800, resonance: 4 }),
      node('amp', 'gain', 520, 60, { level: 1 }),
      node('delay', 'delay', 780, 60, { time: 0.62, feedback: 0.45, mix: 0.3 }),
      node('reverb', 'reverb', 1040, 60, { size: 5.4, decay: 4.5, mix: 0.55 }),
      node('output', 'output', 1300, 60),
      node('ampEnv', 'envelope', 260, 340, {
        attack: 1.4, decay: 1, sustain: 0.85, release: 3, amount: 0.3,
      }),
      node('drift', 'lfo', 0, 460, { waveform: 'sine', rate: 0.09, amount: 420 }),
    ],
    edges: [
      edge('osc1', 'filter'), edge('osc2', 'filter'), edge('osc3', 'filter'),
      edge('filter', 'amp'), edge('amp', 'delay'), edge('delay', 'reverb'),
      edge('reverb', 'output'),
      edge('ampEnv', 'amp', 'level'), edge('drift', 'filter', 'cutoff'),
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
  organ: organGraph,
  bell: bellGraph,
  brass: brassGraph,
  strings: stringsGraph,
  harp: harpGraph,
  marimba: marimbaGraph,
  choir: choirGraph,
  drone: droneGraph,
  arcade: arcadeGraph,
  wobble: wobbleGraph,
  sub: subGraph,
  kick: kickGraph,
  snare: snareGraph,
  hat: hatGraph,
};

export const GRAPH_PRESET_NAMES = Object.keys(GRAPH_PRESETS);

export function presetGraph(name: string): InstrumentGraph {
  return (GRAPH_PRESETS[name] ?? GRAPH_PRESETS.default)();
}
