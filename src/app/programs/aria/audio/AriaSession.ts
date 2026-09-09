import { AudioEngine } from './AudioEngine';
import { Scheduler, type StepEvent } from './Scheduler';
import { Instrument } from './Instrument';
import { DEFAULT_INSTRUMENT } from './InstrumentParams';
import { Scale } from '../lib/scale';
import { isAudible, type Song } from '../lib/song';
import { mod } from '../lib/math';

/**
 * Everything the page needs to make sound, with no React in it.
 *
 * The scheduler's step handler runs ahead of the audio clock and must never
 * wait on a render, so it reads the song from a mutable field the UI
 * overwrites rather than from a closure. Editing a step, a patch, the key or
 * the mode lands on the next scheduled step without re-registering anything and
 * without interrupting playback.
 *
 * One Instrument per *track*, not per patch. Two tracks sharing a patch id still
 * need separate voice pools, or a busy track would steal the other's voices.
 */
export class AriaSession {
  readonly engine: AudioEngine;
  readonly scheduler: Scheduler;

  private song: Song | null = null;
  private scale = new Scale('C3', 'dorian');
  private instruments = new Map<string, Instrument>();
  private started = false;

  constructor() {
    this.engine = new AudioEngine({ masterVolume: 0.7 });
    this.scheduler = new Scheduler(this.engine, { bpm: 110, stepsPerBeat: 4, stepCount: 16 });
  }

  get isPlaying(): boolean {
    return this.scheduler.isPlaying;
  }

  /**
   * Hands the session the current song. Cheap and safe to call on every render:
   * it only touches Web Audio when transport values or the track set change.
   */
  setSong(song: Song, scale: Scale): void {
    const previous = this.song;
    this.song = song;
    this.scale = scale;

    if (!previous || previous.bpm !== song.bpm) this.scheduler.setBpm(song.bpm);
    if (!previous || previous.stepsPerBeat !== song.stepsPerBeat) {
      this.scheduler.setStepsPerBeat(song.stepsPerBeat);
    }
    if (!previous || previous.stepCount !== song.stepCount) {
      this.scheduler.setStepCount(song.stepCount);
    }
    if (this.started) this.syncInstruments();
  }

  /** Must be reached from a user gesture, or the context stays suspended. */
  async start(): Promise<void> {
    await this.engine.start();
    this.started = true;
    this.syncInstruments();
    // Re-registered on every start so the session survives a dispose and
    // remount, which React strict mode does on purpose in development.
    this.scheduler.onStep(this.handleStep);
    this.scheduler.start(0);
  }

  stop(): void {
    this.scheduler.stop();
    for (const instrument of this.instruments.values()) instrument.releaseAll();
  }

  /** Immediate silence, ignoring release tails. */
  panic(): void {
    this.scheduler.stop();
    for (const instrument of this.instruments.values()) instrument.panic();
  }

  getPlayingStep(): number {
    return this.scheduler.getPlayingStep();
  }

  /** Voices sounding across every track, against the summed polyphony caps. */
  voiceLoad(): { active: number; capacity: number; stolen: number } {
    let active = 0;
    let capacity = 0;
    let stolen = 0;
    for (const instrument of this.instruments.values()) {
      active += instrument.activeVoices();
      capacity += instrument.polyphonyLimit;
      stolen += instrument.stolenNotes;
    }
    return { active, capacity, stolen };
  }

  resetStats(): void {
    for (const instrument of this.instruments.values()) instrument.stolenNotes = 0;
  }

  dispose(): void {
    this.scheduler.dispose();
    for (const instrument of this.instruments.values()) instrument.dispose();
    this.instruments.clear();
    this.started = false;
    void this.engine.dispose();
  }

  /** Creates, updates and retires one Instrument per track. */
  private syncInstruments(): void {
    const song = this.song;
    if (!song || !this.engine.context) return;

    for (const track of song.tracks) {
      const params = song.instruments[track.instrumentId] ?? DEFAULT_INSTRUMENT;
      let instrument = this.instruments.get(track.id);
      if (!instrument) {
        instrument = new Instrument(this.engine, track.id, params, track.polyphony);
        this.instruments.set(track.id, instrument);
      }
      instrument.setParams(params);
      instrument.setPolyphony(track.polyphony);
      instrument.setLevel(track.level);
    }

    const live = new Set(song.tracks.map((t) => t.id));
    for (const [id, instrument] of this.instruments) {
      if (live.has(id)) continue;
      instrument.dispose();
      this.instruments.delete(id);
    }
  }

  private handleStep = (event: StepEvent): void => {
    const song = this.song;
    if (!song) return;

    for (const track of song.tracks) {
      if (!isAudible(song, track)) continue;
      const step = track.steps[mod(event.step, track.steps.length)];
      if (!step) continue;

      const instrument = this.instruments.get(track.id);
      if (!instrument) continue;

      instrument.noteOn({
        time: event.time,
        index: this.scale.indexAt(step.degree),
        holdSeconds: event.duration * track.gate,
        velocity: step.velocity ?? 0.9,
      });
    }
  };
}
