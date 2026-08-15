// Zodiac clock section: Sun's ecliptic sign hand + slide-in panel with planetary positions and aspects.

'use client';
import { useState, useMemo } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { AstroClock, ZODIAC_DATA, PlanetaryPositionsTable, ElementModalitySummary, AspectsTable } from './AstroClock';
import { clockBoxSx, infoPanelSx, infoPanelContentSx } from '../lib/sundial-layout';

interface Props {
  time: Date;
}

export default function AstroClockSection({ time }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const [y, mo, d] = [time.getFullYear(), time.getMonth(), time.getDate()];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const currentIdx = useMemo(() => {
    const jd  = (time.getTime() / 86400000 + 2440587.5) - 2451545.0;
    const L   = ((280.46 + 0.9856474 * jd) % 360 + 360) % 360;
    const M   = ((357.53 + 0.9856003 * jd) % 360 + 360) % 360;
    const Mr  = (M * Math.PI) / 180;
    const lon = ((L + 1.915 * Math.sin(Mr) + 0.020 * Math.sin(2 * Mr)) % 360 + 360) % 360;
    return Math.floor(lon / 30) % 12;
  }, [y, mo, d]);

  const displayIdx = selectedIdx ?? currentIdx;

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, width: { xs: '100%', md: 'fit-content' } }}>
      <Box sx={clockBoxSx(infoOpen)} onClick={() => setInfoOpen(true)} style={{ cursor: 'pointer' }}>
        <AstroClock
          date={time}
          activeIconIndex={displayIdx}
          onSignClick={(i) => { setSelectedIdx(prev => prev === i ? null : i); setInfoOpen(true); }}
        />
      </Box>
      <Box sx={infoPanelSx(infoOpen)}>
        <Box sx={infoPanelContentSx(infoOpen)}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
            <IconButton size="small" onClick={() => { setInfoOpen(false); setSelectedIdx(null); }} title="Close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>Stars</Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            {ZODIAC_DATA[displayIdx].symbol} {ZODIAC_DATA[displayIdx].name}
          </Typography>
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 1 }}>
            {ZODIAC_DATA[displayIdx].description}
          </Typography>
          <PlanetaryPositionsTable date={time} />
          <ElementModalitySummary date={time} />
          <AspectsTable date={time} />
          {selectedIdx !== null && (
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 1.5, cursor: 'pointer', color: 'text.secondary' }}
              onClick={() => setSelectedIdx(null)}
            >
              ← back to Sun's sign
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
