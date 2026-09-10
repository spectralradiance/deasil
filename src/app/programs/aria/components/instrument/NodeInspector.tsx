// Params for the selected node, plus the palette for adding new ones.

'use client';
import React from 'react';
import {
  Alert, Box, Button, Chip, Divider, IconButton, Menu, MenuItem,
  Stack, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Row, SelectField, SliderField } from '../ControlRow';
import {
  NODE_DEFINITIONS, definitionFor, isDelayNode, isEnvelopeNode,
} from '../../audio/nodes/registry';
import {
  findIllegalCycle, newNodeId, scopeOf, splitGraph,
  type GraphNode, type InstrumentGraph,
} from '../../audio/graph';
import { defaultParams } from '../../audio/nodes/registry';

interface Props {
  graph: InstrumentGraph;
  onChange: (graph: InstrumentGraph) => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}

export default function NodeInspector({ graph, onChange, selectedNodeId, onSelectNode }: Props) {
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const selected: GraphNode | undefined = graph.nodes.find((n) => n.id === selectedNodeId);
  const definition = selected ? definitionFor(selected.type) : undefined;
  const split = React.useMemo(() => splitGraph(graph, isEnvelopeNode), [graph]);
  const cycle = React.useMemo(() => findIllegalCycle(graph, isDelayNode), [graph]);

  const setParam = (name: string, value: number | string) => {
    if (!selected) return;
    onChange({
      ...graph,
      nodes: graph.nodes.map((n) =>
        n.id === selected.id ? { ...n, params: { ...n.params, [name]: value } } : n),
    });
  };

  const addNode = (type: string) => {
    setMenuAnchor(null);
    const id = newNodeId(type);
    // Drop it below the existing patch so it never lands on top of something.
    const lowest = graph.nodes.reduce((max, n) => Math.max(max, n.position.y), 0);
    const node: GraphNode = {
      id,
      type,
      params: defaultParams(type),
      position: { x: 120, y: lowest + 130 },
    };
    onChange({ ...graph, nodes: [...graph.nodes, node] });
    onSelectNode(id);
  };

  const removeSelected = () => {
    if (!selected || selected.type === 'output') return;
    onChange({
      nodes: graph.nodes.filter((n) => n.id !== selected.id),
      edges: graph.edges.filter((e) => e.from.node !== selected.id && e.to.node !== selected.id),
    });
    onSelectNode(null);
  };

  const modulatedParams = new Set(
    graph.edges.filter((e) => e.to.node === selected?.id).map((e) => e.to.port),
  );

  return (
    <Stack spacing={2}>
      {cycle && (
        <Alert severity="warning" variant="outlined">
          Feedback loop through {cycle.join(' → ')} with no delay in it. Web Audio
          only resolves a cycle when a delay sits inside it, so this path will be
          silent — add a Delay, or remove one of the wires.
        </Alert>
      )}
      {!split.ampNodeId && (
        <Alert severity="info" variant="outlined">
          No envelope is driving a gain, so every node is rebuilt per voice.
          Patch an <strong>Envelope</strong> into a <strong>Gain</strong>&apos;s
          level to make it the amp — everything after it then becomes shared.
        </Alert>
      )}

      <Row>
        <Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            add module
          </Button>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            {NODE_DEFINITIONS.filter((d) => d.type !== 'output').map((d) => (
              <MenuItem key={d.type} onClick={() => addNode(d.type)} sx={{ fontSize: 14 }}>
                <Box>
                  <Box sx={{ fontWeight: 600 }}>{d.label}</Box>
                  <Box sx={{ fontSize: 11, opacity: 0.6 }}>{d.description}</Box>
                </Box>
              </MenuItem>
            ))}
          </Menu>
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.6, pb: 0.75 }}>
          {graph.nodes.length} modules · {split.voice.size} per voice · {split.shared.size} shared
        </Typography>
      </Row>

      <Divider />

      {!selected || !definition ? (
        <Typography variant="body2" sx={{ opacity: 0.6 }}>
          Select a module on the canvas to edit it. Drag from a right-hand dot to
          a left-hand dot to route audio, or to a gold dot underneath a module to
          modulate one of its parameters.
        </Typography>
      ) : (
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>{definition.label}</Typography>
            <Chip
              size="small"
              variant="outlined"
              label={scopeOf(split, selected.id) === 'voice' ? 'per voice' : 'shared'}
              color={scopeOf(split, selected.id) === 'voice' ? 'success' : 'default'}
            />
            <Box sx={{ flex: 1 }} />
            {selected.type !== 'output' && (
              <Tooltip title="Remove this module">
                <IconButton size="small" color="error" onClick={removeSelected}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Typography variant="caption" sx={{ opacity: 0.65 }}>
            {definition.description}
          </Typography>

          {(definition.choices.length > 0 || definition.params.length > 0) && (
            <Row>
              {definition.choices.map((choice) => (
                <SelectField
                  key={choice.name}
                  label={choice.label}
                  value={String(selected.params[choice.name] ?? choice.default)}
                  options={choice.options}
                  onChange={(value) => setParam(choice.name, value)}
                  width={130}
                />
              ))}
              {definition.params.map((param) => {
                const modulated = modulatedParams.has(param.name);
                const zeroed = modulated && param.modulationBase === 'zero';
                return (
                  <Tooltip
                    key={param.name}
                    title={zeroed
                      ? 'Something is patched into this, so the knob is ignored — the modulation supplies the value.'
                      : modulated
                        ? 'Modulated: this is the centre the modulation moves around.'
                        : ''}
                  >
                    <Box sx={{ opacity: zeroed ? 0.45 : 1 }}>
                      <SliderField
                        label={modulated ? `${param.label} ~` : param.label}
                        value={Number(selected.params[param.name] ?? param.default)}
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        format={(v) => `${Math.abs(v) >= 100 ? Math.round(v) : v}${param.unit ?? ''}`}
                        onChange={(value) => setParam(param.name, value)}
                        width={140}
                      />
                    </Box>
                  </Tooltip>
                );
              })}
            </Row>
          )}
        </Stack>
      )}
    </Stack>
  );
}
