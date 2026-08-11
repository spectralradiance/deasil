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
import dynamic from 'next/dynamic';
import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticDateTimePicker } from '@mui/x-date-pickers/StaticDateTimePicker';
import { Box, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete } from '@mui/material';

// SSR-safe: mapbox-gl uses browser globals
const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { ssr: false });
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import CloseIcon from '@mui/icons-material/Close';
import { DailyClock, SOLAR_EVENT_DATA } from './DailyClock';
import { MoonClock, MOON_PHASE_DATA }  from './MoonClock';
import { YearClock, SABBAT_DATA, dayOfYearToFraction } from './YearClock';
import { AstroClock, ZODIAC_DATA, PlanetaryPositionsTable, ElementModalitySummary, AspectsTable } from './AstroClock';
import tzlookup from 'tz-lookup';
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

// Clock box: 840px when info is hidden (2×), 420px when info is open
const clockBoxSx = (open: boolean) => ({
  position: 'relative' as const,
  flexShrink: 0,
  width: { xs: '100%', md: open ? '420px' : '630px' },
  transition: 'width 0.45s cubic-bezier(0.4,0,0.2,1)',
  '& > svg': { width: '100%', height: 'auto', display: 'block' },
});

// Info panel container: width handles layout, content translates for slide-from-behind visual
const infoPanelSx = (open: boolean) => ({
  flexShrink: 0,
  overflow: 'hidden',
  width:     { xs: '100%', md: open ? '420px' : '0px' },
  maxHeight: { xs: open ? '700px' : '0px', md: 'none' },
  transition: 'width 0.45s cubic-bezier(0.4,0,0.2,1), max-height 0.45s cubic-bezier(0.4,0,0.2,1)',
});

// Inner content: translates from behind the clock (left) into view
const infoPanelContentSx = (open: boolean) => ({
  p: 2,
  minWidth: { md: '380px' },
  transform: open ? 'translateX(0)' : 'translateX(-32px)',
  opacity: open ? 1 : 0,
  transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.3s cubic-bezier(0.4,0,0.2,1)',
});

function getUtcOffset(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    return (parts.find(p => p.type === 'timeZoneName')?.value ?? '').replace('GMT', 'UTC');
  } catch { return ''; }
}

// Uses January to get the standard (non-DST) offset, matching the zone boundary data
function getStandardUtcOffset(tz: string): string {
  try {
    const jan = new Date(new Date().getFullYear(), 0, 15);
    const parts = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(jan);
    return (parts.find(p => p.type === 'timeZoneName')?.value ?? '').replace('GMT', 'UTC');
  } catch { return ''; }
}

// geo-tz runs server-side via /api/timezone; tz-lookup handles most locations instantly
async function lookupTimezone(lat: number, lon: number): Promise<string> {
  try { const tz = tzlookup(lat, lon); if (tz) return tz; } catch {}
  try {
    const res = await fetch(`/api/timezone?lat=${lat}&lon=${lon}`);
    if (res.ok) { const d = await res.json(); if (d.timezone) return d.timezone; }
  } catch {}
  return '';
}

// ---- Page ---------------------------------------------------

export default function SundialPage() {
  const [time, setTime]     = useState(new Date());
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const [paused, setPaused]             = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [pickedDayjs, setPickedDayjs]   = useState<Dayjs | null>(null);
  const [latInput, setLatInput]         = useState('');
  const [lonInput, setLonInput]         = useState('');
  const [timezone, setTimezone]         = useState('');
  const [modalTimezone, setModalTimezone] = useState('');
  const [use24h, setUse24h]             = useState(false);
  const [useDMY, setUseDMY]             = useState(false);

  // Tracks which icon the user last clicked; null = follow the live current position
  const [dailySelectedIdx, setDailySelectedIdx] = useState<number | null>(null);
  const [moonSelectedIdx, setMoonSelectedIdx]   = useState<number | null>(null);
  const [yearSelectedIdx, setYearSelectedIdx]   = useState<number | null>(null);
  const [astroSelectedIdx, setAstroSelectedIdx] = useState<number | null>(null);

  // Info panel open state per clock
  const [dailyInfoOpen, setDailyInfoOpen] = useState(false);
  const [moonInfoOpen, setMoonInfoOpen]   = useState(false);
  const [yearInfoOpen, setYearInfoOpen]   = useState(false);
  const [astroInfoOpen, setAstroInfoOpen] = useState(false);
  const modalTzReqRef = React.useRef(0);

  // Load persisted coords immediately; geolocation will overwrite with live position
  useEffect(() => {
    const stored = localStorage.getItem('sundial-coords');
    if (stored) {
      try {
        const { lat, lon, tz } = JSON.parse(stored);
        setCoords({ lat, lon });
        if (tz) setTimezone(tz);
      } catch {}
    }
    if (localStorage.getItem('sundial-24h') === 'true') setUse24h(true);
    if (localStorage.getItem('sundial-dmy') === 'true') setUseDMY(true);
  }, []);

  useEffect(() => {
    if (coords) {
      (async () => {
        const tz = timezone || await lookupTimezone(coords.lat, coords.lon);
        localStorage.setItem('sundial-coords', JSON.stringify({ ...coords, tz }));
      })();
    }
  }, [coords, timezone]);

  // Re-lookup timezone when coordinates are typed directly into the inputs
  useEffect(() => {
    if (!locationOpen) return;
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    if (isNaN(lat) || isNaN(lon)) return;
    const t = setTimeout(() => {
      const reqId = ++modalTzReqRef.current; // increment inside timeout so map-click direct calls aren't invalidated
      lookupTimezone(lat, lon).then(tz => { if (tz && modalTzReqRef.current === reqId) setModalTimezone(tz); });
    }, 600);
    return () => clearTimeout(t);
  }, [latInput, lonInput, locationOpen]);

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
        pos => {
          const { latitude: lat, longitude: lon } = pos.coords;
          setCoords({ lat, lon });
          lookupTimezone(lat, lon).then(tz => { if (tz) setTimezone(tz); });
        },
        () => {},
      );
    }
  }, []);

  const { year, month, day, hours, minutes, seconds, milliseconds } = formatTime(time);
  const displayHours = use24h ? hours : ((time.getHours() % 12) || 12).toString().padStart(2, '0');
  const ampm = use24h ? null : (time.getHours() >= 12 ? 'PM' : 'AM');

  // Recompute sun times only when the date or location changes (not every ms)
  const sunTimes = useMemo(
    () => coords
      ? calcSunTimes(time, coords.lat, coords.lon)
      : { sunrise: null, sunset: null, solarNoon: null, solarMidnight: null },
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

  // Pre-compute timezone option list once; labels use standard offset to match zone boundary highlights
  const allTimezones = useMemo(() => {
    try {
      return (Intl as any).supportedValuesOf('timeZone').map((tz: string) => ({ tz, label: `${getStandardUtcOffset(tz)}  ${tz}` }));
    } catch { return []; }
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4, gap: 6 }}>
      <h1>Sundial</h1>

      {/* ── Live timestamp + controls ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Typography variant="h3" component="div" sx={{ display: 'flex', alignItems: 'baseline', gap: '0.15em' }}>
          <span style={{ display: 'inline-block', width: '4ch', textAlign: 'center' }}>{year}</span>
          <span>:</span>
          <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{useDMY ? day : month}</span>
          <span>:</span>
          <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{useDMY ? month : day}</span>
          <span>  </span>
          <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{displayHours}</span>
          <span>:</span>
          <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{minutes}</span>
          <span>:</span>
          <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{seconds}</span>
          <span>:</span>
          <span style={{ display: 'inline-block', width: '3ch', textAlign: 'center' }}>{milliseconds}</span>
          {ampm && <span style={{ fontSize: '0.55em', marginLeft: '0.3em' }}>{ampm}</span>}
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
            onClick={() => { setPickedDayjs(dayjs(time)); setCalendarOpen(true); }}
            title="Pick date & time"
          >
            <CalendarMonthIcon />
          </IconButton>
          <Button size="small" onClick={() => { const v = !use24h; setUse24h(v); localStorage.setItem('sundial-24h', String(v)); }}
            sx={{ minWidth: 0, px: 1, textTransform: 'none', fontSize: '0.75rem' }}>
            {use24h ? '24h' : '12h'}
          </Button>
          <Button size="small" onClick={() => { const v = !useDMY; setUseDMY(v); localStorage.setItem('sundial-dmy', String(v)); }}
            sx={{ minWidth: 0, px: 1, textTransform: 'none', fontSize: '0.75rem' }}>
            {useDMY ? 'D/M' : 'M/D'}
          </Button>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {coords ? (
          <Typography variant="h3" component="div">
            {coords.lat.toFixed(6)}&nbsp;&nbsp;{coords.lon.toFixed(6)}
            {timezone && <>&nbsp;&nbsp;<span>{getUtcOffset(timezone)}</span></>}
          </Typography>
        ) : (
          <Typography variant="h3" component="div" color="text.secondary">
            {'< Getting Location >'}
          </Typography>
        )}
        <IconButton
          size="small"
          onClick={async () => {
            setLatInput(coords ? coords.lat.toString() : '');
            setLonInput(coords ? coords.lon.toString() : '');
            const tz = timezone || (coords ? await lookupTimezone(coords.lat, coords.lon) : '');
            setModalTimezone(tz);
            setLocationOpen(true);
          }}
          title="Set location"
        >
          <MyLocationIcon fontSize="small" />
        </IconButton>
      </Box>
      </Box>

      {/* ── Date/time picker dialog — StaticDateTimePicker renders inline, no secondary popup ── */}
      <Dialog open={calendarOpen} onClose={() => setCalendarOpen(false)}
        PaperProps={{ sx: { bgcolor: '#000', backgroundImage: 'none' } }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <StaticDateTimePicker
            value={pickedDayjs}
            onChange={setPickedDayjs}
            onAccept={(val) => {
              if (val) { setTime(val.second(0).millisecond(0).toDate()); setPaused(true); }
              setCalendarOpen(false);
            }}
            onClose={() => setCalendarOpen(false)}
            slotProps={{ actionBar: { actions: ['cancel', 'accept'] } }}
          />
        </LocalizationProvider>
      </Dialog>

      {/* ── Location picker dialog ── */}
      <Dialog open={locationOpen} onClose={() => setLocationOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Set location</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {locationOpen && (
            <LocationPickerMap
              lat={isNaN(parseFloat(latInput)) ? (coords?.lat ?? 0) : parseFloat(latInput)}
              lon={isNaN(parseFloat(lonInput)) ? (coords?.lon ?? 0) : parseFloat(lonInput)}
              onChange={(lat, lon) => {
                setLatInput(lat.toFixed(6));
                setLonInput(lon.toFixed(6));

                const reqId = ++modalTzReqRef.current;
                lookupTimezone(lat, lon).then(tz => { if (tz && modalTzReqRef.current === reqId) setModalTimezone(tz); });
              }}
            />
          )}
          <Box sx={{ display: 'flex', gap: 2 }}>
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
          </Box>
          <Autocomplete
            value={allTimezones.find((o: {tz: string}) => o.tz === modalTimezone)
              ?? (modalTimezone ? { tz: modalTimezone, label: `${getStandardUtcOffset(modalTimezone)}  ${modalTimezone}` } : null)}
            onChange={(_, v: {tz: string; label: string} | null) => { if (v) setModalTimezone(v.tz); }}
            options={allTimezones}
            getOptionLabel={(o: {tz: string; label: string}) => o.label}
            renderInput={params => <TextField {...params} label="Timezone" size="small" />}
            fullWidth
            disableClearable
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              navigator.geolocation?.getCurrentPosition(
                pos => { setLatInput(pos.coords.latitude.toFixed(6)); setLonInput(pos.coords.longitude.toFixed(6)); },
                () => {},
              );
            }}
            sx={{ mr: 'auto' }}
          >
            Current Location
          </Button>
          <Button onClick={() => setLocationOpen(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              const lat = parseFloat(latInput);
              const lon = parseFloat(lonInput);
              if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                setCoords({ lat, lon });
                const tz = modalTimezone || await lookupTimezone(lat, lon);
                setTimezone(tz);
              }
              setLocationOpen(false);
            }}
          >
            Set
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Daily (solar) clock ── */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, width: { xs: '100%', md: 'fit-content' } }}>
        <Box sx={clockBoxSx(dailyInfoOpen)} onClick={() => setDailyInfoOpen(true)} style={{ cursor: 'pointer' }}>
          <DailyClock
            date={time}
            sunrise={sunTimes.sunrise}
            sunset={sunTimes.sunset}
            activeIconIndex={dailySelectedIdx ?? undefined}
            onIconClick={(i) => { setDailySelectedIdx(prev => prev === i ? null : i); setDailyInfoOpen(true); }}
          />
        </Box>
        <Box sx={infoPanelSx(dailyInfoOpen)}>
          <Box sx={infoPanelContentSx(dailyInfoOpen)}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
              <IconButton size="small" onClick={() => { setDailyInfoOpen(false); setDailySelectedIdx(null); }} title="Close">
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
            {dailySelectedIdx !== null && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 500 }}>
                  {SOLAR_EVENT_DATA[dailySelectedIdx].name}
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                  {SOLAR_EVENT_DATA[dailySelectedIdx].description}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mt: 1, cursor: 'pointer', color: 'text.secondary' }}
                  onClick={() => setDailySelectedIdx(null)}
                >
                  ← back
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── Moon clock ── */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, width: { xs: '100%', md: 'fit-content' } }}>
        <Box sx={clockBoxSx(moonInfoOpen)} onClick={() => setMoonInfoOpen(true)} style={{ cursor: 'pointer' }}>
          <MoonClock
            percent={moonPercent}
            date={time}
            activeIconIndex={moonDisplayIdx}
            onIconClick={(i) => { setMoonSelectedIdx(prev => prev === i ? null : i); setMoonInfoOpen(true); }}
          />
        </Box>
        <Box sx={infoPanelSx(moonInfoOpen)}>
          <Box sx={infoPanelContentSx(moonInfoOpen)}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
              <IconButton size="small" onClick={() => { setMoonInfoOpen(false); setMoonSelectedIdx(null); }} title="Close">
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
      </Box>

      {/* ── Wheel of the Year clock ── */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, width: { xs: '100%', md: 'fit-content' } }}>
        <Box sx={clockBoxSx(yearInfoOpen)} onClick={() => setYearInfoOpen(true)} style={{ cursor: 'pointer' }}>
          <YearClock
            date={time}
            activeIconIndex={yearDisplayIdx}
            onIconClick={(i) => { setYearSelectedIdx(prev => prev === i ? null : i); setYearInfoOpen(true); }}
          />
        </Box>
        <Box sx={infoPanelSx(yearInfoOpen)}>
          <Box sx={infoPanelContentSx(yearInfoOpen)}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
              <IconButton size="small" onClick={() => { setYearInfoOpen(false); setYearSelectedIdx(null); }} title="Close">
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
      </Box>

      {/* ── Astrological / zodiac clock ── */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, width: { xs: '100%', md: 'fit-content' } }}>
        <Box sx={clockBoxSx(astroInfoOpen)} onClick={() => setAstroInfoOpen(true)} style={{ cursor: 'pointer' }}>
          <AstroClock
            date={time}
            activeIconIndex={astroDisplayIdx}
            onSignClick={(i) => { setAstroSelectedIdx(prev => prev === i ? null : i); setAstroInfoOpen(true); }}
          />
        </Box>
        <Box sx={infoPanelSx(astroInfoOpen)}>
          <Box sx={infoPanelContentSx(astroInfoOpen)}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
              <IconButton size="small" onClick={() => { setAstroInfoOpen(false); setAstroSelectedIdx(null); }} title="Close">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>Stars</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              {ZODIAC_DATA[astroDisplayIdx].symbol} {ZODIAC_DATA[astroDisplayIdx].name}
            </Typography>
            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 1 }}>
              {ZODIAC_DATA[astroDisplayIdx].description}
            </Typography>
            <PlanetaryPositionsTable date={time} />
            <ElementModalitySummary date={time} />
            <AspectsTable date={time} />
            {astroSelectedIdx !== null && (
              <Typography
                variant="caption"
                sx={{ display: 'block', mt: 1.5, cursor: 'pointer', color: 'text.secondary' }}
                onClick={() => setAstroSelectedIdx(null)}
              >
                ← back to Sun's sign
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
