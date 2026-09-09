// Wheel of the Year section: sabbat position hand + slide-in panel listing all 8 sabbats, each
// expandable into its long description and next/last occurrence.

'use client';
import { useState, useMemo } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { YearClock, SABBAT_DATA, dayOfYearToFraction } from './YearClock';
import PhaseInfoPanel, { PhaseRowData } from './PhaseInfoPanel';
import { getSabbatOccurrence, getNearestSabbats } from '../lib/astro';
import { clockBoxSx, infoPanelSx, infoPanelContentSx } from '../lib/sundial-layout';

interface Props {
  time: Date;
  use24h: boolean;
}

const SEASON_BY_SABBAT_IDX = ['Autumn', 'Winter', 'Winter', 'Spring', 'Spring', 'Summer', 'Summer', 'Autumn'];

export default function YearClockSection({ time, use24h }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const [y, mo, d] = [time.getFullYear(), time.getMonth(), time.getDate()];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const currentIdx = useMemo(() => Math.floor(dayOfYearToFraction(time) * 8) % 8, [y, mo, d]);
  const { current } = getNearestSabbats(time);

  const phases: PhaseRowData[] = useMemo(() => {
    return SABBAT_DATA.map(sab => {
      const { next, last } = getSabbatOccurrence(sab.name, time);
      return {
        name: sab.name,
        description: sab.description,
        next,
        last,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [y, mo, d]);

  const displayIdx = selectedIdx ?? currentIdx;

  const season = SEASON_BY_SABBAT_IDX[currentIdx];
  const daysIntoSeason = Math.floor((time.getTime() - phases[currentIdx].last.getTime()) / 86400000);
  const yearPercent = dayOfYearToFraction(time) * 100;

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, width: { xs: '100%', md: 'fit-content' } }}>
      <Box sx={clockBoxSx()} onClick={() => setInfoOpen(true)} style={{ cursor: 'pointer' }}>
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
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Today is <strong>{current}</strong>!
            </Typography>
          )}
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Season: {season}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {daysIntoSeason} day{daysIntoSeason !== 1 ? 's' : ''} into {season}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            {yearPercent.toFixed(1)}% through the wheel
          </Typography>
          <PhaseInfoPanel
            phases={phases}
            selectedIdx={displayIdx}
            onSelect={(i) => setSelectedIdx(prev => prev === i ? null : i)}
            activeIdx={currentIdx}
            now={time}
            use24h={use24h}
          />
        </Box>
      </Box>
    </Box>
  );
}
