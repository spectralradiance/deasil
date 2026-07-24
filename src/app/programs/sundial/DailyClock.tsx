// ============================================================
// DailyClock.tsx — 24-hour solar clock using RadialClock
//
// The ring is divided into four 6-hour quadrants colored:
//   midnight → midnight-blue → dawn-yellow → noon-white → dusk-orange → midnight
//
// Icons mark sunrise, solar noon, sunset, and solar midnight.
// The hand sweeps once per 24 hours, pos=0 at midnight (bottom).
// ============================================================
'use client';

import React, { useMemo } from 'react';
import RadialClock, { ColorStop, RingIcon, RingLabel, RingSector } from './RadialClock';

// ---- Color palette ------------------------------------------
// Four color stops evenly spaced; pos=0 is midnight (bottom of clock)
const DAY_COLORS: ColorStop[] = [
  { pos: 0,    hex: '#0000ff' }, // midnight — deep blue
  { pos: 0.25, hex: '#fafad2' }, // 6 AM dawn — pale yellow
  { pos: 0.5,  hex: '#FFD700' }, // noon — gold
  { pos: 0.75, hex: '#FF8C00' }, // 6 PM dusk — dark orange
];

// ---- Helpers ------------------------------------------------

/** Convert a Date to a 0–1 fraction of the 24-hour day */
function dateToFraction(date: Date): number {
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds() + date.getMilliseconds() / 1000;
  return (h + m / 60 + s / 3600) / 24;
}

/** Pick a color from DAY_COLORS for a given time fraction */
function colorAtFraction(fraction: number): string {
  const n = DAY_COLORS.length;
  const scaled = ((fraction % 1) + 1) % 1 * n;
  const lo = Math.floor(scaled) % n;
  const hi = (lo + 1) % n;
  const t = scaled - Math.floor(scaled);
  const parse = (h: string) => ({
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  });
  const c0 = parse(DAY_COLORS[lo].hex);
  const c1 = parse(DAY_COLORS[hi].hex);
  return `rgb(${Math.round(c0.r + (c1.r - c0.r) * t)}, ${Math.round(c0.g + (c1.g - c0.g) * t)}, ${Math.round(c0.b + (c1.b - c0.b) * t)})`;
}

// ---- Tick marks & labels ------------------------------------

// 24 minor ticks (one per hour), with major ticks at 0, 6, 12, 18
const DAILY_TICKS = 24;
const DAILY_MAJOR_TICKS = [0, 6, 12, 18];

// Hour labels at the major ticks, placed inside the ring
const DAILY_LABELS: RingLabel[] = [0, 6, 12, 18].map(hr => ({
  pos: hr / 24,
  text: String(hr),
}));

// ---- Sectors ------------------------------------------------
// Highlight day and night halves with subtle arc text
const DAILY_SECTORS: RingSector[] = [
  { startPos: 0.25, endPos: 0.75, label: 'Day',   color: '#FFD700' },
  { startPos: 0.75, endPos: 1.25, label: 'Night', color: '#0000ff' }, // wraps past 1.0
];

// ---- Props & Component --------------------------------------

interface DailyClockProps {
  date: Date;
  sunrise?: Date | null;
  sunset?: Date | null;
}

export const DailyClock: React.FC<DailyClockProps> = ({ date, sunrise, sunset }) => {
  // Hand position: fraction of 24h day
  const handPos = dateToFraction(date);

  // Solar noon = midpoint of sunrise/sunset; solar midnight = noon + 12h
  const solarNoon = useMemo(
    () => sunrise && sunset ? new Date((sunrise.getTime() + sunset.getTime()) / 2) : null,
    [sunrise, sunset],
  );
  const solarMidnight = useMemo(
    () => solarNoon ? new Date(solarNoon.getTime() + 12 * 3600 * 1000) : null,
    [solarNoon],
  );

  // Build icon list from available solar events
  const icons: RingIcon[] = useMemo(() => {
    const list: RingIcon[] = [];
    if (sunrise) list.push({
      pos: dateToFraction(sunrise),
      href: '/sundial/day/sunrise.svg',
      color: '#FFD700',       // dawn gold
    });
    if (solarNoon) list.push({
      pos: dateToFraction(solarNoon),
      href: '/sundial/day/noon.svg',
      color: '#fafad2',       // noon pale-yellow
    });
    if (sunset) list.push({
      pos: dateToFraction(sunset),
      href: '/sundial/day/sunset.svg',
      color: '#FF8C00',       // dusk orange
    });
    if (solarMidnight) list.push({
      pos: dateToFraction(solarMidnight),
      href: '/sundial/day/midnight.svg',
      color: '#0000ff',       // midnight blue
    });
    return list;
  }, [sunrise, solarNoon, sunset, solarMidnight]);

  return (
    <RadialClock
      handPos={handPos}
      colorStops={DAY_COLORS}
      ticks={DAILY_TICKS}
      majorTicks={DAILY_MAJOR_TICKS}
      labels={DAILY_LABELS}
      sectors={DAILY_SECTORS}
      // pos=0 → midnight → bottom of clock (Math.PI/2)
      startAngleOffset={Math.PI / 2}
      icons={icons}
      size={200}
      ringRadius={72}
      ringWidth={8}
      iconOffset={30}
      idPrefix="daily"
    />
  );
};

export default DailyClock;
