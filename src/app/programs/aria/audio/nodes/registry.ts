import { AUDIO_IN_PORT, OUTPUT_PORT, type GraphNode } from '../graph';

/**
 * What every node type is and how it is built.
 *
 * A definition owns three things: the params the inspector renders, the ports
 * the editor lets you wire, and a factory that produces real Web Audio nodes.
 * Adding a module means adding one entry here — nothing else in the engine or
 * the editor needs to know about it.
 */

export interface ParamDef {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
  /** Logarithmic controls read better for frequency. */
  curve?: 'linear' | 'log';
  /** True when an edge may target this param. */
  modulatable?: boolean;
  /**
   * What the knob means once something is patched into this param.
   *
   * Web Audio *adds* an incoming signal to a param's value, so a gain sitting
   * at 1 with an envelope patched in swings 1..2 and never actually shapes
   * anything. 'zero' forces the base to 0 when modulated, which is what an amp
   * wants; 'keep' leaves the knob as the centre the modulation moves around,
   * which is what a filter cutoff wants.
   */
  modulationBase?: 'zero' | 'keep';
}

export interface ChoiceDef {
  name: string;
  label: string;
  options: readonly string[];
  default: string;
}

export interface PortDef {
  name: string;
  label: string;
}

export type NodeCategory = 'source' | 'processor' | 'modulator' | 'output';

/** A live instance of one node, as the compiler sees it. */
export interface NodeInstance {
  /** Where an incoming audio edge connects. Absent for sources. */
  input?: AudioNode;
  /** Where an outgoing audio edge leaves. Absent for the output node. */
  output?: AudioNode;
  /** Modulatable params, by name. */
  params: Map<string, AudioParam>;
  /** Starts anything that needs starting (oscillators, noise). */
  start?(time: number): void;
  /** Schedules the envelope, for nodes that have one. */
  trigger?(time: number, holdSeconds: number, velocity: number): number;
  stop?(time: number): void;
  dispose?(): void;
}

export interface BuildContext {
  ctx: BaseAudioContext;
  /** Note frequency in Hz — sources use it, modulators ignore it. */
  frequency: number;
}

export interface NodeDefinition {
  type: string;
  label: string;
  category: NodeCategory;
  description: string;
  params: ParamDef[];
  choices: ChoiceDef[];
  inputs: PortDef[];
  outputs: PortDef[];
  /** Params other nodes may modulate, in the order the editor shows them. */
  modTargets: string[];
  build(node: GraphNode, context: BuildContext): NodeInstance;
}

const num = (node: GraphNode, name: string, fallback: number): number => {
  const value = node.params[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};
const text = (node: GraphNode, name: string, fallback: string): string => {
  const value = node.params[name];
  return typeof value === 'string' ? value : fallback;
};

const AUDIO_IN: PortDef[] = [{ name: AUDIO_IN_PORT, label: 'in' }];
const AUDIO_OUT: PortDef[] = [{ name: OUTPUT_PORT, label: 'out' }];

/** Exponential ramps cannot reach zero. */
const SILENCE = 0.0001;

// ---- noise ------------------------------------------------------------------

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/**
 * One second of white noise, generated once per context and looped. Cheaper
 * than a worklet and indistinguishable at this length.
 */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseBuffers.get(ctx);
  if (cached) return cached;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 22222;
  for (let i = 0; i < data.length; ++i) {
    // Deterministic, so a rendered bounce matches what you heard.
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = (seed / 0xffffffff) * 2 - 1;
  }
  noiseBuffers.set(ctx, buffer);
  return buffer;
}

// ---- reverb -----------------------------------------------------------------

/**
 * A procedurally generated impulse response: noise shaped by an exponential
 * decay. Perfectly serviceable, and it means no audio asset has to ship.
 */
function impulseResponse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  let seed = 9781;
  for (let channel = 0; channel < 2; ++channel) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; ++i) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const white = (seed / 0xffffffff) * 2 - 1;
      data[i] = white * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

function distortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(new ArrayBuffer(n * Float32Array.BYTES_PER_ELEMENT));
  const k = Math.max(0, amount);
  for (let i = 0; i < n; ++i) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

// ---- definitions ------------------------------------------------------------

export const NODE_DEFINITIONS: NodeDefinition[] = [
  {
    type: 'oscillator',
    label: 'Oscillator',
    category: 'source',
    description: 'Tone generator. Its pitch follows the note being played.',
    choices: [{
      name: 'waveform', label: 'waveform',
      options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sawtooth',
    }],
    params: [
      { name: 'detune', label: 'detune', min: -1200, max: 1200, step: 1, default: 0, unit: '¢', modulatable: true },
      { name: 'octave', label: 'octave', min: -3, max: 3, step: 1, default: 0 },
      { name: 'level', label: 'level', min: 0, max: 1, step: 0.01, default: 0.5, modulatable: true },
    ],
    inputs: [],
    outputs: AUDIO_OUT,
    modTargets: ['detune', 'level'],
    build(node, { ctx, frequency }) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = text(node, 'waveform', 'sawtooth') as OscillatorType;
      osc.frequency.value = frequency * Math.pow(2, num(node, 'octave', 0));
      osc.detune.value = num(node, 'detune', 0);
      gain.gain.value = num(node, 'level', 0.5);
      osc.connect(gain);
      return {
        output: gain,
        params: new Map<string, AudioParam>([['detune', osc.detune], ['level', gain.gain]]),
        start: (time) => osc.start(time),
        stop: (time) => { try { osc.stop(time); } catch { /* already stopped */ } },
        dispose: () => { osc.disconnect(); gain.disconnect(); },
      };
    },
  },

  {
    type: 'noise',
    label: 'Noise',
    category: 'source',
    description: 'White noise. The raw material for percussion and breath.',
    choices: [],
    params: [{ name: 'level', label: 'level', min: 0, max: 1, step: 0.01, default: 0.4, modulatable: true }],
    inputs: [],
    outputs: AUDIO_OUT,
    modTargets: ['level'],
    build(node, { ctx }) {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = noiseBuffer(ctx);
      source.loop = true;
      gain.gain.value = num(node, 'level', 0.4);
      source.connect(gain);
      return {
        output: gain,
        params: new Map([['level', gain.gain]]),
        start: (time) => source.start(time),
        stop: (time) => { try { source.stop(time); } catch { /* already stopped */ } },
        dispose: () => { source.disconnect(); gain.disconnect(); },
      };
    },
  },

  {
    type: 'gain',
    label: 'Gain',
    category: 'processor',
    description: 'Level control. Wire an envelope into its level to make it the amp.',
    choices: [],
    params: [{
      name: 'level', label: 'level', min: 0, max: 2, step: 0.01, default: 1,
      modulatable: true, modulationBase: 'zero',
    }],
    inputs: AUDIO_IN,
    outputs: AUDIO_OUT,
    modTargets: ['level'],
    build(node, { ctx }) {
      const gain = ctx.createGain();
      gain.gain.value = num(node, 'level', 1);
      return {
        input: gain,
        output: gain,
        params: new Map([['level', gain.gain]]),
        dispose: () => gain.disconnect(),
      };
    },
  },

  {
    type: 'filter',
    label: 'Filter',
    category: 'processor',
    description: 'Biquad filter. Resonance is a gain stage — the output limiter catches it.',
    choices: [{
      name: 'kind', label: 'type',
      options: ['lowpass', 'highpass', 'bandpass', 'notch'], default: 'lowpass',
    }],
    params: [
      { name: 'cutoff', label: 'cutoff', min: 20, max: 18000, step: 1, default: 1200, unit: 'Hz', curve: 'log', modulatable: true },
      { name: 'resonance', label: 'resonance', min: 0.1, max: 24, step: 0.1, default: 4, modulatable: true },
    ],
    inputs: AUDIO_IN,
    outputs: AUDIO_OUT,
    modTargets: ['cutoff', 'resonance'],
    build(node, { ctx }) {
      const filter = ctx.createBiquadFilter();
      filter.type = text(node, 'kind', 'lowpass') as BiquadFilterType;
      filter.frequency.value = Math.min(num(node, 'cutoff', 1200), ctx.sampleRate / 2 - 1);
      filter.Q.value = num(node, 'resonance', 4);
      return {
        input: filter,
        output: filter,
        params: new Map([['cutoff', filter.frequency], ['resonance', filter.Q]]),
        dispose: () => filter.disconnect(),
      };
    },
  },

  {
    type: 'envelope',
    label: 'Envelope',
    category: 'modulator',
    description: 'ADSR. Wire it into a gain to shape volume, or a cutoff to sweep it.',
    choices: [],
    params: [
      { name: 'attack', label: 'attack', min: 0.001, max: 4, step: 0.001, default: 0.005, unit: 's' },
      { name: 'decay', label: 'decay', min: 0.005, max: 4, step: 0.005, default: 0.12, unit: 's' },
      { name: 'sustain', label: 'sustain', min: 0, max: 1, step: 0.01, default: 0.55 },
      { name: 'release', label: 'release', min: 0.005, max: 6, step: 0.005, default: 0.18, unit: 's' },
      { name: 'amount', label: 'amount', min: -8000, max: 8000, step: 1, default: 1 },
    ],
    inputs: [],
    outputs: [{ name: OUTPUT_PORT, label: 'env' }],
    modTargets: [],
    /**
     * A ConstantSourceNode is the trick that makes an envelope a first-class
     * node: its offset is an AudioParam, so the same curve can drive a gain, a
     * cutoff or a detune through an ordinary connection, scaled by `amount`.
     */
    build(node, { ctx }) {
      const source = ctx.createConstantSource();
      const scale = ctx.createGain();
      source.offset.value = 0;
      scale.gain.value = num(node, 'amount', 1);
      source.connect(scale);

      const attack = Math.max(num(node, 'attack', 0.005), 0.001);
      const decay = Math.max(num(node, 'decay', 0.12), 0.001);
      const sustain = Math.max(0, Math.min(1, num(node, 'sustain', 0.55)));
      const release = Math.max(num(node, 'release', 0.18), 0.005);

      return {
        output: scale,
        params: new Map([['amount', scale.gain]]),
        start: (time) => source.start(time),
        stop: (time) => { try { source.stop(time); } catch { /* already stopped */ } },
        trigger: (time, holdSeconds, velocity) => {
          const peak = Math.max(SILENCE, velocity);
          const hold = Math.max(holdSeconds, attack + decay);
          const level = source.offset;
          level.cancelScheduledValues(time);
          level.setValueAtTime(0, time);
          level.linearRampToValueAtTime(peak, time + attack);
          level.exponentialRampToValueAtTime(Math.max(peak * sustain, SILENCE), time + attack + decay);
          level.setValueAtTime(Math.max(peak * sustain, SILENCE), time + hold);
          level.exponentialRampToValueAtTime(SILENCE, time + hold + release);
          level.setValueAtTime(0, time + hold + release);
          return time + hold + release;
        },
        dispose: () => { source.disconnect(); scale.disconnect(); },
      };
    },
  },

  {
    type: 'lfo',
    label: 'LFO',
    category: 'modulator',
    description: 'Low-frequency oscillator. Free-running, for vibrato and wobble.',
    choices: [{
      name: 'waveform', label: 'waveform',
      options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine',
    }],
    params: [
      { name: 'rate', label: 'rate', min: 0.01, max: 40, step: 0.01, default: 5, unit: 'Hz', curve: 'log', modulatable: true },
      { name: 'amount', label: 'amount', min: -8000, max: 8000, step: 1, default: 20 },
    ],
    inputs: [],
    outputs: [{ name: OUTPUT_PORT, label: 'lfo' }],
    modTargets: ['rate'],
    build(node, { ctx }) {
      const osc = ctx.createOscillator();
      const scale = ctx.createGain();
      osc.type = text(node, 'waveform', 'sine') as OscillatorType;
      osc.frequency.value = num(node, 'rate', 5);
      scale.gain.value = num(node, 'amount', 20);
      osc.connect(scale);
      return {
        output: scale,
        params: new Map<string, AudioParam>([['rate', osc.frequency], ['amount', scale.gain]]),
        start: (time) => osc.start(time),
        stop: (time) => { try { osc.stop(time); } catch { /* already stopped */ } },
        dispose: () => { osc.disconnect(); scale.disconnect(); },
      };
    },
  },

  {
    type: 'drive',
    label: 'Drive',
    category: 'processor',
    description: 'Waveshaper. Adds harmonics; more amount, more grit.',
    choices: [],
    params: [{ name: 'amount', label: 'amount', min: 0, max: 100, step: 1, default: 12 }],
    inputs: AUDIO_IN,
    outputs: AUDIO_OUT,
    modTargets: [],
    build(node, { ctx }) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = distortionCurve(num(node, 'amount', 12));
      shaper.oversample = '2x';
      return { input: shaper, output: shaper, params: new Map(), dispose: () => shaper.disconnect() };
    },
  },

  {
    type: 'delay',
    label: 'Delay',
    category: 'processor',
    description: 'Echo with feedback. The one node a feedback loop may pass through.',
    choices: [],
    params: [
      { name: 'time', label: 'time', min: 0.01, max: 2, step: 0.01, default: 0.25, unit: 's', modulatable: true },
      { name: 'feedback', label: 'feedback', min: 0, max: 0.95, step: 0.01, default: 0.35 },
      { name: 'mix', label: 'mix', min: 0, max: 1, step: 0.01, default: 0.3 },
    ],
    inputs: AUDIO_IN,
    outputs: AUDIO_OUT,
    modTargets: ['time'],
    build(node, { ctx }) {
      const input = ctx.createGain();
      const delay = ctx.createDelay(2);
      const feedback = ctx.createGain();
      const wet = ctx.createGain();
      const dry = ctx.createGain();
      const out = ctx.createGain();

      const mix = Math.max(0, Math.min(1, num(node, 'mix', 0.3)));
      delay.delayTime.value = num(node, 'time', 0.25);
      feedback.gain.value = Math.min(0.95, num(node, 'feedback', 0.35));
      wet.gain.value = mix;
      dry.gain.value = 1 - mix;

      input.connect(dry).connect(out);
      input.connect(delay);
      delay.connect(feedback).connect(delay);
      delay.connect(wet).connect(out);

      return {
        input,
        output: out,
        params: new Map([['time', delay.delayTime]]),
        dispose: () => [input, delay, feedback, wet, dry, out].forEach((n) => n.disconnect()),
      };
    },
  },

  {
    type: 'reverb',
    label: 'Reverb',
    category: 'processor',
    description: 'Convolution reverb on a generated impulse. Expensive — keep it shared.',
    choices: [],
    params: [
      { name: 'size', label: 'size', min: 0.1, max: 6, step: 0.1, default: 1.8, unit: 's' },
      { name: 'decay', label: 'decay', min: 0.5, max: 8, step: 0.1, default: 2.5 },
      { name: 'mix', label: 'mix', min: 0, max: 1, step: 0.01, default: 0.25 },
    ],
    inputs: AUDIO_IN,
    outputs: AUDIO_OUT,
    modTargets: [],
    build(node, { ctx }) {
      const input = ctx.createGain();
      const convolver = ctx.createConvolver();
      const wet = ctx.createGain();
      const dry = ctx.createGain();
      const out = ctx.createGain();

      convolver.buffer = impulseResponse(ctx, num(node, 'size', 1.8), num(node, 'decay', 2.5));
      const mix = Math.max(0, Math.min(1, num(node, 'mix', 0.25)));
      wet.gain.value = mix;
      dry.gain.value = 1 - mix;

      input.connect(dry).connect(out);
      input.connect(convolver).connect(wet).connect(out);

      return {
        input,
        output: out,
        params: new Map(),
        dispose: () => [input, convolver, wet, dry, out].forEach((n) => n.disconnect()),
      };
    },
  },

  {
    type: 'pan',
    label: 'Pan',
    category: 'processor',
    description: 'Stereo position.',
    choices: [],
    params: [{ name: 'pan', label: 'pan', min: -1, max: 1, step: 0.01, default: 0, modulatable: true }],
    inputs: AUDIO_IN,
    outputs: AUDIO_OUT,
    modTargets: ['pan'],
    build(node, { ctx }) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = num(node, 'pan', 0);
      return {
        input: panner,
        output: panner,
        params: new Map([['pan', panner.pan]]),
        dispose: () => panner.disconnect(),
      };
    },
  },

  {
    type: 'output',
    label: 'Output',
    category: 'output',
    description: 'The instrument bus. Everything you want to hear ends here.',
    choices: [],
    params: [],
    inputs: AUDIO_IN,
    outputs: [],
    modTargets: [],
    build(_node, { ctx }) {
      const gain = ctx.createGain();
      return { input: gain, output: gain, params: new Map(), dispose: () => gain.disconnect() };
    },
  },
];

const BY_TYPE = new Map(NODE_DEFINITIONS.map((d) => [d.type, d]));

export function definitionFor(type: string): NodeDefinition | undefined {
  return BY_TYPE.get(type);
}

export function isEnvelopeNode(node: GraphNode): boolean {
  return node.type === 'envelope';
}

export function isDelayNode(node: GraphNode): boolean {
  return node.type === 'delay';
}

/** A node of the given type with every param at its default. */
export function defaultParams(type: string): Record<string, number | string> {
  const definition = definitionFor(type);
  if (!definition) return {};
  const params: Record<string, number | string> = {};
  for (const param of definition.params) params[param.name] = param.default;
  for (const choice of definition.choices) params[choice.name] = choice.default;
  return params;
}
