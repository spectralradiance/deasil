/**
 * Owns the AudioContext, the master bus, and the browser autoplay unlock.
 *
 * Pure TypeScript: nothing here imports React or depends on a render cycle.
 * The same class drives an OfflineAudioContext for offline WAV rendering later.
 */

import { createSoftClip, type SoftClip } from './softclip';

type AnyWindow = typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

function audioContextConstructor(): typeof AudioContext {
  const scope = globalThis as AnyWindow;
  const ctor = scope.AudioContext ?? scope.webkitAudioContext;
  if (!ctor) throw new Error('Aria: this browser has no Web Audio support');
  return ctor;
}

export interface AudioEngineOptions {
  /** Initial master volume, 0-1. */
  masterVolume?: number;
  /** Seconds used for volume ramps, to avoid clicks. */
  rampSeconds?: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private masterSafety: SoftClip | null = null;
  private volume: number;
  private readonly rampSeconds: number;

  constructor(options: AudioEngineOptions = {}) {
    this.volume = options.masterVolume ?? 0.8;
    this.rampSeconds = options.rampSeconds ?? 0.02;
  }

  /** True once the context exists and is running. */
  get isRunning(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** The context, or null before the first `start()`. */
  get context(): AudioContext | null {
    return this.ctx;
  }

  /**
   * The node instruments connect to. Throws before `start()`, which keeps the
   * "no audio graph before a user gesture" rule impossible to violate quietly.
   */
  get destination(): GainNode {
    if (!this.masterGain) {
      throw new Error('Aria: AudioEngine.start() must run before building a graph');
    }
    return this.masterGain;
  }

  /** Master-bus analyser, or null before `start()`. */
  get analyser(): AnalyserNode | null {
    return this.masterAnalyser;
  }

  /** Context clock in seconds. Returns 0 before start, so callers can poll safely. */
  get currentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 0;
  }

  /**
   * Creates and resumes the context. Must be called from inside a real user
   * gesture — a click or keypress handler — or mobile Safari and Chrome will
   * leave the context suspended. Safe to call repeatedly.
   */
  async start(): Promise<AudioContext> {
    if (!this.ctx) {
      const Ctor = audioContextConstructor();
      this.ctx = new Ctor({ latencyHint: 'interactive' });
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      // Each instrument limits itself, but several summing on the master can
      // still cross full scale, so the same curve guards the bus. The analyser
      // sits after it and passes signal through untouched, so the visualizers
      // show exactly what leaves the speakers.
      this.masterSafety = createSoftClip(this.ctx);
      this.masterAnalyser = this.ctx.createAnalyser();
      this.masterAnalyser.fftSize = 2048;
      this.masterAnalyser.smoothingTimeConstant = 0.75;
      this.masterGain.connect(this.masterSafety.input);
      this.masterSafety.output.connect(this.masterAnalyser);
      this.masterAnalyser.connect(this.ctx.destination);
    }
    if (this.ctx.state !== 'running') {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  /** Master volume, 0-1, ramped to avoid a click. */
  setMasterVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (!this.ctx || !this.masterGain) return;
    const param = this.masterGain.gain;
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(this.volume, now + this.rampSeconds);
  }

  getMasterVolume(): number {
    return this.volume;
  }

  async suspend(): Promise<void> {
    if (this.ctx && this.ctx.state === 'running') await this.ctx.suspend();
  }

  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state !== 'running') await this.ctx.resume();
  }

  /** Tears the context down. The engine can be started again afterwards. */
  async dispose(): Promise<void> {
    const ctx = this.ctx;
    this.ctx = null;
    this.masterGain = null;
    this.masterAnalyser = null;
    this.masterSafety = null;
    if (ctx && ctx.state !== 'closed') await ctx.close();
  }
}
