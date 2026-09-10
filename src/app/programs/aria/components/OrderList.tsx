// The arrangement: which pattern plays when. Patterns may repeat.

'use client';
import React from 'react';
import { Box, Button, IconButton, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { Pattern, Song } from '../lib/song';
import { MAX_PATTERNS } from '../lib/song';

interface Props {
  song: Song;
  /** Pattern currently open in the grid. */
  editingId: string;
  onEdit: (patternId: string) => void;
  /** Order slot the arrangement is playing, or -1. */
  playingIndex: number;
  onSetSlot: (index: number, patternId: string) => void;
  onAppend: (patternId: string) => void;
  onRemoveSlot: (index: number) => void;
  onMoveSlot: (index: number, delta: number) => void;
  onAddPattern: (copyFrom?: string) => void;
  onRemovePattern: (patternId: string) => void;
  loopPattern: boolean;
}

export default function OrderList({
  song, editingId, onEdit, playingIndex, onSetSlot, onAppend,
  onRemoveSlot, onMoveSlot, onAddPattern, onRemovePattern, loopPattern,
}: Props) {
  const [slotMenu, setSlotMenu] = React.useState<{ el: HTMLElement; index: number } | null>(null);
  const [addMenu, setAddMenu] = React.useState<HTMLElement | null>(null);

  const patternName = (id: string): string =>
    song.patterns.find((p) => p.id === id)?.name ?? '?';

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="caption" sx={{ opacity: 0.65, display: 'block', mb: 0.75 }}>
          patterns
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          {song.patterns.map((pattern: Pattern) => (
            <Box
              key={pattern.id}
              onClick={() => onEdit(pattern.id)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.5,
                px: 1, py: 0.4, borderRadius: 1, cursor: 'pointer',
                border: '1px solid',
                borderColor: pattern.id === editingId ? 'primary.main' : 'divider',
                backgroundColor: pattern.id === editingId ? 'action.selected' : 'transparent',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: 13,
              }}
            >
              {pattern.name}
              <Box component="span" sx={{ opacity: 0.45, fontSize: 11 }}>
                {pattern.stepCount}
              </Box>
              {song.patterns.length > 1 && (
                <Tooltip title={`Delete pattern ${pattern.name}`}>
                  <IconButton
                    size="small"
                    sx={{ p: 0.1, ml: 0.25 }}
                    onClick={(e) => { e.stopPropagation(); onRemovePattern(pattern.id); }}
                  >
                    <CloseIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ))}

          {song.patterns.length < MAX_PATTERNS && (
            <>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={(e) => setAddMenu(e.currentTarget)}>
                pattern
              </Button>
              <Menu anchorEl={addMenu} open={Boolean(addMenu)} onClose={() => setAddMenu(null)}>
                <MenuItem onClick={() => { setAddMenu(null); onAddPattern(); }} sx={{ fontSize: 14 }}>
                  <AddIcon fontSize="small" sx={{ mr: 1 }} /> empty pattern
                </MenuItem>
                <MenuItem onClick={() => { setAddMenu(null); onAddPattern(editingId); }} sx={{ fontSize: 14 }}>
                  <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} /> copy of {patternName(editingId)}
                </MenuItem>
              </Menu>
            </>
          )}
        </Stack>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ opacity: 0.65, display: 'block', mb: 0.75 }}>
          order
        </Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
          {song.order.map((patternId, index) => {
            const isPlaying = !loopPattern && index === playingIndex;
            return (
              <Box
                key={`${patternId}-${index}`}
                onClick={(e) => setSlotMenu({ el: e.currentTarget, index })}
                sx={{
                  minWidth: 34, textAlign: 'center',
                  px: 0.75, py: 0.4, borderRadius: 1, cursor: 'pointer',
                  border: '1px solid',
                  borderColor: isPlaying ? 'primary.main' : 'divider',
                  backgroundColor: isPlaying ? 'primary.main' : 'transparent',
                  color: isPlaying ? 'primary.contrastText' : 'inherit',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: 13,
                }}
              >
                {patternName(patternId)}
              </Box>
            );
          })}
          <Tooltip title={`Append ${patternName(editingId)} to the order`}>
            <IconButton size="small" onClick={() => onAppend(editingId)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        <Menu
          anchorEl={slotMenu?.el ?? null}
          open={Boolean(slotMenu)}
          onClose={() => setSlotMenu(null)}
        >
          {song.patterns.map((pattern) => (
            <MenuItem
              key={pattern.id}
              selected={slotMenu !== null && song.order[slotMenu.index] === pattern.id}
              onClick={() => {
                if (slotMenu) onSetSlot(slotMenu.index, pattern.id);
                setSlotMenu(null);
              }}
              sx={{ fontSize: 14 }}
            >
              play {pattern.name} here
            </MenuItem>
          ))}
          <MenuItem
            onClick={() => { if (slotMenu) onMoveSlot(slotMenu.index, -1); setSlotMenu(null); }}
            sx={{ fontSize: 14 }}
          >
            <ChevronLeftIcon fontSize="small" sx={{ mr: 1 }} /> move earlier
          </MenuItem>
          <MenuItem
            onClick={() => { if (slotMenu) onMoveSlot(slotMenu.index, 1); setSlotMenu(null); }}
            sx={{ fontSize: 14 }}
          >
            <ChevronRightIcon fontSize="small" sx={{ mr: 1 }} /> move later
          </MenuItem>
          <MenuItem
            disabled={song.order.length <= 1}
            onClick={() => { if (slotMenu) onRemoveSlot(slotMenu.index); setSlotMenu(null); }}
            sx={{ fontSize: 14 }}
          >
            <CloseIcon fontSize="small" sx={{ mr: 1 }} /> remove slot
          </MenuItem>
        </Menu>
      </Box>

      <Typography variant="caption" sx={{ opacity: 0.6 }}>
        Click a pattern to edit it, an order slot to change or move it. Patterns
        may repeat — the same block can appear in the order as many times as you
        like. <strong>Loop pattern</strong> in the transport keeps the pattern
        you are editing cycling instead of playing the arrangement through.
      </Typography>
    </Stack>
  );
}
