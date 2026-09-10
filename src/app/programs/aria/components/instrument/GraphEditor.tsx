// The patch canvas. Renders an InstrumentGraph with React Flow and writes
// every change straight back to it — the graph stays the single source of
// truth, and the audio layer compiles it independently.

'use client';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType,
  type Connection, type Edge, type Node, type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, useTheme } from '@mui/material';
import {
  AUDIO_IN_PORT, newEdgeId, OUTPUT_PORT, scopeOf, splitGraph,
  type GraphEdge, type InstrumentGraph,
} from '../../audio/graph';
import { definitionFor, isEnvelopeNode } from '../../audio/nodes/registry';
import SynthNode, { type SynthNodeData } from './SynthNode';

const nodeTypes = { synth: SynthNode };

/** A one-line description of a node's settings, for the card face. */
function summarise(type: string, params: Record<string, number | string>): string {
  const definition = definitionFor(type);
  if (!definition) return '';
  const parts: string[] = [];
  for (const choice of definition.choices) {
    const value = params[choice.name];
    if (typeof value === 'string') parts.push(value);
  }
  for (const param of definition.params.slice(0, 2)) {
    const value = params[param.name];
    if (typeof value !== 'number') continue;
    const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
    parts.push(`${rounded}${param.unit ?? ''}`);
  }
  return parts.join(' · ');
}

interface Props {
  graph: InstrumentGraph;
  onChange: (graph: InstrumentGraph) => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  height?: number;
}

export default function GraphEditor({
  graph, onChange, selectedNodeId, onSelectNode, height = 420,
}: Props) {
  const theme = useTheme();
  const split = useMemo(() => splitGraph(graph, isEnvelopeNode), [graph]);

  const rfNodes = useMemo<Node[]>(() => graph.nodes.map((node) => {
    const definition = definitionFor(node.type);
    const data: SynthNodeData = {
      label: definition?.label ?? node.type,
      category: definition?.category ?? 'processor',
      scope: scopeOf(split, node.id),
      hasInput: (definition?.inputs.length ?? 0) > 0,
      hasOutput: (definition?.outputs.length ?? 0) > 0,
      modTargets: (definition?.modTargets ?? []).map((name) => ({
        name,
        label: definition?.params.find((p) => p.name === name)?.label ?? name,
      })),
      summary: summarise(node.type, node.params),
    };
    return {
      id: node.id,
      type: 'synth',
      position: node.position,
      selected: node.id === selectedNodeId,
      data: data as unknown as Record<string, unknown>,
    };
  }), [graph, split, selectedNodeId]);

  const rfEdges = useMemo<Edge[]>(() => graph.edges.map((edge) => {
    const modulation = edge.to.port !== AUDIO_IN_PORT;
    return {
      id: edge.id,
      source: edge.from.node,
      target: edge.to.node,
      sourceHandle: edge.from.port,
      targetHandle: edge.to.port,
      animated: modulation,
      style: {
        stroke: modulation ? '#c8a24a' : '#8a8a8a',
        strokeWidth: 1.6,
        strokeDasharray: modulation ? '4 3' : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
    };
  }), [graph]);

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  // Resync when the graph itself changes. Dragging does not change the graph —
  // positions are committed on drag stop — so this never fights the pointer.
  useEffect(() => { setNodes(rfNodes); }, [rfNodes, setNodes]);
  useEffect(() => { setEdges(rfEdges); }, [rfEdges, setEdges]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    for (const change of changes) {
      if (change.type === 'select' && change.selected) onSelectNode(change.id);
    }
  }, [onNodesChange, onSelectNode]);

  /** Commits a drag once, rather than on every frame of it. */
  const handleDragStop = useCallback((_: unknown, node: Node) => {
    onChange({
      ...graph,
      nodes: graph.nodes.map((n) =>
        n.id === node.id ? { ...n, position: { x: Math.round(node.position.x), y: Math.round(node.position.y) } } : n),
    });
  }, [graph, onChange]);

  const handleConnect = useCallback((connection: Connection) => {
    const { source, target, sourceHandle, targetHandle } = connection;
    if (!source || !target || source === target) return;

    const port = targetHandle ?? AUDIO_IN_PORT;
    // One edge per destination: an audio input and an AudioParam both sum their
    // inputs, but a second wire into the same port is almost always a mistake
    // rather than an intent, and it is invisible on the canvas.
    const withoutDuplicate = graph.edges.filter(
      (e) => !(e.to.node === target && e.to.port === port),
    );
    const edge: GraphEdge = {
      id: newEdgeId(),
      from: { node: source, port: sourceHandle ?? OUTPUT_PORT },
      to: { node: target, port },
    };
    onChange({ ...graph, edges: [...withoutDuplicate, edge] });
  }, [graph, onChange]);

  const handleEdgesDelete = useCallback((deleted: Edge[]) => {
    const gone = new Set(deleted.map((e) => e.id));
    onChange({ ...graph, edges: graph.edges.filter((e) => !gone.has(e.id)) });
  }, [graph, onChange]);

  const handleNodesDelete = useCallback((deleted: Node[]) => {
    // The output node is the instrument bus; without it nothing is audible.
    const gone = new Set(deleted.map((n) => n.id).filter((id) => {
      const node = graph.nodes.find((n) => n.id === id);
      return node !== undefined && node.type !== 'output';
    }));
    if (gone.size === 0) return;
    onChange({
      nodes: graph.nodes.filter((n) => !gone.has(n.id)),
      edges: graph.edges.filter((e) => !gone.has(e.from.node) && !gone.has(e.to.node)),
    });
  }, [graph, onChange]);

  return (
    <Box
      sx={{
        height,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        overflow: 'hidden',
        '& .react-flow__attribution': { display: 'none' },
        '& .react-flow__controls-button': {
          backgroundColor: 'background.paper',
          borderColor: 'divider',
          color: 'text.primary',
          '& svg': { fill: 'currentColor' },
        },
        '& .react-flow__minimap': { backgroundColor: 'background.default' },
        '& .react-flow__background': { color: 'divider' },
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleDragStop}
        onConnect={handleConnect}
        onEdgesDelete={handleEdgesDelete}
        onNodesDelete={handleNodesDelete}
        onPaneClick={() => onSelectNode(null)}
        fitView
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background gap={18} size={1} />
        <Controls showInteractive={false} />
        {/* React Flow's minimap defaults to a light palette, which glares in a
            dark theme; give it the page's own colours. */}
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={2}
          bgColor={theme.palette.background.default}
          maskColor={
            theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.6)'
          }
          nodeColor={theme.palette.text.disabled}
          nodeStrokeColor={theme.palette.divider}
          style={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 6 }}
        />
      </ReactFlow>
    </Box>
  );
}
