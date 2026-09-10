import {
  AUDIO_IN_PORT, compileSubgraph, isOfflineContext, resolveTarget, type CompiledSubgraph,
} from './compile';
import type { GraphSplit, InstrumentGraph } from './graph';
import type { NodeInstance } from './nodes/registry';

/**
 * One slot in an instrument's polyphony, and the notes passing through it.
 *
 * Phase 2's voice kept its filter and gain alive between notes and rebuilt only
 * the oscillators. A graph voice cannot: the topology is arbitrary and may have
 * changed since the last note, so the whole per-voice slice is rebuilt each
 * time. That is affordable precisely because of the split — the expensive
 * nodes, above all the convolution reverb, live on the shared side and are
 * built once per instrument.
 *
 * The subtlety is that a new note must not destroy the previous one. A stolen
 * note has a fade already written onto its timeline, and tearing its nodes down
 * to make room would cut that fade off mid-ramp. Worse, an offline render
 * schedules the entire song before producing a single sample, so disposing on
 * reuse there erases every note but the last one each slot played. So each note
 * owns its whole chain — including the gain it fades out through — and a
 * replaced note is *retired* rather than disposed, cleaned up only once its
 * scheduled end has actually passed.
 */

interface ActiveNote {
  compiled: CompiledSubgraph;
  /** This note's own exit gain: what its fade rides down. */
  exit: GainNode;
  /** Context time after which the note is finished and safe to dispose. */
  endsAt: number;
}

export class GraphVoice {
  private readonly ctx: BaseAudioContext;
  private readonly offline: boolean;

  private current: ActiveNote | null = null;
  private retired: ActiveNote[] = [];
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;

  startTime = -Infinity;
  freeAt = -Infinity;
  noteId: number | null = null;

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    this.offline = isOfflineContext(ctx);
  }

  isActive(time: number): boolean {
    return time < this.freeAt;
  }

  play(
    graph: InstrumentGraph,
    split: GraphSplit,
    shared: Map<string, NodeInstance>,
    outputNodeId: string | null,
    destination: AudioNode,
    frequency: number,
    time: number,
    holdSeconds: number,
    velocity: number,
  ): void {
    // Hand the outgoing note over intact; its fade is already on the timeline.
    if (this.current) {
      this.retired.push(this.current);
      this.current = null;
    }

    const compiled = compileSubgraph(this.ctx, graph, split.voice, frequency);
    const exit = this.ctx.createGain();
    exit.gain.setValueAtTime(1, time);

    let routed = false;

    // Edges crossing into the shared half. Audio goes through the exit gain;
    // modulation goes straight through, since it is not part of the signal.
    for (const edge of compiled.outgoing) {
      const source = compiled.instances.get(edge.from.node);
      const target = resolveTarget(graph, shared, edge);
      if (!source?.output || !target) continue;
      try {
        if (edge.to.port === AUDIO_IN_PORT) {
          source.output.connect(exit);
          exit.connect(target as AudioNode);
          routed = true;
        } else {
          source.output.connect(target as AudioParam);
        }
      } catch {
        // Skip an unconnectable edge rather than losing the note.
      }
    }

    // When the graph's output node fell on the voice side — a patch with no
    // envelope, so nothing is shared — the note reaches the bus itself.
    if (outputNodeId && split.voice.has(outputNodeId)) {
      const outputInstance = compiled.instances.get(outputNodeId);
      if (outputInstance?.output) {
        outputInstance.output.connect(exit);
        exit.connect(destination);
        routed = true;
      }
    }
    if (!routed) exit.connect(destination);

    // Envelopes decide how long the note lives. Without one, fall back to the
    // note length plus a short tail so the slot still frees itself.
    let endTime = time + holdSeconds + 0.05;
    for (const instance of compiled.instances.values()) {
      const finish = instance.trigger?.(time, holdSeconds, velocity);
      if (finish !== undefined && finish > endTime) endTime = finish;
    }

    compiled.start(time);
    compiled.stop(endTime + 0.02);

    this.current = { compiled, exit, endsAt: endTime + 0.05 };
    this.startTime = time;
    this.freeAt = endTime;
    this.scheduleCleanup();
  }

  /** Ends the note early with a short, inaudible fade. */
  release(time: number, fadeSeconds = 0.03): number {
    return this.fadeOut(time, fadeSeconds);
  }

  /** Steals the slot for a new note: faster than a release, still click-free. */
  steal(time: number, fadeSeconds = 0.006): number {
    return this.fadeOut(time, fadeSeconds);
  }

  /** Immediate silence, for transport stop. */
  kill(): void {
    this.disposeAll();
    this.startTime = -Infinity;
    this.freeAt = -Infinity;
    this.noteId = null;
  }

  dispose(): void {
    this.disposeAll();
  }

  private fadeOut(time: number, fadeSeconds: number): number {
    const note = this.current;
    const end = time + Math.max(fadeSeconds, 0.004);
    if (!note) return end;

    const gain = note.exit.gain;
    gain.cancelScheduledValues(time);
    gain.setValueAtTime(gain.value, time);
    gain.linearRampToValueAtTime(0, end);
    note.compiled.stop(end + 0.01);
    note.endsAt = end + 0.05;
    this.freeAt = end;
    this.scheduleCleanup();
    return end;
  }

  /**
   * Disposes retired notes whose end has passed.
   *
   * Offline renders schedule the whole timeline while currentTime is still 0,
   * so a wall-clock timer derived from an audio time would fire mid-render and
   * tear down nodes whose audio has not been produced yet. There is nothing to
   * reclaim offline anyway: the context is discarded as a whole.
   */
  private scheduleCleanup(): void {
    if (this.offline) return;
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);

    const now = this.ctx.currentTime;
    const pending = [...this.retired, ...(this.current ? [this.current] : [])];
    const next = pending.reduce((soonest, note) => Math.min(soonest, note.endsAt), Infinity);
    if (!Number.isFinite(next)) return;

    this.cleanupTimer = setTimeout(() => {
      this.cleanupTimer = null;
      const time = this.ctx.currentTime;
      this.retired = this.retired.filter((note) => {
        if (note.endsAt > time) return true;
        this.disposeNote(note);
        return false;
      });
      if (this.current && this.current.endsAt <= time) {
        this.disposeNote(this.current);
        this.current = null;
      }
      if (this.retired.length > 0 || this.current) this.scheduleCleanup();
    }, Math.max(0, (next - now) * 1000) + 60);
  }

  private disposeNote(note: ActiveNote): void {
    note.compiled.dispose();
    note.exit.disconnect();
  }

  private disposeAll(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    for (const note of this.retired) this.disposeNote(note);
    this.retired = [];
    if (this.current) this.disposeNote(this.current);
    this.current = null;
  }
}
