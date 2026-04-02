'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography } from '@mui/material';

// --- Moon phase calculation ---
// Based on https://github.com/jasonsturges/lunarphase-js
const SYNODIC_MONTH = 29.53058770576;
const JD_EPOCH = 2451550.1; // Julian date of a known new moon

function dateToJulian(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function lunarAgePercent(date: Date): number {
  const raw = (dateToJulian(date) - JD_EPOCH) / SYNODIC_MONTH;
  return raw - Math.floor(raw); // normalize 0–1
}

function moonPhaseName(p: number): string {
  if (p < 0.034) return 'New Moon';
  if (p < 0.188) return 'Waxing Crescent';
  if (p < 0.313) return 'First Quarter';
  if (p < 0.438) return 'Waxing Gibbous';
  if (p < 0.563) return 'Full Moon';
  if (p < 0.688) return 'Waning Gibbous';
  if (p < 0.813) return 'Last Quarter';
  if (p < 0.966) return 'Waning Crescent';
  return 'New Moon';
}

// --- Sun rise/set calculation (NOAA algorithm) ---
function toRad(deg: number) { return (deg * Math.PI) / 180; }
function toDeg(rad: number) { return (rad * 180) / Math.PI; }

function calcSunTimes(date: Date, lat: number, lon: number): { sunrise: Date | null; sunset: Date | null } {
  const JD = dateToJulian(date);
  const T  = (JD - 2451545.0) / 36525.0;
  const L0 = ((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360 + 360) % 360;
  const M  = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e  = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const Mrad = toRad(M);
  const C = Math.sin(Mrad) * (1.914602 - T * (0.004817 + 0.000014 * T))
           + Math.sin(2 * Mrad) * (0.019993 - 0.000101 * T)
           + Math.sin(3 * Mrad) * 0.000289;
  const omega  = 125.04 - 1934.136 * T;
  const lambda = (L0 + C) - 0.00569 - 0.00478 * Math.sin(toRad(omega));
  const eps0   = 23 + (26 + (21.448 - T * (46.8150 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps    = eps0 + 0.00256 * Math.cos(toRad(omega));
  const dec    = toDeg(Math.asin(Math.sin(toRad(eps)) * Math.sin(toRad(lambda))));
  const y      = Math.tan(toRad(eps / 2)) ** 2;
  const eot    = 4 * toDeg(
    y * Math.sin(2 * toRad(L0))
    - 2 * e * Math.sin(Mrad)
    + 4 * e * y * Math.sin(Mrad) * Math.cos(2 * toRad(L0))
    - 0.5 * y * y * Math.sin(4 * toRad(L0))
    - 1.25 * e * e * Math.sin(2 * Mrad)
  );
  const cosHA = (Math.cos(toRad(90.833)) - Math.sin(toRad(lat)) * Math.sin(toRad(dec)))
              / (Math.cos(toRad(lat)) * Math.cos(toRad(dec)));
  if (cosHA < -1 || cosHA > 1) return { sunrise: null, sunset: null };
  const HA   = toDeg(Math.acos(cosHA));
  const noon = 720 - 4 * lon - eot;
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  return {
    sunrise: new Date(dayStart.getTime() + (noon - HA * 4) * 60000),
    sunset:  new Date(dayStart.getTime() + (noon + HA * 4) * 60000),
  };
}

function formatSunTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

function sunMarkerSvg(time: Date, cx: number, cy: number, R: number, color: string) {
  const th = time.getHours() % 12;
  const tm = time.getMinutes();
  const angle = ((th + tm / 60) / 12) * 360 - 90;
  const rad   = (angle * Math.PI) / 180;
  const outerR = R + 14;
  const x = cx + outerR * Math.cos(rad);
  const y = cy + outerR * Math.sin(rad);
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * 2 * Math.PI;
    return (
      <line key={i}
        x1={Math.cos(a) * 6} y1={Math.sin(a) * 6}
        x2={Math.cos(a) * 9} y2={Math.sin(a) * 9}
        stroke={color} strokeWidth={1.5} strokeLinecap="round"
      />
    );
  });
  return (
    <g>
      <line
        x1={cx + (R + 2) * Math.cos(rad)} y1={cy + (R + 2) * Math.sin(rad)}
        x2={cx + (R + 5) * Math.cos(rad)} y2={cy + (R + 5) * Math.sin(rad)}
        stroke={color} strokeWidth={2}
      />
      <g transform={`translate(${x}, ${y})`}>
        <circle r={4} fill={color} />
        {rays}
      </g>
    </g>
  );
}

// --- Analog Clock SVG ---
const AnalogClock = ({ date, sunrise, sunset }: { date: Date; sunrise?: Date | null; sunset?: Date | null }) => {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const R = 90;

  const h = date.getHours() % 12;
  const m = date.getMinutes();
  const s = date.getSeconds() + date.getMilliseconds() / 1000;

  const secAngle  = (s / 60) * 360 - 90;
  const minAngle  = ((m + s / 60) / 60) * 360 - 90;
  const hourAngle = ((h + m / 60) / 12) * 360 - 90;

  const hand = (angle: number, length: number, width: number, color: string) => {
    const rad = (angle * Math.PI) / 180;
    return (
      <line
        x1={cx} y1={cy}
        x2={cx + length * Math.cos(rad)}
        y2={cy + length * Math.sin(rad)}
        stroke={color} strokeWidth={width} strokeLinecap="round"
      />
    );
  };

  return (
    <svg width={size} height={size} viewBox="-20 -20 240 240">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="currentColor" strokeWidth="2" />
      {/* Hour marks */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
        return (
          <line key={i}
            x1={cx + (R - 8) * Math.cos(a)} y1={cy + (R - 8) * Math.sin(a)}
            x2={cx + R * Math.cos(a)}       y2={cy + R * Math.sin(a)}
            stroke="currentColor" strokeWidth="2"
          />
        );
      })}
      {hand(hourAngle, R * 0.55, 4, 'currentColor')}
      {hand(minAngle,  R * 0.75, 2.5, 'currentColor')}
      {hand(secAngle,  R * 0.85, 1.5, '#e53935')}
      <circle cx={cx} cy={cy} r={3} fill="currentColor" />
      {sunrise && sunMarkerSvg(sunrise, cx, cy, R, '#FFD700')}
      {sunset  && sunMarkerSvg(sunset,  cx, cy, R, '#FF8C00')}
    </svg>
  );
};

// --- Moon SVG ---
// Sweep flags: sweep=1 is clockwise on screen. From the bottom of the circle,
// clockwise goes LEFT and counterclockwise (sweep=0) goes RIGHT.
const MoonSvg = ({ percent }: { percent: number }) => {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const R = 80;
  // Terminator x-radius: R at new/full, 0 at quarter moons
  const tx = R * Math.abs(Math.cos(percent * 2 * Math.PI));
  const isNew = percent < 0.025 || percent > 0.975;
  const isWaxing = percent <= 0.5;

  let litPath = '';
  if (!isNew) {
    if (isWaxing) {
      // Outer RIGHT limb: top → clockwise (sweep=1) → bottom
      // Terminator back to top:
      //   crescent (p<0.25): must stay on RIGHT side → sweep=0 (counterclockwise = right from bottom)
      //   gibbous  (p≥0.25): must cross to LEFT side → sweep=1 (clockwise = left from bottom)
      const tSweep = percent < 0.25 ? 0 : 1;
      litPath = `M ${cx} ${cy - R} A ${R} ${R} 0 0 1 ${cx} ${cy + R} A ${tx} ${R} 0 0 ${tSweep} ${cx} ${cy - R} Z`;
    } else {
      // Outer LEFT limb: top → counterclockwise (sweep=0) → bottom
      // Terminator back to top:
      //   gibbous  (p<0.75): must cross to RIGHT side → sweep=0 (counterclockwise = right from bottom)
      //   crescent (p≥0.75): must stay on LEFT side  → sweep=1 (clockwise = left from bottom)
      const tSweep = percent < 0.75 ? 0 : 1;
      litPath = `M ${cx} ${cy - R} A ${R} ${R} 0 0 0 ${cx} ${cy + R} A ${tx} ${R} 0 0 ${tSweep} ${cx} ${cy - R} Z`;
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={R} fill="#1a1a2e" stroke="#444" strokeWidth="1" />
      {litPath && <path d={litPath} fill="#f0e8c8" />}
    </svg>
  );
};
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import YardIcon from '@mui/icons-material/Yard';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import GrassIcon from '@mui/icons-material/Grass';
import AppleIcon from '@mui/icons-material/Apple';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import LightModeIcon from '@mui/icons-material/LightMode';

const Sabbats = [
  { name: 'Samhain', icon: <NightsStayIcon /> },
  { name: 'Yule', icon: <AcUnitIcon /> },
  { name: 'Imbolc', icon: <LightModeIcon /> },
  { name: 'Ostara', icon: <YardIcon /> },
  { name: 'Beltane', icon: <LocalFireDepartmentIcon /> },
  { name: 'Litha', icon: <WbSunnyIcon /> },
  { name: 'Lughnasadh', icon: <GrassIcon /> },
  { name: 'Mabon', icon: <AppleIcon /> },
];

const WheelOfYear = () => {
  const size = 400; // Total SVG width/height
  const center = size / 2;
  const radius = 150; // Distance from center to symbols

  // Calculate current day of the year
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay); // 1-365

  // Calculate rotation so today is at the top
  // The year starts at the top, so we rotate by the percentage of the year that has passed.
  // We subtract 90 degrees because the circle starts with 0 degrees at the 3 o'clock position.
  const rotation = -((dayOfYear / 365) * 360 + 90);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(${rotation} ${center} ${center})`}>
        {/* Optional: The actual circle line */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#ccc" />

        {Sabbats.map((sabbat, i) => {
          // Calculate the angle for this item (in radians)
          // Subtracting Math.PI / 2 starts the first item at the top (12 o'clock)
          const angle = (i * (360 / Sabbats.length) * Math.PI) / 180 - Math.PI / 2 +0.5;

          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);

          return (
            <g key={sabbat.name} transform={`translate(${x}, ${y})`}>
              {/* Rotate text back to be upright */}
              <g transform={`rotate(${-rotation})`}>
                <foreignObject x="-12" y="-12" width="24" height="24">
                  {sabbat.icon}
                </foreignObject>
                <text y="25" textAnchor="middle" fontSize="12" fill="#666">
                  {sabbat.name}
                </text>
              </g>
            </g>
          );
        })}
      </g>
      {/* Pin for current date at the top */}
      <foreignObject
        x={center - 12}
        y={center - radius - 30}
        width="24"
        height="24"
      >
        <LocationOnIcon sx={{ color: 'red', fontSize: 24 }} />
      </foreignObject>
    </svg>
  );
};

const getSabbatDates = (year: number): { name: string; date: Date }[] => [
  { name: 'Imbolc',     date: new Date(year, 1,  2)  },
  { name: 'Ostara',     date: new Date(year, 2,  20) },
  { name: 'Beltane',    date: new Date(year, 4,  1)  },
  { name: 'Litha',      date: new Date(year, 5,  21) },
  { name: 'Lughnasadh', date: new Date(year, 7,  1)  },
  { name: 'Mabon',      date: new Date(year, 8,  22) },
  { name: 'Samhain',    date: new Date(year, 10, 1)  },
  { name: 'Yule',       date: new Date(year, 11, 21) },
];

function getNearestSabbats(now: Date): {
  current: string | null;
  last: { name: string; daysAgo: number } | null;
  next: { name: string; daysUntil: number } | null;
} {
  const year = now.getFullYear();
  const all = [
    ...getSabbatDates(year - 1),
    ...getSabbatDates(year),
    ...getSabbatDates(year + 1),
  ];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const MS = 86400000;
  let current: string | null = null;
  let last: { name: string; daysAgo: number } | null = null;
  let next: { name: string; daysUntil: number } | null = null;
  for (const s of all) {
    const sd = new Date(s.date.getFullYear(), s.date.getMonth(), s.date.getDate()).getTime();
    const diff = Math.round((sd - today) / MS);
    if (diff === 0) {
      current = s.name;
    } else if (diff < 0 && (!last || -diff < last.daysAgo)) {
      last = { name: s.name, daysAgo: -diff };
    } else if (diff > 0 && (!next || diff < next.daysUntil)) {
      next = { name: s.name, daysUntil: diff };
    }
  }
  return { current, last, next };
}

export default function SundialPage() {
  const [time, setTime] = useState(new Date());
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1); // Update every millisecond
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {},
      );
    }
  }, []);

  const formatTime = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return { year, month, day, hours, minutes, seconds, milliseconds };
  };

  const { year, month, day, hours, minutes, seconds, milliseconds } = formatTime(time);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sunTimes = useMemo(
    () => coords ? calcSunTimes(time, coords.lat, coords.lon) : { sunrise: null, sunset: null },
    [coords, year, month, day],
  );

  const moonPercent = lunarAgePercent(time);
  const moonAge = moonPercent * SYNODIC_MONTH;

  return (
    
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4, gap: 6 }}>
      <Typography variant="h3" component="div" sx={{ display: 'flex', alignItems: 'baseline', gap: '0.15em' }}>
        <span style={{ display: 'inline-block', width: '4ch', textAlign: 'center' }}>{year}</span>
        <span>:</span>
        <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{month}</span>
        <span>:</span>
        <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{day}</span>
        <span> </span>
        <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{hours}</span>
        <span>:</span>
        <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{minutes}</span>
        <span>:</span>
        <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{seconds}</span>
        <span>:</span>
        <span style={{ display: 'inline-block', width: '3ch', textAlign: 'center' }}>{milliseconds}</span>
      </Typography>
      {/* Time of Day */}
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <AnalogClock date={time} sunrise={sunTimes.sunrise} sunset={sunTimes.sunset} />
        <Box>
          <Typography variant="h5" sx={{ mt: 1 }}>
            {`${year}-${month}-${day}`}
          </Typography>
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

      {/* Moon section */}
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <MoonSvg percent={moonPercent} />
        <Box>
          <Typography variant="h5">{moonPhaseName(moonPercent)}</Typography>
          <Typography variant="body1">Illumination: {Math.round(moonPercent <= 0.5 ? moonPercent * 2 * 100 : (1 - moonPercent) * 2 * 100)}%</Typography>
          <Typography variant="body1">Age: {moonAge.toFixed(1)} days</Typography>
          <Typography variant="body1">Cycle: {(moonPercent * 100).toFixed(1)}% complete</Typography>
        </Box>
      </Box>

      {/* Wheel of Year */}
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <WheelOfYear />
        <Box>
          <Typography variant="h5">Wheel of the Year</Typography>
          {(() => {
            const { current, last, next } = getNearestSabbats(time);
            return (
              <>
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
              </>
            );
          })()}
        </Box>
      </Box>
    </Box>
  );
}
