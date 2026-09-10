/**
 * The instrument graph: a serializable description of a synth.
 *
 * Plain data — no class instances, no Web Audio references — so it round-trips
 * through JSON with the rest of the song. `nodes/registry.ts` says what each
 * type means; `compileGraph` turns it into actual audio nodes.
 */

export type PortKind = 'audio' | 'modulation';

/** `nodeId` alone means the node's audio output/input; a param name means an AudioParam. */
export interface Endpoint {
  node: string;
  /** Output port name, or 'out' for the default audio output. */
  port: string;
}

export interface GraphEdge {
  id: string;
  from: Endpoint;
  to: Endpoint;
}

export interface GraphNode {
  id: string;
  type: string;
  params: Record<string, number | string>;
  position: { x: number; y: number };
}

export interface InstrumentGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const OUTPUT_PORT = 'out';
export const AUDIO_IN_PORT = 'in';

let counter = 0;
export function newNodeId(type: string): string {
  counter += 1;
  return `${type}-${counter}`;
}
export function newEdgeId(): string {
  counter += 1;
  return `e${counter}`;
}

// ---- traversal --------------------------------------------------------------

export function findNode(graph: InstrumentGraph, id: string): GraphNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

/** Every node that feeds `id`, directly or indirectly, including `id` itself. */
export function upstreamOf(graph: InstrumentGraph, id: string): Set<string> {
  const seen = new Set<string>([id]);
  const queue = [id];
  while (queue.length > 0) {
    const current = queue.pop() as string;
    for (const edge of graph.edges) {
      if (edge.to.node !== current || seen.has(edge.from.node)) continue;
      seen.add(edge.from.node);
      queue.push(edge.from.node);
    }
  }
  return seen;
}

/**
 * Detects an audio cycle that does not pass through a delay.
 *
 * Web Audio permits a feedback loop only when a DelayNode sits in it — that is
 * what gives the loop a defined block size. Any other cycle is silently dropped
 * by the browser, so it is worth refusing up front rather than shipping a patch
 * that mysteriously makes no sound.
 */
export function findIllegalCycle(
  graph: InstrumentGraph,
  isDelay: (node: GraphNode) => boolean,
): string[] | null {
  const state = new Map<string, 'open' | 'done'>();
  const stack: string[] = [];

  const visit = (id: string): string[] | null => {
    const status = state.get(id);
    if (status === 'done') return null;
    if (status === 'open') {
      const cycle = stack.slice(stack.indexOf(id));
      return cycle.some((n) => {
        const node = findNode(graph, n);
        return node ? isDelay(node) : false;
      })
        ? null
        : cycle;
    }

    state.set(id, 'open');
    stack.push(id);
    for (const edge of graph.edges) {
      if (edge.from.node !== id) continue;
      const found = visit(edge.to.node);
      if (found) return found;
    }
    stack.pop();
    state.set(id, 'done');
    return null;
  };

  for (const node of graph.nodes) {
    const found = visit(node.id);
    if (found) return found;
  }
  return null;
}

// ---- the per-voice / shared split -------------------------------------------

export interface GraphSplit {
  /** Rebuilt for every note. */
  voice: Set<string>;
  /** Built once per instrument and shared by all its voices. */
  shared: Set<string>;
  /** The gain node the amplitude envelope drives, if there is one. */
  ampNodeId: string | null;
}

/**
 * Splits the graph at the amplitude envelope.
 *
 * Everything upstream of the amp gain is per-voice: oscillators are single-use
 * by spec, and each note needs its own envelope. Everything downstream is
 * shared, because building a convolution reverb per note would be ruinous —
 * that is the single most expensive mistake this design exists to prevent.
 *
 * The amp node is found structurally rather than by name: it is the gain node
 * whose gain param an envelope drives. If a patch has none, every node is
 * treated as per-voice, which is correct if wasteful and never silently wrong.
 */
export function splitGraph(
  graph: InstrumentGraph,
  isEnvelope: (node: GraphNode) => boolean,
): GraphSplit {
  const ampEdge = graph.edges.find((edge) => {
    const source = findNode(graph, edge.from.node);
    return source !== undefined && isEnvelope(source) && edge.to.port !== OUTPUT_PORT;
  });

  const ampNodeId = ampEdge?.to.node ?? null;
  if (!ampNodeId) {
    return { voice: new Set(graph.nodes.map((n) => n.id)), shared: new Set(), ampNodeId: null };
  }

  const voice = upstreamOf(graph, ampNodeId);
  const shared = new Set(graph.nodes.map((n) => n.id).filter((id) => !voice.has(id)));
  return { voice, shared, ampNodeId };
}

/** Where a node will be instantiated, for display in the editor. */
export function scopeOf(split: GraphSplit, id: string): 'voice' | 'shared' {
  return split.voice.has(id) ? 'voice' : 'shared';
}
