// Solar clock section: sun position hand + slide-in panel showing sunrise, solar noon, and sunset times.

'use client';
import { useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DailyClock, SOLAR_EVENT_DATA } from './DailyClock';
import { formatSunTime } from '../lib/astro';
import { clockBoxSx, infoPanelSx, infoPanelContentSx } from '../lib/sundial-layout';

interface SunTimes {
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date | null;
  solarMidnight: Date | null;
}

interface Props {
  time: Date;
  sunTimes: SunTimes;
  use24h: boolean;
  coords: { lat: number; lon: number } | null;
}

export default function DailyClockSection({ time, sunTimes, use24h, coords }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const year  = time.getFullYear().toString();
  const month = (time.getMonth() + 1).toString().padStart(2, '0');
  const day   = time.getDate().toString().padStart(2, '0');

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, width: { xs: '100%', md: 'fit-content' } }}>
      <Box sx={clockBoxSx(infoOpen)} onClick={() => setInfoOpen(true)} style={{ cursor: 'pointer' }}>
        <DailyClock
          date={time}
          sunrise={sunTimes.sunrise}
          sunset={sunTimes.sunset}
          activeIconIndex={selectedIdx ?? undefined}
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
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>Sun</Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>{`${year}-${month}-${day}`}</Typography>
          {sunTimes.solarNoon && (
            <Typography variant="body2" sx={{ color: '#FFFFFF' }}>
              ☀ {formatSunTime(sunTimes.solarNoon, use24h)}
            </Typography>
          )}
          {sunTimes.sunrise && (
            <Typography variant="body2" sx={{ color: '#FFD700' }}>
              ↑ {formatSunTime(sunTimes.sunrise, use24h)}
            </Typography>
          )}
          {sunTimes.sunset && (
            <Typography variant="body2" sx={{ color: '#FF8C00' }}>
              ↓ {formatSunTime(sunTimes.sunset, use24h)}
            </Typography>
          )}
          {sunTimes.solarMidnight && (
            <Typography variant="body2" sx={{ color: '#8888FF' }}>
              ☽ {formatSunTime(sunTimes.solarMidnight, use24h)}
            </Typography>
          )}
          {!coords && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              (allow location for sunrise/sunset)
            </Typography>
          )}
          {selectedIdx !== null && (
            <>
              <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 500 }}>
                {SOLAR_EVENT_DATA[selectedIdx].name}
              </Typography>
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                {SOLAR_EVENT_DATA[selectedIdx].description}
              </Typography>
              <Typography
                variant="caption"
                sx={{ display: 'block', mt: 1, cursor: 'pointer', color: 'text.secondary' }}
                onClick={() => setSelectedIdx(null)}
              >
                ← back
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
