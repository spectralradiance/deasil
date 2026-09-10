import { AUDIO_IN_PORT, compileSubgraph, resolveTarget, type CompiledSubgraph } from './compile';
import type { GraphSplit, InstrumentGraph } from './graph';
import type { NodeInstance } from './nodes/registry';

/**
 * One sounding note, built from the per-voice half of an instrument graph.
 *
 * Phase 2's voice kept its filter and gain alive between notes and rebuilt only
 * the oscillators. A graph voice cannot: the topology is arbitrary and may have
 * changed since the last note, so the whole per-voice slice is rebuilt each
 * time. That is affordable precisely because of the split — the expensive
 * nodes, above all the convolution reverb, live on the shared side and are
 * built once per instrument.
 *
 * Every audio path out of the voice passes through one gain it owns. That costs
 * a node and buys a guarantee: a voice can always be faded out click-free, even
 * when the patch has no envelope in it at all.
 */
export class GraphVoice {
  private readonly ctx: BaseAudioContext;
  private readonly exit: GainNode;
  private compiled: CompiledSubgraph | null = null;
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;

  startTime = -Infinity;
  freeAt = -Infinity;
  noteId: number | null = null;

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    this.exit = ctx.createGain();
    this.exit.gain.value = 1;
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
    this.teardown();

    const compiled = compileSubgraph(this.ctx, graph, split.voice, frequency);
    this.compiled = compiled;

    this.exit.disconnect();
    this.exit.gain.cancelScheduledValues(time);
    this.exit.gain.setValueAtTime(1, time);

    let routed = false;

    // Edges crossing into the shared half. Audio goes through the exit gain;
    // modulation goes straight through, since it is not part of the signal.
    for (const edge of compiled.outgoing) {
      const source = compiled.instances.get(edge.from.node);
      const target = resolveTarget(graph, shared, edge);
      if (!source?.output || !target) continue;
      try {
        if (edge.to.port === AUDIO_IN_PORT) {
          source.output.connect(this.exit);
          this.exit.connect(target as AudioNode);
          routed = true;
        } else {
          source.output.connect(target as AudioParam);
        }
      } catch {
        // Skip an unconnectable edge rather than losing the note.
      }
    }

    // When the graph's output node fell on the voice side — a patch with no
    // envelope, so nothing is shared — the voice reaches the bus itself.
    if (outputNodeId && split.voice.has(outputNodeId)) {
      const outputInstance = compiled.instances.get(outputNodeId);
      if (outputInstance?.output) {
        outputInstance.output.connect(this.exit);
        this.exit.connect(destination);
        routed = true;
      }
    }
    if (!routed) this.exit.connect(destination);

    // Envelopes decide how long the voice lives. Without one, fall back to the
    // note length plus a short tail so the voice still frees itself.
    let endTime = time + holdSeconds + 0.05;
    for (const instance of compiled.instances.values()) {
      const finish = instance.trigger?.(time, holdSeconds, velocity);
      if (finish !== undefined && finish > endTime) endTime = finish;
    }

    compiled.start(time);
    compiled.stop(endTime + 0.02);

    this.startTime = time;
    this.freeAt = endTime;
    this.scheduleCleanup(endTime);
  }

  /** Ends the note early with a short, inaudible fade. */
  release(time: number, fadeSeconds = 0.03): number {
    return this.fadeOut(time, fadeSeconds);
  }

  /** Steals the voice for a new note: faster than a release, still click-free. */
  steal(time: number, fadeSeconds = 0.006): number {
    return this.fadeOut(time, fadeSeconds);
  }

  kill(): void {
    this.teardown();
    this.exit.gain.cancelScheduledValues(this.ctx.currentTime);
    this.exit.gain.value = 1;
    this.startTime = -Infinity;
    this.freeAt = -Infinity;
    this.noteId = null;
  }

  dispose(): void {
    this.teardown();
    this.exit.disconnect();
  }

  private fadeOut(time: number, fadeSeconds: number): number {
    const end = time + Math.max(fadeSeconds, 0.004);
    const gain = this.exit.gain;
    gain.cancelScheduledValues(time);
    gain.setValueAtTime(gain.value, time);
    gain.linearRampToValueAtTime(0, end);
    this.compiled?.stop(end + 0.01);
    this.freeAt = end;
    this.scheduleCleanup(end);
    return end;
  }

  private scheduleCleanup(endTime: number): void {
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
    const delay = Math.max(0, (endTime - this.ctx.currentTime) * 1000) + 60;
    this.cleanupTimer = setTimeout(() => {
      this.cleanupTimer = null;
      this.teardown();
    }, delay);
  }

  private teardown(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.compiled?.dispose();
    this.compiled = null;
    this.exit.disconnect();
  }
}
