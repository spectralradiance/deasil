// Wheel of the Year section: sabbat position hand + slide-in panel with days since/until each sabbat.

'use client';
import { useState, useMemo } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { YearClock, SABBAT_DATA, dayOfYearToFraction } from './YearClock';
import { getNearestSabbats } from '../lib/astro';
import { clockBoxSx, infoPanelSx, infoPanelContentSx } from '../lib/sundial-layout';

interface Props {
  time: Date;
}

export default function YearClockSection({ time }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const [y, mo, d] = [time.getFullYear(), time.getMonth(), time.getDate()];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const currentIdx = useMemo(() => Math.floor(dayOfYearToFraction(time) * 8) % 8, [y, mo, d]);
  const displayIdx = selectedIdx ?? currentIdx;
  const { current, last, next } = getNearestSabbats(time);

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, width: { xs: '100%', md: 'fit-content' } }}>
      <Box sx={clockBoxSx(infoOpen)} onClick={() => setInfoOpen(true)} style={{ cursor: 'pointer' }}>
        <YearClock
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
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>Seasons</Typography>
          {current && (
            <Typography variant="body2">Today is <strong>{current}</strong>!</Typography>
          )}
          {last && (
            <Typography variant="body2">
              {last.daysAgo} day{last.daysAgo !== 1 ? 's' : ''} since <strong>{last.name}</strong>
            </Typography>
          )}
          {next && (
            <Typography variant="body2">
              {next.daysUntil} day{next.daysUntil !== 1 ? 's' : ''} until <strong>{next.name}</strong>
            </Typography>
          )}
          <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 500 }}>
            {SABBAT_DATA[displayIdx].name}
            <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
              {SABBAT_DATA[displayIdx].dateLabel}
            </Typography>
          </Typography>
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
            {SABBAT_DATA[displayIdx].description}
          </Typography>
          {selectedIdx !== null && (
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 1, cursor: 'pointer', color: 'text.secondary' }}
              onClick={() => setSelectedIdx(null)}
            >
              ← back to current sabbat
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
