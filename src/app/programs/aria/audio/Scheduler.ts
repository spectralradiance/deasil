import type { AudioEngine } from './AudioEngine';
import { createClockTicker, type ClockTicker } from './clock.worker';

/**
 * Lookahead scheduler.
 *
 * A worker timer wakes this up every `tickMs`. On each wake it schedules every
 * step that falls inside the next `lookaheadSeconds` against the audio clock,
 * then goes back to sleep. Note starts are therefore sample-accurate: the
 * timer only has to be punctual enough to refill the window before it empties,
 * and any JS jitter smaller than the window is absorbed entirely.
 *
 * Two clocks come out of this, and they are not interchangeable:
 *   - `onStep` fires *ahead* of time and carries the exact `time` a voice
 *     should start. It is the only clock audio may use.
 *   - `getPlayingStep()` reports what is audible *now*, for the playhead. It is
 *     polled from a rAF loop and must never drive React state.
 */

export interface StepEvent {
  /** Step index within the loop. */
  step: number;
  /** AudioContext time, in seconds, at which the step begins. */
  time: number;
  /** Seconds this step lasts at the tempo in force when it was scheduled. */
  duration: number;
}

export type StepScheduleHandler = (event: StepEvent) => void;

export interface SchedulerOptions {
  bpm?: number;
  /** Steps per quarter note. 4 gives sixteenth-note resolution. */
  stepsPerBeat?: number;
  /** Loop length in steps. 0 runs free, counting upward without wrapping. */
  stepCount?: number;
  /** How far ahead to schedule, in seconds. */
  lookaheadSeconds?: number;
  /** How often the worker timer wakes, in milliseconds. */
  tickMs?: number;
}

const DEFAULTS = {
  bpm: 120,
  stepsPerBeat: 4,
  stepCount: 16,
  lookaheadSeconds: 0.1,
  tickMs: 25,
};

export class Scheduler {
  private readonly engine: AudioEngine;
  private ticker: ClockTicker | null = null;
  private handler: StepScheduleHandler | null = null;

  private bpm: number;
  private stepsPerBeat: number;
  private stepCount: number;
  private lookaheadSeconds: number;
  private tickMs: number;

  private playing = false;
  private nextStep = 0;
  private nextStepTime = 0;

  /** Steps already handed to `onStep` but not yet audible. */
  private queue: StepEvent[] = [];
  /** Most recent step to have become audible. */
  private lastAudibleStep = -1;

  constructor(engine: AudioEngine, options: SchedulerOptions = {}) {
    this.engine = engine;
    this.bpm = options.bpm ?? DEFAULTS.bpm;
    this.stepsPerBeat = options.stepsPerBeat ?? DEFAULTS.stepsPerBeat;
    this.stepCount = options.stepCount ?? DEFAULTS.stepCount;
    this.lookaheadSeconds = options.lookaheadSeconds ?? DEFAULTS.lookaheadSeconds;
    this.tickMs = options.tickMs ?? DEFAULTS.tickMs;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Whether the timer runs off the main thread, or null before the first
   * `start()` creates the ticker.
   */
  get usesWorkerClock(): boolean | null {
    return this.ticker ? this.ticker.usesWorker : null;
  }

  get secondsPerStep(): number {
    return 60 / this.bpm / this.stepsPerBeat;
  }

  getBpm(): number {
    return this.bpm;
  }

  /**
   * Changes tempo. Steps already inside the lookahead window keep the timing
   * they were scheduled with, so a change takes audible effect within about
   * `lookaheadSeconds`. That latency is the price of jitter-free scheduling.
   */
  setBpm(bpm: number): void {
    if (!Number.isFinite(bpm) || bpm <= 0) return;
    this.bpm = bpm;
  }

  getStepsPerBeat(): number {
    return this.stepsPerBeat;
  }

  setStepsPerBeat(stepsPerBeat: number): void {
    if (!Number.isInteger(stepsPerBeat) || stepsPerBeat <= 0) return;
    this.stepsPerBeat = stepsPerBeat;
  }

  getStepCount(): number {
    return this.stepCount;
  }

  /** Sets the loop length. The next wrap uses the new length. */
  setStepCount(stepCount: number): void {
    if (!Number.isInteger(stepCount) || stepCount < 0) return;
    this.stepCount = stepCount;
    if (stepCount > 0 && this.nextStep >= stepCount) this.nextStep = 0;
  }

  /** Registers the audio-scheduling callback. One handler at a time. */
  onStep(handler: StepScheduleHandler | null): void {
    this.handler = handler;
  }

  /**
   * Starts playback from `fromStep`. The engine must already be started, which
   * means this has to be reached from a user gesture.
   */
  start(fromStep = 0): void {
    if (this.playing) return;
    const ctx = this.engine.context;
    if (!ctx) throw new Error('Aria: Scheduler.start() needs a started AudioEngine');

    this.playing = true;
    this.lastAudibleStep = -1;
    this.nextStep = this.stepCount > 0 ? fromStep % this.stepCount : fromStep;
    // A small offset keeps the first step from landing in the past on a slow
    // first tick, which would make it play late rather than on the beat.
    this.nextStepTime = ctx.currentTime + 0.05;
    this.queue = [];

    if (!this.ticker) {
      this.ticker = createClockTicker(this.tickMs, () => this.tick());
    }
    this.ticker.setInterval(this.tickMs);
    this.ticker.start();
    this.tick();
  }

  stop(): void {
    if (!this.playing) return;
    this.playing = false;
    this.ticker?.stop();
    this.queue = [];
    this.lastAudibleStep = -1;
  }

  /** Stops and releases the worker. The scheduler can be started again after. */
  dispose(): void {
    this.stop();
    this.ticker?.dispose();
    this.ticker = null;
    this.handler = null;
  }

  /**
   * The step currently audible, or -1 when stopped. Poll this from a rAF loop
   * to move a playhead; it allocates nothing and touches no React state.
   */
  getPlayingStep(): number {
    if (!this.playing) return -1;
    this.drain();
    return this.lastAudibleStep;
  }

  /**
   * Retires queue entries that have become audible. Called both from
   * `getPlayingStep` and from every tick — the tick is what matters, because
   * requestAnimationFrame stops firing in a hidden tab and a queue drained only
   * by the UI would grow for as long as the tab stayed in the background.
   */
  private drain(): void {
    const now = this.engine.currentTime;
    while (this.queue.length > 0 && this.queue[0].time <= now) {
      this.lastAudibleStep = this.queue[0].step;
      this.queue.shift();
    }
  }

  private tick(): void {
    if (!this.playing) return;
    const ctx = this.engine.context;
    if (!ctx) return;

    this.drain();
    const horizon = ctx.currentTime + this.lookaheadSeconds;
    // Guard against a pathological case: if the tab was frozen for a long
    // time the loop below could otherwise schedule thousands of steps at once.
    let budget = 512;

    while (this.nextStepTime < horizon && budget-- > 0) {
      const duration = this.secondsPerStep;
      const event: StepEvent = { step: this.nextStep, time: this.nextStepTime, duration };

      this.handler?.(event);
      this.queue.push(event);

      this.nextStepTime += duration;
      this.nextStep = this.stepCount > 0 ? (this.nextStep + 1) % this.stepCount : this.nextStep + 1;
    }

    if (budget <= 0) {
      // Resynchronise rather than sprinting to catch up after a long freeze.
      this.nextStepTime = ctx.currentTime + 0.05;
      this.queue = [];
    }
  }
}
