/**
 * Flat parameter description for a subtractive voice.
 *
 * This is the phase-2 stand-in for a full instrument graph. Phase 5 replaces it
 * with a serializable node graph, and the graph compiler will emit something
 * shaped like this for the linear source -> filter -> amp case. Keeping it flat
 * and plain now means presets stay readable and the migration is mechanical.
 */

export type Waveform = OscillatorType;

export interface AmpEnvelopeParams {
  /** Seconds from silence to peak. */
  attack: number;
  /** Seconds from peak down to the sustain level. */
  decay: number;
  /** Fraction of peak held while the note is on, 0-1. */
  sustain: number;
  /** Seconds from the sustain level back to silence. */
  release: number;
}

export interface FilterParams {
  type: BiquadFilterType;
  /** Cutoff in Hz at rest. */
  cutoff: number;
  /** Resonance. */
  q: number;
  /**
   * Hz added to the cutoff at the envelope's peak, decaying back to `cutoff`
   * over the amp envelope's decay time. 0 disables the filter envelope.
   */
  envelopeAmount: number;
}

export interface InstrumentParams {
  waveform: Waveform;
  /** Detune of the main oscillator, in cents. */
  detune: number;
  /**
   * Cents of detune for a second oscillator. 0 runs a single oscillator, which
   * halves the node count per voice.
   */
  spread: number;
  filter: FilterParams;
  amp: AmpEnvelopeParams;
  /** Peak amplitude before velocity, 0-1. */
  gain: number;
}

export const DEFAULT_INSTRUMENT: InstrumentParams = {
  waveform: 'sawtooth',
  detune: 0,
  spread: 8,
  filter: { type: 'lowpass', cutoff: 1200, q: 6, envelopeAmount: 2400 },
  amp: { attack: 0.005, decay: 0.12, sustain: 0.55, release: 0.18 },
  gain: 0.5,
};

export const PRESETS: Record<string, InstrumentParams> = {
  default: DEFAULT_INSTRUMENT,
  pluck: {
    waveform: 'triangle',
    detune: 0,
    spread: 0,
    filter: { type: 'lowpass', cutoff: 900, q: 2, envelopeAmount: 3000 },
    amp: { attack: 0.002, decay: 0.09, sustain: 0, release: 0.09 },
    gain: 0.55,
  },
  pad: {
    waveform: 'sawtooth',
    detune: 0,
    spread: 14,
    filter: { type: 'lowpass', cutoff: 700, q: 1, envelopeAmount: 900 },
    amp: { attack: 0.25, decay: 0.4, sustain: 0.8, release: 0.7 },
    gain: 0.35,
  },
  bass: {
    waveform: 'square',
    detune: 0,
    spread: 0,
    filter: { type: 'lowpass', cutoff: 420, q: 8, envelopeAmount: 1500 },
    amp: { attack: 0.004, decay: 0.14, sustain: 0.3, release: 0.12 },
    gain: 0.6,
  },
  glass: {
    waveform: 'sine',
    detune: 0,
    spread: 5,
    filter: { type: 'highpass', cutoff: 300, q: 1, envelopeAmount: 0 },
    amp: { attack: 0.01, decay: 0.3, sustain: 0.25, release: 0.45 },
    gain: 0.5,
  },
};

export const PRESET_NAMES = Object.keys(PRESETS);
