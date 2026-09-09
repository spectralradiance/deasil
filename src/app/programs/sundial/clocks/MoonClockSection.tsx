// Moon clock section: lunar phase hand + slide-in panel listing all 8 phases, each expandable into
// its long description and next/last occurrence.

'use client';
import { useState, useMemo } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { MoonClock, MOON_PHASE_DATA } from './MoonClock';
import PhaseInfoPanel, { PhaseRowData } from './PhaseInfoPanel';
import { lunarAgePercent, SYNODIC_MONTH } from '../lib/astro';
import { clockBoxSx, infoPanelSx, infoPanelContentSx } from '../lib/sundial-layout';

interface Props {
  time: Date;
  use24h: boolean;
}

export default function MoonClockSection({ time, use24h }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const moonPercent = lunarAgePercent(time);
  const moonAge     = moonPercent * SYNODIC_MONTH;
  const currentIdx  = Math.round(moonPercent * 8) % 8;
  const displayIdx  = selectedIdx ?? currentIdx;

  const phases: PhaseRowData[] = useMemo(() => {
    return MOON_PHASE_DATA.map((phase, i) => {
      const pos = i / 8;
      const daysUntil = ((pos - moonPercent + 1) % 1) * SYNODIC_MONTH;
      const daysAgo   = SYNODIC_MONTH - daysUntil;
      return {
        name: phase.name,
        description: phase.description,
        next: new Date(time.getTime() + daysUntil * 86400000),
        last: new Date(time.getTime() - daysAgo   * 86400000),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moonPercent]);

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, width: { xs: '100%', md: 'fit-content' } }}>
      <Box sx={clockBoxSx()} onClick={() => setInfoOpen(true)} style={{ cursor: 'pointer' }}>
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
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Age: {moonAge.toFixed(1)} days</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Illumination: {Math.round(moonPercent <= 0.5 ? moonPercent * 2 * 100 : (1 - moonPercent) * 2 * 100)}%
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Cycle: {(moonPercent * 100).toFixed(1)}% complete
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            Trend: {moonPercent <= 0.5 ? 'Waxing' : 'Waning'}
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
