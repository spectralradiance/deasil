// Shared accordion "phase list" layout used inside every clock section's slide-in info panel.
// Renders every phase of the clock as a clickable row; clicking a row expands it in place to show
// its long description plus the exact date/time of its next and last occurrence and hours/days since/until.
// Only one row is expanded at a time.

'use client';
import { Box, Collapse, Typography } from '@mui/material';
import { formatExactDateTime, formatDuration } from '../lib/phase-format';

/** A short classification chip shown under the title while a row is expanded */
export interface PhaseMeta {
  label: string;
  /** Optional color for the label; falls back to muted text */
  color?: string;
}

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
  /** Optional classifications (e.g. element + modality) shown under the title when expanded */
  meta?: PhaseMeta[];
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
          // The open row lifts out of the list: accent border, tinted ground and
          // its own breathing room above and below.
          <Box
            key={p.name}
            sx={{
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: expanded ? 'primary.main' : 'transparent',
              bgcolor: expanded ? 'action.selected' : 'transparent',
              my: expanded ? 0.75 : 0,
              transition: 'border-color 0.25s, background-color 0.25s, margin 0.25s',
            }}
          >
            <Box
              onClick={() => onSelect(i)}
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1,
                px: 1,
                py: expanded ? 0.75 : 0.35,
                borderRadius: 1.5,
                cursor: 'pointer',
                transition: 'padding 0.25s',
                '&:hover': { bgcolor: expanded ? 'transparent' : 'action.hover' },
              }}
            >
              <Typography
                variant={expanded ? 'subtitle2' : 'body2'}
                sx={{
                  color: expanded ? 'primary.main' : p.color,
                  fontWeight: expanded || i === activeIdx ? 700 : 400,
                  letterSpacing: expanded ? '0.02em' : undefined,
                }}
              >
                {p.symbol ? `${p.symbol} ` : ''}{p.name}
              </Typography>
            </Box>
            <Collapse in={expanded} timeout={250} unmountOnExit>
              <Box sx={{ px: 1, pt: 0, pb: 1.25 }}>
                {p.meta && p.meta.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                    {p.meta.map((m, k) => (
                      <Box key={m.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        {k > 0 && <Box component="span" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>·</Box>}
                        <Box
                          component="span"
                          sx={{
                            color: m.color ?? 'text.secondary',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {m.label}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 1.25 }}>
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
