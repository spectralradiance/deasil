import type { AudioEngine } from './AudioEngine';
import { compileSubgraph, findOutputNode, type CompiledSubgraph } from './compile';
import { splitGraph, type GraphSplit, type InstrumentGraph } from './graph';
import { isEnvelopeNode } from './nodes/registry';
import { GraphVoice } from './GraphVoice';
import { createSoftClip, type SoftClip } from './softclip';
import { frequencyOf, TWELVE_TET, type Tuning } from '../lib/tuning';

/**
 * An instrument built from a graph: the shared half, a pool of graph voices,
 * and the output safety stage.
 *
 * Recompiling on every edit would cut the sound off mid-note, so the shared
 * chain is rebuilt only when the graph actually changes, and voices already
 * sounding keep the chain they were wired into until they finish.
 */

export interface NoteRequest {
  time: number;
  index: number;
  holdSeconds: number;
  velocity?: number;
}

export class GraphInstrument {
  readonly id: string;
  tuning: Tuning = TWELVE_TET;
  stolenNotes = 0;

  private readonly engine: AudioEngine;
  private readonly output: GainNode;
  private readonly safety: SoftClip;

  private graph: InstrumentGraph;
  private split: GraphSplit;
  private shared: CompiledSubgraph | null = null;
  private voices: GraphVoice[] = [];
  private polyphony: number;

  constructor(engine: AudioEngine, id: string, graph: InstrumentGraph, polyphony = 6) {
    const ctx = engine.context;
    if (!ctx) throw new Error('Aria: GraphInstrument needs a started AudioEngine');

    this.engine = engine;
    this.id = id;
    this.graph = graph;
    this.split = splitGraph(graph, isEnvelopeNode);
    this.polyphony = Math.max(1, polyphony);

    this.output = ctx.createGain();
    this.output.gain.value = 1;
    this.safety = createSoftClip(ctx);
    this.output.connect(this.safety.input);
    this.safety.output.connect(engine.destination);

    this.buildShared();
    this.buildVoices();
  }

  get polyphonyLimit(): number {
    return this.polyphony;
  }

  activeVoices(time = this.engine.currentTime): number {
    let n = 0;
    for (const voice of this.voices) if (voice.isActive(time)) n += 1;
    return n;
  }

  /** Rebuilds only when the graph really changed — identity is enough. */
  setGraph(graph: InstrumentGraph): void {
    if (graph === this.graph) return;
    this.graph = graph;
    this.split = splitGraph(graph, isEnvelopeNode);
    this.buildShared();
  }

  setPolyphony(polyphony: number): void {
    const next = Math.max(1, Math.floor(polyphony));
    if (next === this.polyphony) return;
    this.polyphony = next;
    this.disposeVoices();
    this.buildVoices();
  }

  setLevel(level: number): void {
    const ctx = this.engine.context;
    if (!ctx) return;
    const now = ctx.currentTime;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setValueAtTime(this.output.gain.value, now);
    this.output.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, level)), now + 0.02);
  }

  noteOn({ time, index, holdSeconds, velocity = 0.9 }: NoteRequest): void {
    const shared = this.shared;
    if (!shared) return;

    const { voice, stolen } = this.allocate(time);
    if (stolen) this.stolenNotes += 1;
    voice.noteId = index;
    voice.play(
      this.graph, this.split, shared.instances,
      findOutputNode(this.graph), this.output,
      frequencyOf(index, this.tuning), time, holdSeconds, velocity,
    );
  }

  noteOff(index: number, time: number): void {
    let match: GraphVoice | null = null;
    for (const voice of this.voices) {
      if (voice.noteId !== index || !voice.isActive(time)) continue;
      if (!match || voice.startTime > match.startTime) match = voice;
    }
    match?.release(time);
  }

  releaseAll(time = this.engine.currentTime): void {
    for (const voice of this.voices) if (voice.isActive(time)) voice.release(time);
  }

  panic(): void {
    for (const voice of this.voices) voice.kill();
  }

  dispose(): void {
    this.disposeVoices();
    this.shared?.dispose();
    this.shared = null;
    this.output.disconnect();
    this.safety.disconnect();
  }

  /**
   * Allocation is scheduled, not live: the scheduler always works ahead of the
   * audio clock, so "free" means free at the note's start time.
   */
  private allocate(time: number): { voice: GraphVoice; stolen: boolean } {
    let idle: GraphVoice | null = null;
    let oldest: GraphVoice | null = null;

    for (const voice of this.voices) {
      if (!voice.isActive(time)) {
        if (!idle || voice.freeAt < idle.freeAt) idle = voice;
        continue;
      }
      if (!oldest || voice.startTime < oldest.startTime) oldest = voice;
    }

    if (idle) return { voice: idle, stolen: false };
    const victim = oldest ?? this.voices[0];
    victim.steal(time);
    return { voice: victim, stolen: true };
  }

  private buildShared(): void {
    const ctx = this.engine.context;
    if (!ctx) return;

    const previous = this.shared;
    const compiled = compileSubgraph(ctx, this.graph, this.split.shared, 440);

    // The graph's output node is the instrument bus. Without one — or with an
    // empty shared half — voices connect straight to the bus instead.
    const outputId = findOutputNode(this.graph);
    const outputInstance = outputId ? compiled.instances.get(outputId) : undefined;
    if (outputInstance?.output) {
      outputInstance.output.connect(this.output);
    }
    compiled.start(ctx.currentTime);
    this.shared = compiled;

    // Let notes already sounding finish through the old chain before it goes.
    if (previous) {
      const graceMs = 2000;
      setTimeout(() => previous.dispose(), graceMs);
    }
  }

  private buildVoices(): void {
    const ctx = this.engine.context;
    if (!ctx) return;
    this.voices = Array.from({ length: this.polyphony }, () => new GraphVoice(ctx));
  }

  private disposeVoices(): void {
    for (const voice of this.voices) voice.dispose();
    this.voices = [];
  }
}
