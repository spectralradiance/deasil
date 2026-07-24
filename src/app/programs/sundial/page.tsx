// ============================================================
// page.tsx — Sundial page layout
//
// Composes the three radial clocks (DailyClock, MoonClock,
// YearClock) and the live timestamp display. All astronomy
// calculations live in astro.ts; all SVG rendering lives in
// the individual clock components and RadialClock.tsx.
// ============================================================
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { DailyClock } from './DailyClock';
import { MoonClock }  from './MoonClock';
import { YearClock }  from './YearClock';
import {
  calcSunTimes,
  formatSunTime,
  lunarAgePercent,
  moonPhaseName,
  getNearestSabbats,
  SYNODIC_MONTH,
} from './astro';

// ---- Timestamp helper ---------------------------------------

function formatTime(date: Date) {
  return {
    year:         date.getFullYear().toString(),
    month:        (date.getMonth() + 1).toString().padStart(2, '0'),
    day:          date.getDate().toString().padStart(2, '0'),
    hours:        date.getHours().toString().padStart(2, '0'),
    minutes:      date.getMinutes().toString().padStart(2, '0'),
    seconds:      date.getSeconds().toString().padStart(2, '0'),
    milliseconds: date.getMilliseconds().toString().padStart(3, '0'),
  };
}

// ---- Page ---------------------------------------------------

export default function SundialPage() {
  const [time, setTime]     = useState(new Date());
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Tick every millisecond for smooth hand movement
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1);
    return () => clearInterval(id);
  }, []);

  // Request geolocation once for sunrise/sunset calculation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {},
      );
    }
  }, []);

  const { year, month, day, hours, minutes, seconds, milliseconds } = formatTime(time);

  // Recompute sun times only when the date or location changes (not every ms)
  const sunTimes = useMemo(
    () => coords
      ? calcSunTimes(time, coords.lat, coords.lon)
      : { sunrise: null, sunset: null },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coords, year, month, day],
  );

  const moonPercent = lunarAgePercent(time);
  const moonAge     = moonPercent * SYNODIC_MONTH;
  const { current, last, next } = getNearestSabbats(time);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4, gap: 6 }}>
      <h1>Sundial</h1>

      {/* ── Live timestamp ── */}
      <Typography variant="h3" component="div" sx={{ display: 'flex', alignItems: 'baseline', gap: '0.15em' }}>
        <span style={{ display: 'inline-block', width: '4ch', textAlign: 'center' }}>{year}</span>
        <span>:</span>
        <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{month}</span>
        <span>:</span>
        <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{day}</span>
        <span>  </span>
        <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{hours}</span>
        <span>:</span>
        <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{minutes}</span>
        <span>:</span>
        <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{seconds}</span>
        <span>:</span>
        <span style={{ display: 'inline-block', width: '3ch', textAlign: 'center' }}>{milliseconds}</span>
      </Typography>

      {/* ── Daily (solar) clock ── */}
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <DailyClock date={time} sunrise={sunTimes.sunrise} sunset={sunTimes.sunset} />
        <Box>
          <Typography variant="h5" sx={{ mt: 1 }}>{`${year}-${month}-${day}`}</Typography>
          {sunTimes.sunrise && (
            <Typography variant="body1" sx={{ color: '#FFD700' }}>
              ↑ {formatSunTime(sunTimes.sunrise)}
            </Typography>
          )}
          {sunTimes.sunset && (
            <Typography variant="body1" sx={{ color: '#FF8C00' }}>
              ↓ {formatSunTime(sunTimes.sunset)}
            </Typography>
          )}
          {!coords && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              (allow location for sunrise/sunset)
            </Typography>
          )}
        </Box>
      </Box>

      {/* ── Moon clock ── */}
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <MoonClock percent={moonPercent} />
        <Box>
          <Typography variant="h5">{moonPhaseName(moonPercent)}</Typography>
          <Typography variant="body1">
            Illumination: {Math.round(moonPercent <= 0.5 ? moonPercent * 2 * 100 : (1 - moonPercent) * 2 * 100)}%
          </Typography>
          <Typography variant="body1">Age: {moonAge.toFixed(1)} days</Typography>
          <Typography variant="body1">Cycle: {(moonPercent * 100).toFixed(1)}% complete</Typography>
        </Box>
      </Box>

      {/* ── Wheel of the Year clock ── */}
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <YearClock date={time} />
        <Box>
          <Typography variant="h5">Wheel of the Year</Typography>
          {current && (
            <Typography variant="body1">Today is <strong>{current}</strong>!</Typography>
          )}
          {last && (
            <Typography variant="body1">
              {last.daysAgo} day{last.daysAgo !== 1 ? 's' : ''} since <strong>{last.name}</strong>
            </Typography>
          )}
          {next && (
            <Typography variant="body1">
              {next.daysUntil} day{next.daysUntil !== 1 ? 's' : ''} until <strong>{next.name}</strong>
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
