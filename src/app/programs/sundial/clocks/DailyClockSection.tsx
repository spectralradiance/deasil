// Solar clock section: sun position hand + slide-in panel listing sunrise, solar noon, sunset, and
// solar midnight, each expandable into its long description and next/last occurrence.

'use client';
import { useState, useMemo } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DailyClock, SOLAR_EVENT_DATA } from './DailyClock';
import PhaseInfoPanel, { PhaseRowData } from './PhaseInfoPanel';
import { calcSunTimes } from '../lib/astro';
import { formatDuration } from '../lib/phase-format';
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

const EVENT_KEYS = ['sunrise', 'solarNoon', 'sunset', 'solarMidnight'] as const;

export default function DailyClockSection({ time, sunTimes, use24h, coords }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const year  = time.getFullYear().toString();
  const month = (time.getMonth() + 1).toString().padStart(2, '0');
  const day   = time.getDate().toString().padStart(2, '0');

  const [y, mo, d] = [time.getFullYear(), time.getMonth(), time.getDate()];
  // Adjacent days' sun times, memoized by calendar day + location (not every ms tick)
  const adjacent = useMemo(() => {
    if (!coords) return null;
    const prev = calcSunTimes(new Date(y, mo, d - 1, 12), coords.lat, coords.lon);
    const next = calcSunTimes(new Date(y, mo, d + 1, 12), coords.lat, coords.lon);
    return { prev, next };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [y, mo, d, coords?.lat, coords?.lon]);

  // For each event, find the occurrence bracketing `now`: next = soonest future one, last = most recent past one.
  // Recomputed every render (cheap comparisons only — the expensive calcSunTimes calls are memoized above).
  const phases: PhaseRowData[] = EVENT_KEYS.map((key, i): PhaseRowData | null => {
    const today = sunTimes[key];
    const prevT = adjacent?.prev[key];
    const nextT = adjacent?.next[key];
    if (!today || !prevT || !nextT) return null;
    const { next, last } = today.getTime() > time.getTime()
      ? { next: today, last: prevT }
      : { next: nextT, last: today };
    return {
      name: SOLAR_EVENT_DATA[i].name,
      description: SOLAR_EVENT_DATA[i].description,
      next,
      last,
    };
  }).filter((p): p is PhaseRowData => p !== null);

  // Default/current phase = whichever event is next to occur
  let nextIdx = 0;
  let bestUntil = Infinity;
  phases.forEach((p, i) => {
    const until = p.next.getTime() - time.getTime();
    if (until < bestUntil) { bestUntil = until; nextIdx = i; }
  });

  const displayIdx = selectedIdx ?? nextIdx;

  const dayLengthMs = sunTimes.sunrise && sunTimes.sunset
    ? sunTimes.sunset.getTime() - sunTimes.sunrise.getTime()
    : null;
  const isDaytime = sunTimes.sunrise && sunTimes.sunset
    ? time.getTime() >= sunTimes.sunrise.getTime() && time.getTime() <= sunTimes.sunset.getTime()
    : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, width: { xs: '100%', md: 'fit-content' } }}>
      <Box sx={clockBoxSx()} onClick={() => setInfoOpen(true)} style={{ cursor: 'pointer' }}>
        <DailyClock
          date={time}
          sunrise={sunTimes.sunrise}
          sunset={sunTimes.sunset}
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
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>Sun</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{`${year}-${month}-${day}`}</Typography>
          {dayLengthMs !== null && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Daylight: {formatDuration(dayLengthMs)}
            </Typography>
          )}
          {isDaytime !== null && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              Now: {isDaytime ? 'Day' : 'Night'}
            </Typography>
          )}
          {!coords && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              (allow location for sunrise/sunset)
            </Typography>
          )}
          {phases.length > 0 && (
            <PhaseInfoPanel
              phases={phases}
              selectedIdx={displayIdx}
              onSelect={(i) => setSelectedIdx(prev => prev === i ? null : i)}
              activeIdx={nextIdx}
              now={time}
              use24h={use24h}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
