import { AudioEngine } from './AudioEngine';
import { Scheduler, type StepEvent } from './Scheduler';
import { GraphInstrument } from './GraphInstrument';
import { presetGraph } from './graph-presets';
import { Scale, type ScaleName } from '../lib/scale';
import {
  findPattern, isAudible, laneInstrumentId, laneKey, laneScaleName, positionAt,
  type Lane, type Song, type Track,
} from '../lib/song';
import { mod } from '../lib/math';

/**
 * Everything the page needs to make sound, with no React in it.
 *
 * The scheduler's step handler runs ahead of the audio clock and must never
 * wait on a render, so it reads the song from a mutable field the UI
 * overwrites rather than from a closure. Editing a step, a patch, the key or
 * the mode lands on the next scheduled step without re-registering anything and
 * without interrupting playback.
 */

export interface Position {
  orderIndex: number;
  row: number;
  patternId: string;
}

/**
 * What playback covers.
 *
 * `song` runs the order list; `pattern` cycles one block for editing; `lane`
 * cycles one block with a single track audible, for hearing what a generator is
 * actually doing on its own.
 */
export type PlayScope =
  | { kind: 'song' }
  | { kind: 'pattern'; patternId: string }
  | { kind: 'lane'; patternId: string; trackId: string };

export const SONG_SCOPE: PlayScope = { kind: 'song' };

export class AriaSession {
  readonly engine: AudioEngine;
  readonly scheduler: Scheduler;

  private song: Song | null = null;
  private fallbackScale = new Scale('C3', 'dorian');
  private scope: PlayScope = SONG_SCOPE;

  /**
   * Keyed by track *and* patch, because a lane may name its own instrument and
   * so one channel can play different patches in different patterns. Each
   * combination needs its own voice pool — sharing one would let a busy pattern
   * steal voices from a patch it is not even using.
   */
  private instruments = new Map<string, GraphInstrument>();
  /** Scales are immutable and cheap; building one per step would not be. */
  private scales = new Map<string, Scale>();
  private started = false;

  constructor() {
    this.engine = new AudioEngine({ masterVolume: 0.7 });
    // Free-running: patterns may differ in length, so the wrap point is not a
    // constant the scheduler could know. positionAt does the mapping instead.
    this.scheduler = new Scheduler(this.engine, { bpm: 110, stepsPerBeat: 4, stepCount: 0 });
  }

  get isPlaying(): boolean {
    return this.scheduler.isPlaying;
  }

  getScope(): PlayScope {
    return this.scope;
  }

  setScope(scope: PlayScope): void {
    this.scope = scope;
  }

  /**
   * Hands the session the current song. Cheap and safe to call on every render:
   * it only touches Web Audio when transport values or the patches change.
   */
  setSong(song: Song, scale: Scale): void {
    const previous = this.song;
    this.song = song;
    this.fallbackScale = scale;

    if (!previous || previous.bpm !== song.bpm) this.scheduler.setBpm(song.bpm);
    if (!previous || previous.stepsPerBeat !== song.stepsPerBeat) {
      this.scheduler.setStepsPerBeat(song.stepsPerBeat);
    }
    if (this.started) this.syncInstruments();
  }

  /** Where the arrangement is right now, or null when stopped. */
  getPosition(): Position | null {
    const song = this.song;
    const step = this.scheduler.getPlayingStep();
    if (!song || step < 0) return null;

    if (this.scope.kind !== 'song') {
      const pattern = findPattern(song, this.scope.patternId);
      if (!pattern || pattern.stepCount <= 0) return null;
      return { orderIndex: -1, row: mod(step, pattern.stepCount), patternId: pattern.id };
    }

    const position = positionAt(song, step);
    if (!position) return null;
    return { ...position, patternId: song.order[position.orderIndex] };
  }

  /** Must be reached from a user gesture, or the context stays suspended. */
  async start(scope: PlayScope = SONG_SCOPE): Promise<void> {
    this.scope = scope;
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
    this.scales.clear();
    this.started = false;
    void this.engine.dispose();
  }

  private instrumentKey(trackId: string, instrumentId: string): string {
    return `${trackId}::${instrumentId}`;
  }

  /** A cached Scale for a key and mode, falling back if the key will not parse. */
  private scaleFor(key: string, scaleName: string): Scale {
    const id = `${key}|${scaleName}`;
    const cached = this.scales.get(id);
    if (cached) return cached;
    let scale: Scale;
    try {
      scale = new Scale(key, scaleName as ScaleName);
    } catch {
      scale = this.fallbackScale;
    }
    this.scales.set(id, scale);
    return scale;
  }

  /** Creates, updates and retires one instrument per track-and-patch pairing. */
  private syncInstruments(): void {
    const song = this.song;
    if (!song || !this.engine.context) return;

    const live = new Set<string>();
    for (const track of song.tracks) {
      // Every patch this channel plays anywhere in the song, its default
      // included, so switching patterns never has to build one mid-phrase.
      const patchIds = new Set<string>([track.instrumentId]);
      for (const pattern of song.patterns) {
        patchIds.add(laneInstrumentId(track, pattern.lanes[track.id]));
      }

      for (const instrumentId of patchIds) {
        const key = this.instrumentKey(track.id, instrumentId);
        live.add(key);
        const graph = song.instruments[instrumentId] ?? presetGraph('default');
        let instrument = this.instruments.get(key);
        if (!instrument) {
          instrument = new GraphInstrument(this.engine, key, graph, track.polyphony);
          this.instruments.set(key, instrument);
        }
        instrument.setGraph(graph);
        instrument.setPolyphony(track.polyphony);
        instrument.setLevel(track.level);
      }
    }

    for (const [key, instrument] of this.instruments) {
      if (live.has(key)) continue;
      instrument.dispose();
      this.instruments.delete(key);
    }
  }

  /** Whether a track sounds under the current scope, on top of mute and solo. */
  private inScope(song: Song, track: Track): boolean {
    if (this.scope.kind === 'lane') return track.id === this.scope.trackId;
    return isAudible(song, track);
  }

  private handleStep = (event: StepEvent): void => {
    const song = this.song;
    if (!song) return;

    // Resolve which pattern and row this step lands on. Doing it here rather
    // than in the scheduler is what lets patterns have different lengths.
    let pattern;
    let row;
    if (this.scope.kind !== 'song') {
      pattern = findPattern(song, this.scope.patternId);
      if (!pattern || pattern.stepCount <= 0) return;
      row = mod(event.step, pattern.stepCount);
    } else {
      const position = positionAt(song, event.step);
      if (!position) return;
      pattern = findPattern(song, song.order[position.orderIndex]);
      row = position.row;
    }
    if (!pattern) return;

    for (const track of song.tracks) {
      if (!this.inScope(song, track)) continue;
      const lane: Lane | undefined = pattern.lanes[track.id];
      const step = lane?.steps[row];
      if (!step) continue;

      const instrument = this.instruments.get(
        this.instrumentKey(track.id, laneInstrumentId(track, lane)),
      );
      if (!instrument) continue;

      // Each lane resolves its own key and mode, so one can sit in a different
      // scale from the rest without touching the song's.
      const scale = this.scaleFor(laneKey(song, lane), laneScaleName(song, lane));

      instrument.noteOn({
        time: event.time,
        index: scale.indexAt(step.degree),
        holdSeconds: event.duration * track.gate,
        velocity: step.velocity ?? 0.9,
      });
    }
  };
}
