// Shared accordion "phase list" layout used inside every clock section's slide-in info panel.
// Renders every phase of the clock as a clickable row; clicking a row expands it in place to show
// its long description plus the exact date/time of its next and last occurrence and hours/days since/until.
// Only one row is expanded at a time.

'use client';
import { Box, Collapse, Typography } from '@mui/material';
import { formatExactDateTime, formatDuration } from '../lib/phase-format';

export interface PhaseRowData {
  name: string;
  description: string;
  /** Next occurrence of this phase, at or after `now` */
  next: Date;
  /** Most recent occurrence of this phase, at or before `now` */
  last: Date;
  /** Optional color for the row's name text (and symbol) */
  color?: string;
  /** Optional leading symbol/icon glyph */
  symbol?: string;
}

interface Props {
  phases: PhaseRowData[];
  selectedIdx: number;
  onSelect: (index: number) => void;
  /** Index of the "current" phase, given a bolder weight in the list */
  activeIdx?: number;
  now: Date;
  use24h: boolean;
}

export default function PhaseInfoPanel({ phases, selectedIdx, onSelect, activeIdx, now, use24h }: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      {phases.map((p, i) => {
        const expanded = i === selectedIdx;
        const untilMs = p.next.getTime() - now.getTime();
        const sinceMs = now.getTime() - p.last.getTime();
        return (
          <Box key={p.name}>
            <Box
              onClick={() => onSelect(i)}
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1,
                px: 0.75,
                py: 0.35,
                borderRadius: 1,
                cursor: 'pointer',
                bgcolor: expanded ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Typography
                variant="body2"
                sx={{ color: p.color, fontWeight: i === activeIdx ? 700 : 400 }}
              >
                {p.symbol ? `${p.symbol} ` : ''}{p.name}
              </Typography>
            </Box>
            <Collapse in={expanded} timeout={250} unmountOnExit>
              <Box sx={{ px: 0.75, pt: 0.25, pb: 1 }}>
                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 1 }}>
                  {p.description}
                </Typography>
                <Typography variant="body2">
                  Next: {formatExactDateTime(p.next, use24h)}
                  <Box component="span" sx={{ color: 'text.secondary' }}> (in {formatDuration(untilMs)})</Box>
                </Typography>
                <Typography variant="body2">
                  Last: {formatExactDateTime(p.last, use24h)}
                  <Box component="span" sx={{ color: 'text.secondary' }}> ({formatDuration(sinceMs)} ago)</Box>
                </Typography>
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </Box>
  );
}
