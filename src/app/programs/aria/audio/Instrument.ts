import type { AudioEngine } from './AudioEngine';
import { DEFAULT_INSTRUMENT, type InstrumentParams } from './InstrumentParams';
import { VoicePool } from './VoicePool';
import { createSoftClip, type SoftClip } from './softclip';
import { frequencyOf, TWELVE_TET, type Tuning } from '../lib/tuning';

/**
 * A playable instrument: parameters, a voice pool, and one shared output node.
 *
 * That output node is the split the plan calls for. Everything upstream of it
 * is per-voice and rebuilt per note; everything downstream is built once and
 * shared by every voice of this instrument. Phase 5 hangs the effect chain
 * there — a convolution reverb per note would be ruinous, and this is the seam
 * that keeps it from ever being written that way.
 */

export interface NoteRequest {
  /** Context time to start at, from the scheduler. */
  time: number;
  /** Absolute pitch index; converted through the instrument's tuning. */
  index: number;
  /** Seconds to hold before release begins. */
  holdSeconds: number;
  /** 0-1. */
  velocity?: number;
}

export class Instrument {
  readonly id: string;
  params: InstrumentParams;
  tuning: Tuning = TWELVE_TET;

  private readonly engine: AudioEngine;
  private readonly output: GainNode;
  private readonly safety: SoftClip;
  private pool: VoicePool;
  private polyphony: number;

  /** Count of notes that had to steal a voice, for a UI load readout. */
  stolenNotes = 0;

  constructor(
    engine: AudioEngine,
    id: string,
    params: InstrumentParams = DEFAULT_INSTRUMENT,
    polyphony = 8,
  ) {
    const ctx = engine.context;
    if (!ctx) throw new Error('Aria: Instrument needs a started AudioEngine');

    this.engine = engine;
    this.id = id;
    this.params = params;
    this.polyphony = polyphony;

    this.output = ctx.createGain();
    this.output.gain.value = 1;
    // voices -> output -> safety -> master. Phase 5's effect chain inserts
    // between output and safety, so the limiter always stays last.
    this.safety = createSoftClip(ctx);
    this.output.connect(this.safety.input);
    this.safety.output.connect(engine.destination);
    this.pool = new VoicePool(ctx, this.output, polyphony);
  }

  /** The per-instrument node that phase 5's shared effect chain will feed. */
  get outputNode(): GainNode {
    return this.output;
  }

  get polyphonyLimit(): number {
    return this.polyphony;
  }

  activeVoices(time = this.engine.currentTime): number {
    return this.pool.activeCount(time);
  }

  /** Rebuilds the pool at a new size. Sounding notes are cut off. */
  setPolyphony(polyphony: number): void {
    const ctx = this.engine.context;
    if (!ctx || polyphony === this.polyphony) return;
    this.pool.killAll(ctx.currentTime);
    this.pool.dispose();
    this.polyphony = Math.max(1, Math.floor(polyphony));
    this.pool = new VoicePool(ctx, this.output, this.polyphony);
  }

  setParams(params: InstrumentParams): void {
    this.params = params;
  }

  /**
   * Triggers a note. Parameters are read at trigger time, so editing the patch
   * mid-loop affects notes from here on and leaves sounding ones alone — the
   * behaviour you want when tweaking a filter while a pattern plays.
   */
  noteOn(request: NoteRequest): void {
    const { time, index, holdSeconds, velocity = 1 } = request;
    const { voice, stolen } = this.pool.allocate(time);
    if (stolen) this.stolenNotes += 1;
    voice.noteId = index;
    voice.play(this.params, frequencyOf(index, this.tuning), time, holdSeconds, velocity);
  }

  /** Releases a specific sounding pitch early. */
  noteOff(index: number, time: number): void {
    this.pool.findByNote(index, time)?.release(time);
  }

  releaseAll(time = this.engine.currentTime): void {
    this.pool.releaseAll(time);
  }

  /** Immediate silence, for transport stop. */
  panic(time = this.engine.currentTime): void {
    this.pool.killAll(time);
  }

  setLevel(level: number): void {
    const ctx = this.engine.context;
    if (!ctx) return;
    const now = ctx.currentTime;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setValueAtTime(this.output.gain.value, now);
    this.output.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, level)), now + 0.02);
  }

  dispose(): void {
    this.pool.dispose();
    this.output.disconnect();
    this.safety.disconnect();
  }
}
