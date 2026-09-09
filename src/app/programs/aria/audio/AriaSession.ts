import { AudioEngine } from './AudioEngine';
import { Scheduler, type StepEvent } from './Scheduler';
import { Instrument } from './Instrument';
import { DEFAULT_INSTRUMENT, type InstrumentParams } from './InstrumentParams';
import { Scale } from '../lib/scale';
import { mod } from '../lib/math';
import type { Phrase } from '../lib/generate';

/**
 * Everything the page needs to make sound, with no React in it.
 *
 * The scheduler's step handler runs ahead of the audio clock and must never
 * wait on a render. So the values it reads live here in a mutable block that
 * the UI overwrites, rather than being closed over from a component. Editing
 * the patch or the phrase mid-loop takes effect on the next scheduled step
 * without re-registering anything or interrupting playback.
 */

export interface SessionState {
  phrase: Phrase;
  scale: Scale;
  /** Note length as a multiple of the step length. Above 1, notes overlap. */
  gate: number;
  velocity: number;
  params: InstrumentParams;
}

const INITIAL_STATE: SessionState = {
  phrase: [],
  scale: new Scale('C3', 'dorian'),
  gate: 0.9,
  velocity: 0.9,
  params: DEFAULT_INSTRUMENT,
};

export class AriaSession {
  readonly engine: AudioEngine;
  readonly scheduler: Scheduler;
  private instrument: Instrument | null = null;
  private state: SessionState;
  private polyphony = 8;

  constructor(initial: Partial<SessionState> = {}) {
    this.engine = new AudioEngine({ masterVolume: 0.7 });
    this.scheduler = new Scheduler(this.engine, { bpm: 110, stepsPerBeat: 4, stepCount: 16 });
    this.state = { ...INITIAL_STATE, ...initial };
  }

  get isPlaying(): boolean {
    return this.scheduler.isPlaying;
  }

  /** Merges new values in. Safe to call while playing. */
  update(patch: Partial<SessionState>): void {
    this.state = { ...this.state, ...patch };
    if (patch.params) this.instrument?.setParams(patch.params);
  }

  setBpm(bpm: number): void {
    this.scheduler.setBpm(bpm);
  }

  setStepCount(steps: number): void {
    this.scheduler.setStepCount(steps);
  }

  setPolyphony(polyphony: number): void {
    this.polyphony = polyphony;
    this.instrument?.setPolyphony(polyphony);
  }

  /** Must be reached from a user gesture, or the context stays suspended. */
  async start(): Promise<void> {
    await this.engine.start();
    if (!this.instrument) {
      this.instrument = new Instrument(this.engine, 'lead', this.state.params, this.polyphony);
    }
    // Registered on every start so the session survives a dispose/remount,
    // which React strict mode does on purpose in development.
    this.scheduler.onStep(this.handleStep);
    this.scheduler.start(0);
  }

  stop(): void {
    this.scheduler.stop();
    this.instrument?.releaseAll();
  }

  /** Immediate silence, ignoring release tails. */
  panic(): void {
    this.scheduler.stop();
    this.instrument?.panic();
  }

  getPlayingStep(): number {
    return this.scheduler.getPlayingStep();
  }

  stats(): { activeVoices: number; polyphony: number; stolenNotes: number; workerClock: boolean | null } {
    return {
      activeVoices: this.instrument?.activeVoices() ?? 0,
      polyphony: this.instrument?.polyphonyLimit ?? this.polyphony,
      stolenNotes: this.instrument?.stolenNotes ?? 0,
      workerClock: this.scheduler.usesWorkerClock,
    };
  }

  resetStats(): void {
    if (this.instrument) this.instrument.stolenNotes = 0;
  }

  dispose(): void {
    this.scheduler.dispose();
    this.instrument?.dispose();
    this.instrument = null;
    void this.engine.dispose();
  }

  private handleStep = (event: StepEvent): void => {
    const { phrase, scale, gate, velocity } = this.state;
    if (!this.instrument || phrase.length === 0) return;

    const degree = phrase[mod(event.step, phrase.length)];
    if (degree === null) return;

    this.instrument.noteOn({
      time: event.time,
      index: scale.indexAt(degree),
      holdSeconds: event.duration * gate,
      velocity,
    });
  };
}
