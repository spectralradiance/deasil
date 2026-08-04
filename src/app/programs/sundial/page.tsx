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
import { Box, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { DailyClock } from './DailyClock';
import { MoonClock, MOON_PHASE_DATA }  from './MoonClock';
import { YearClock, SABBAT_DATA, dayOfYearToFraction } from './YearClock';
import { AstroClock, ZODIAC_DATA } from './AstroClock';
import {
  calcSunTimes,
  formatSunTime,
  lunarAgePercent,
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

// ---- Responsive clock container ----------------------------
// SVG fills container width and scales proportionally (height: auto).
// On mobile the container spans full viewport width; on desktop it is
// capped at 420 px (larger than the clock's natural ~370 px render size).
const CLOCK_WRAPPER_SX = {
  width:      { xs: '100%', md: '420px' },
  flexShrink: 0,
  '& svg':    { width: '100%', height: 'auto', display: 'block' },
} as const;

// ---- Page ---------------------------------------------------

export default function SundialPage() {
  const [time, setTime]     = useState(new Date());
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const [paused, setPaused]           = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [pickedDateTime, setPickedDateTime] = useState('');
  const [latInput, setLatInput]       = useState('');
  const [lonInput, setLonInput]       = useState('');

  // Tracks which icon the user last clicked; null = follow the live current position
  const [moonSelectedIdx, setMoonSelectedIdx] = useState<number | null>(null);
  const [yearSelectedIdx, setYearSelectedIdx] = useState<number | null>(null);
  const [astroSelectedIdx, setAstroSelectedIdx] = useState<number | null>(null);

  // Tick every millisecond for smooth hand movement; stops when paused
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setTime(new Date()), 1);
    return () => clearInterval(id);
  }, [paused]);

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

  // Current phase/sabbat indices (computed from live time)
  const moonCurrentIdx = Math.round(moonPercent * 8) % 8;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const yearCurrentIdx = useMemo(() => Math.floor(dayOfYearToFraction(time) * 8) % 8, [year, month, day]);
  // Active zodiac sign: which 30° sector the Sun occupies (imported lazily to avoid circular deps)
  const astroCurrentIdx = useMemo(() => {
    const d = (time.getTime() / 86400000 + 2440587.5) - 2451545.0;
    const L = ((280.46 + 0.9856474 * d) % 360 + 360) % 360;
    const M = ((357.53 + 0.9856003 * d) % 360 + 360) % 360;
    const Mr = (M * Math.PI) / 180;
    const sunLon = ((L + 1.915 * Math.sin(Mr) + 0.020 * Math.sin(2 * Mr)) % 360 + 360) % 360;
    return Math.floor(sunLon / 30) % 12;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, day]);

  // What to display in the info boxes — selected by click, or tracks the live position
  const moonDisplayIdx  = moonSelectedIdx  ?? moonCurrentIdx;
  const yearDisplayIdx  = yearSelectedIdx  ?? yearCurrentIdx;
  const astroDisplayIdx = astroSelectedIdx ?? astroCurrentIdx;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4, gap: 6 }}>
      <h1>Sundial</h1>

      {/* ── Live timestamp + controls ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
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
        <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
          <IconButton
            size="small"
            onClick={() => setPaused(p => !p)}
            title={paused ? 'Resume' : 'Pause'}
          >
            {paused ? <PlayArrowIcon /> : <PauseIcon />}
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              const pad = (n: number, d = 2) => n.toString().padStart(d, '0');
              const t = time;
              setPickedDateTime(
                `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`
              );
              setCalendarOpen(true);
            }}
            title="Pick date & time"
          >
            <CalendarMonthIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setLatInput(coords ? coords.lat.toString() : '');
              setLonInput(coords ? coords.lon.toString() : '');
              setLocationOpen(true);
            }}
            title="Set location"
          >
            <MyLocationIcon />
          </IconButton>
        </Box>
      </Box>

      {/* ── Date/time picker dialog ── */}
      <Dialog open={calendarOpen} onClose={() => setCalendarOpen(false)}>
        <DialogTitle>Pick date &amp; time</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            type="datetime-local"
            value={pickedDateTime}
            onChange={e => setPickedDateTime(e.target.value)}
            inputProps={{ step: 1 }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCalendarOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (pickedDateTime) {
                setTime(new Date(pickedDateTime));
                setPaused(true);
              }
              setCalendarOpen(false);
            }}
          >
            Set
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Location picker dialog ── */}
      <Dialog open={locationOpen} onClose={() => setLocationOpen(false)}>
        <DialogTitle>Set location</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, minWidth: 280 }}>
          <TextField
            label="Latitude"
            type="number"
            value={latInput}
            onChange={e => setLatInput(e.target.value)}
            inputProps={{ min: -90, max: 90, step: 0.0001 }}
            fullWidth
          />
          <TextField
            label="Longitude"
            type="number"
            value={lonInput}
            onChange={e => setLonInput(e.target.value)}
            inputProps={{ min: -180, max: 180, step: 0.0001 }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocationOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              const lat = parseFloat(latInput);
              const lon = parseFloat(lonInput);
              if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                setCoords({ lat, lon });
              }
              setLocationOpen(false);
            }}
          >
            Set
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Daily (solar) clock ── */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'flex-start', justifyContent: 'center', gap: 4, width: '100%' }}>
        <Box sx={CLOCK_WRAPPER_SX}>
          <DailyClock date={time} sunrise={sunTimes.sunrise} sunset={sunTimes.sunset} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>Sun</Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>{`${year}-${month}-${day}`}</Typography>
          {sunTimes.sunrise && (
            <Typography variant="body2" sx={{ color: '#FFD700' }}>
              ↑ {formatSunTime(sunTimes.sunrise)}
            </Typography>
          )}
          {sunTimes.sunset && (
            <Typography variant="body2" sx={{ color: '#FF8C00' }}>
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
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'flex-start', justifyContent: 'center', gap: 4, width: '100%' }}>
        <Box sx={CLOCK_WRAPPER_SX}>
          <MoonClock
            percent={moonPercent}
            date={time}
            activeIconIndex={moonDisplayIdx}
            onIconClick={(i) => setMoonSelectedIdx(prev => prev === i ? null : i)}
          />
        </Box>
        <Box sx={{ maxWidth: 220 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>Moon</Typography>
          <Typography variant="body2">Age: {moonAge.toFixed(1)} days</Typography>
          <Typography variant="body2">
            Illumination: {Math.round(moonPercent <= 0.5 ? moonPercent * 2 * 100 : (1 - moonPercent) * 2 * 100)}%
          </Typography>
          <Typography variant="body2">Cycle: {(moonPercent * 100).toFixed(1)}% complete</Typography>
          <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 500 }}>
            {MOON_PHASE_DATA[moonDisplayIdx].name}
          </Typography>
          {(() => {
            const pos       = moonDisplayIdx / 8;
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
            {MOON_PHASE_DATA[moonDisplayIdx].description}
          </Typography>
          {moonSelectedIdx !== null && (
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 1, cursor: 'pointer', color: 'text.secondary' }}
              onClick={() => setMoonSelectedIdx(null)}
            >
              ← back to current phase
            </Typography>
          )}
        </Box>
      </Box>

      {/* ── Wheel of the Year clock ── */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'flex-start', justifyContent: 'center', gap: 4, width: '100%' }}>
        <Box sx={CLOCK_WRAPPER_SX}>
          <YearClock
            date={time}
            activeIconIndex={yearDisplayIdx}
            onIconClick={(i) => setYearSelectedIdx(prev => prev === i ? null : i)}
          />
        </Box>
        <Box sx={{ maxWidth: 220 }}>
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
            {SABBAT_DATA[yearDisplayIdx].name}
            <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
              {SABBAT_DATA[yearDisplayIdx].dateLabel}
            </Typography>
          </Typography>
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
            {SABBAT_DATA[yearDisplayIdx].description}
          </Typography>
          {yearSelectedIdx !== null && (
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 1, cursor: 'pointer', color: 'text.secondary' }}
              onClick={() => setYearSelectedIdx(null)}
            >
              ← back to current sabbat
            </Typography>
          )}
        </Box>
      </Box>

      {/* ── Astrological / zodiac clock ── */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'flex-start', justifyContent: 'center', gap: 4, width: '100%' }}>
        <Box sx={CLOCK_WRAPPER_SX}>
          <AstroClock
            date={time}
            activeIconIndex={astroDisplayIdx}
            onSignClick={(i) => setAstroSelectedIdx(prev => prev === i ? null : i)}
          />
        </Box>
        <Box sx={{ maxWidth: 220 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>Stars</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
            {`\u263D\uFE0E`} Moon Â· {`\u263F\uFE0E`} Mercury Â· {`\u2640\uFE0E`} Venus Â· {`\u2642\uFE0E`} Mars
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            {`\u2643\uFE0E`} Jupiter Â· {`\u2644\uFE0E`} Saturn Â· {`\u2645\uFE0E`} Uranus Â· {`\u2646\uFE0E`} Neptune
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            {ZODIAC_DATA[astroDisplayIdx].symbol} {ZODIAC_DATA[astroDisplayIdx].name}
          </Typography>
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
            {ZODIAC_DATA[astroDisplayIdx].description}
          </Typography>
          {astroSelectedIdx !== null && (
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 1, cursor: 'pointer', color: 'text.secondary' }}
              onClick={() => setAstroSelectedIdx(null)}
            >
              â† back to Sun's sign
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
