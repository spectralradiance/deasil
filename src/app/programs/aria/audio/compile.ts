import {
  AUDIO_IN_PORT, OUTPUT_PORT, findNode,
  type GraphEdge, type InstrumentGraph,
} from './graph';
import { definitionFor, type NodeInstance } from './nodes/registry';

/**
 * Turns a slice of a graph into live Web Audio nodes.
 *
 * The same function builds both halves of the split. Edges that leave the slice
 * are handed back rather than dropped, so a voice can wire its output into the
 * instrument's shared chain without either half knowing the other's shape.
 */

export interface CompiledSubgraph {
  instances: Map<string, NodeInstance>;
  /** Edges whose source is inside the slice and whose target is outside it. */
  outgoing: GraphEdge[];
  start(time: number): void;
  stop(time: number): void;
  dispose(): void;
}

/**
 * Resolves an edge's destination to something connectable: an audio node input,
 * or an AudioParam when the edge targets a param by name.
 */
export function resolveTarget(
  graph: InstrumentGraph,
  instances: Map<string, NodeInstance>,
  edge: GraphEdge,
): AudioNode | AudioParam | null {
  const instance = instances.get(edge.to.node);
  if (!instance) return null;
  if (edge.to.port === AUDIO_IN_PORT) return instance.input ?? null;
  return instance.params.get(edge.to.port) ?? instance.input ?? null;
}

/**
 * Zeroes a param's base value when something is patched into it and the
 * definition asks for it. Web Audio adds modulation to the base, so an amp gain
 * left at 1 would swing 1..2 and never shape anything. See ParamDef.
 */
function applyModulationBase(
  graph: InstrumentGraph,
  instances: Map<string, NodeInstance>,
): void {
  for (const edge of graph.edges) {
    if (edge.to.port === AUDIO_IN_PORT) continue;
    const node = findNode(graph, edge.to.node);
    const instance = instances.get(edge.to.node);
    if (!node || !instance) continue;
    const definition = definitionFor(node.type);
    const param = definition?.params.find((p) => p.name === edge.to.port);
    if (param?.modulationBase !== 'zero') continue;
    const audioParam = instance.params.get(edge.to.port);
    if (audioParam) audioParam.value = 0;
  }
}

export function compileSubgraph(
  ctx: BaseAudioContext,
  graph: InstrumentGraph,
  include: Set<string>,
  frequency: number,
): CompiledSubgraph {
  const instances = new Map<string, NodeInstance>();

  for (const node of graph.nodes) {
    if (!include.has(node.id)) continue;
    const definition = definitionFor(node.type);
    if (!definition) continue;
    instances.set(node.id, definition.build(node, { ctx, frequency }));
  }

  const outgoing: GraphEdge[] = [];
  for (const edge of graph.edges) {
    const fromInside = include.has(edge.from.node);
    const toInside = include.has(edge.to.node);
    if (!fromInside) continue;
    if (!toInside) {
      outgoing.push(edge);
      continue;
    }
    const source = instances.get(edge.from.node);
    const target = resolveTarget(graph, instances, edge);
    if (!source?.output || !target) continue;
    try {
      source.output.connect(target as AudioNode);
    } catch {
      // Mismatched port, or a cycle the browser refuses. Skip the edge rather
      // than losing the whole patch.
    }
  }

  applyModulationBase(graph, instances);

  return {
    instances,
    outgoing,
    start(time) {
      for (const instance of instances.values()) instance.start?.(time);
    },
    stop(time) {
      for (const instance of instances.values()) instance.stop?.(time);
    },
    dispose() {
      for (const instance of instances.values()) instance.dispose?.();
      instances.clear();
    },
  };
}

/**
 * Whether this context renders offline rather than in real time.
 *
 * It matters because an offline context's `currentTime` stays at 0 while the
 * whole timeline is being scheduled, so anything that converts an audio time
 * into a wall-clock `setTimeout` computes a delay that can elapse *during* the
 * render. Offline needs no teardown timers anyway — the context is discarded
 * whole once rendering finishes.
 */
export function isOfflineContext(ctx: BaseAudioContext): boolean {
  return typeof (ctx as OfflineAudioContext).startRendering === 'function';
}

/** The node every audible signal must reach. */
export function findOutputNode(graph: InstrumentGraph): string | null {
  return graph.nodes.find((n) => n.type === 'output')?.id ?? null;
}

export { AUDIO_IN_PORT, OUTPUT_PORT };
