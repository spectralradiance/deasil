// Moon clock section: lunar phase hand + slide-in panel showing age, illumination, and phase description.

'use client';
import { useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { MoonClock, MOON_PHASE_DATA } from './MoonClock';
import { lunarAgePercent, SYNODIC_MONTH } from '../lib/astro';
import { clockBoxSx, infoPanelSx, infoPanelContentSx } from '../lib/sundial-layout';

interface Props {
  time: Date;
}

export default function MoonClockSection({ time }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const moonPercent   = lunarAgePercent(time);
  const moonAge       = moonPercent * SYNODIC_MONTH;
  const currentIdx    = Math.round(moonPercent * 8) % 8;
  const displayIdx    = selectedIdx ?? currentIdx;

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, width: { xs: '100%', md: 'fit-content' } }}>
      <Box sx={clockBoxSx(infoOpen)} onClick={() => setInfoOpen(true)} style={{ cursor: 'pointer' }}>
        <MoonClock
          percent={moonPercent}
          date={time}
          activeIconIndex={displayIdx}
          onIconClick={(i) => { setSelectedIdx(prev => prev === i ? null : i); setInfoOpen(true); }}
        />
      </Box>
      <Box sx={infoPanelSx(infoOpen)}>
        <Box sx={infoPanelContentSx(infoOpen)}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
            <IconButton size="small" onClick={() => { setInfoOpen(false); setSelectedIdx(null); }} title="Close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>Moon</Typography>
          <Typography variant="body2">Age: {moonAge.toFixed(1)} days</Typography>
          <Typography variant="body2">
            Illumination: {Math.round(moonPercent <= 0.5 ? moonPercent * 2 * 100 : (1 - moonPercent) * 2 * 100)}%
          </Typography>
          <Typography variant="body2">Cycle: {(moonPercent * 100).toFixed(1)}% complete</Typography>
          <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 500 }}>
            {MOON_PHASE_DATA[displayIdx].name}
          </Typography>
          {(() => {
            const pos       = displayIdx / 8;
            const daysUntil = ((pos - moonPercent + 1) % 1) * SYNODIC_MONTH;
            const daysAgo   = SYNODIC_MONTH - daysUntil;
            const fmt       = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
            const past      = fmt(new Date(time.getTime() - daysAgo   * 86400000));
            const next      = fmt(new Date(time.getTime() + daysUntil * 86400000));
            return (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Past: {past} · Next: {next}
              </Typography>
            );
          })()}
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
            {MOON_PHASE_DATA[displayIdx].description}
          </Typography>
          {selectedIdx !== null && (
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 1, cursor: 'pointer', color: 'text.secondary' }}
              onClick={() => setSelectedIdx(null)}
            >
              ← back to current phase
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
