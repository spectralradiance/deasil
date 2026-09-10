// One module on the graph canvas. Audio flows left to right; modulation comes
// up from underneath, which keeps the two kinds of wire visually distinct.

'use client';
import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeCategory } from '../../audio/nodes/registry';

export interface SynthNodeData extends Record<string, unknown> {
  label: string;
  category: NodeCategory;
  scope: 'voice' | 'shared';
  hasInput: boolean;
  hasOutput: boolean;
  modTargets: { name: string; label: string }[];
  summary: string;
}

const CATEGORY_COLOR: Record<NodeCategory, string> = {
  source: 'success.main',
  processor: 'primary.main',
  modulator: 'warning.main',
  output: 'text.secondary',
};

export default function SynthNode({ data, selected }: NodeProps) {
  const node = data as SynthNodeData;
  const accent = CATEGORY_COLOR[node.category];

  return (
    <Box
      sx={{
        minWidth: 132,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        borderLeft: '3px solid',
        borderLeftColor: accent,
        backgroundColor: 'background.paper',
        boxShadow: selected ? 3 : 1,
        px: 1.25,
        py: 0.9,
        position: 'relative',
      }}
    >
      {node.hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          style={{ width: 9, height: 9, background: '#888' }}
        />
      )}
      {node.hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          style={{ width: 9, height: 9, background: '#888' }}
        />
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{node.label}</Typography>
        <Tooltip
          title={
            node.scope === 'voice'
              ? 'Per voice: rebuilt for every note'
              : 'Shared: built once for the whole instrument'
          }
        >
          <Box
            sx={{
              fontSize: 9,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              px: 0.5,
              borderRadius: 0.5,
              border: '1px solid',
              borderColor: node.scope === 'voice' ? 'success.main' : 'text.disabled',
              color: node.scope === 'voice' ? 'success.main' : 'text.disabled',
            }}
          >
            {node.scope}
          </Box>
        </Tooltip>
      </Box>

      {node.summary && (
        <Typography sx={{ fontSize: 10.5, opacity: 0.6, mt: 0.25 }} noWrap>
          {node.summary}
        </Typography>
      )}

      {node.modTargets.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1.25, mt: 0.75, justifyContent: 'center' }}>
          {node.modTargets.map((target, i) => (
            <Tooltip key={target.name} title={`modulate ${target.label}`}>
              <Box sx={{ position: 'relative', fontSize: 9, opacity: 0.65 }}>
                {target.label}
                <Handle
                  type="target"
                  position={Position.Bottom}
                  id={target.name}
                  style={{
                    width: 8,
                    height: 8,
                    background: '#c8a24a',
                    left: '50%',
                    bottom: -11,
                    transform: `translateX(-50%)`,
                  }}
                  data-index={i}
                />
              </Box>
            </Tooltip>
          ))}
        </Box>
      )}
    </Box>
  );
}
