// Zodiac clock section: Sun's ecliptic sign hand + slide-in panel listing all 12 signs, each
// expandable into its long description and next/last occurrence, plus planetary positions and aspects.

'use client';
import { useState, useMemo } from 'react';
import { Box, Divider, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { AstroClock, ZODIAC_DATA, PlanetaryPositionsTable, ElementModalitySummary, AspectsTable } from './AstroClock';
import PhaseInfoPanel, { PhaseRowData } from './PhaseInfoPanel';
import { calcPlanetLongitudes, getZodiacSignOccurrence } from '../lib/astro';
import { clockBoxSx, infoPanelSx, infoPanelContentSx } from '../lib/sundial-layout';

interface Props {
  time: Date;
  use24h: boolean;
}

export default function AstroClockSection({ time, use24h }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const [y, mo, d] = [time.getFullYear(), time.getMonth(), time.getDate()];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sunLon = useMemo(() => calcPlanetLongitudes(time).Sun, [y, mo, d]);
  const currentIdx    = Math.floor(sunLon / 30) % 12;
  const degInSign      = Math.floor(sunLon % 30);
  const minutesInSign  = Math.floor(((sunLon % 30) - degInSign) * 60);

  const displayIdx = selectedIdx ?? currentIdx;

  const phases: PhaseRowData[] = useMemo(() => {
    return ZODIAC_DATA.map((sign, i) => {
      const { next, last } = getZodiacSignOccurrence(i, time);
      return {
        name: sign.name,
        description: sign.description,
        symbol: sign.symbol,
        next,
        last,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [y, mo, d]);

  const daysIntoSign = Math.floor((time.getTime() - phases[currentIdx].last.getTime()) / 86400000);

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, width: { xs: '100%', md: 'fit-content' } }}>
      <Box sx={clockBoxSx()} onClick={() => setInfoOpen(true)} style={{ cursor: 'pointer' }}>
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
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Sun: {ZODIAC_DATA[currentIdx].symbol} {ZODIAC_DATA[currentIdx].name} {degInSign}°{minutesInSign.toString().padStart(2, '0')}′
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            {daysIntoSign} day{daysIntoSign !== 1 ? 's' : ''} into {ZODIAC_DATA[currentIdx].name}
          </Typography>
          <PhaseInfoPanel
            phases={phases}
            selectedIdx={displayIdx}
            onSelect={(i) => setSelectedIdx(prev => prev === i ? null : i)}
            activeIdx={currentIdx}
            now={time}
            use24h={use24h}
          />
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ overflowX: 'auto' }}>
            <PlanetaryPositionsTable date={time} />
            <ElementModalitySummary date={time} />
            <AspectsTable date={time} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
