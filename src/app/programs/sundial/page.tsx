// Manages shared state (time, location, display prefs) and composes the clock sections and dialogs.
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import { calcSunTimes } from './lib/astro';
import { lookupTimezone } from './lib/sundial-geo';
import CalendarDialog from './dialogs/CalendarDialog';
import LocationDialog from './dialogs/LocationDialog';
import SundialTimestamp from './SundialTimestamp';
import DailyClockSection from './clocks/DailyClockSection';
import MoonClockSection from './clocks/MoonClockSection';
import YearClockSection from './clocks/YearClockSection';
import AstroClockSection from './clocks/AstroClockSection';

export default function SundialPage() {
  const [time, setTime]     = useState(new Date());
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [paused, setPaused]             = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [timezone, setTimezone]         = useState('');
  const [use24h, setUse24h]             = useState(false);
  const [useDMY, setUseDMY]             = useState(false);

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

  // Recompute sun times only when the date or location changes (not every ms)
  const [year, month, day] = [time.getFullYear(), time.getMonth(), time.getDate()];
  const sunTimes = useMemo(
    () => coords
      ? calcSunTimes(time, coords.lat, coords.lon)
      : { sunrise: null, sunset: null, solarNoon: null, solarMidnight: null },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coords, year, month, day],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4, gap: 6 }}>
      <h1>Sundial</h1>

      <SundialTimestamp
        time={time}
        use24h={use24h}
        useDMY={useDMY}
        paused={paused}
        coords={coords}
        timezone={timezone}
        onPauseToggle={() => setPaused(p => !p)}
        onCalendarOpen={() => setCalendarOpen(true)}
        onToggle24h={() => { const v = !use24h; setUse24h(v); localStorage.setItem('sundial-24h', String(v)); }}
        onToggleDMY={() => { const v = !useDMY; setUseDMY(v); localStorage.setItem('sundial-dmy', String(v)); }}
        onLocationOpen={() => setLocationOpen(true)}
      />

      <CalendarDialog
        open={calendarOpen}
        initialTime={time}
        onAccept={(date) => { setTime(date); setPaused(true); }}
        onClose={() => setCalendarOpen(false)}
      />

      <LocationDialog
        open={locationOpen}
        coords={coords}
        timezone={timezone}
        onSet={(lat, lon, tz) => { setCoords({ lat, lon }); setTimezone(tz); }}
        onClose={() => setLocationOpen(false)}
      />

      <DailyClockSection time={time} sunTimes={sunTimes} use24h={use24h} coords={coords} />
      <MoonClockSection  time={time} />
      <YearClockSection  time={time} />
      <AstroClockSection time={time} />
    </Box>
  );
}
