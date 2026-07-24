// ============================================================
// YearClock.tsx — Wheel of the Year clock using RadialClock
//
// The ring is divided into 8 segments (one per sabbat) with a
// rainbow gradient moving through the seasonal color palette.
// The hand marks the current day of the year.
// Season names appear as curved arc text inside the ring.
// Sabbat names are shown as labels at each spoke position.
// ============================================================
'use client';

import React from 'react';
import { useTheme } from '@mui/material';
import RadialClock, { ColorStop, RingIcon, RingLabel, RingSector } from './RadialClock';

// ---- Sabbat data --------------------------------------------

/** Order on the wheel starting at the right (0° = Samhain = Nov 1),
 *  going clockwise through the year. */
const SABBATS: { name: string; shortName: string; icon: string }[] = [
  { name: 'Samhain',    shortName: 'Samhain',  icon: '/sundial/year/samhain.svg'  },
  { name: 'Yule',       shortName: 'Yule',     icon: '/sundial/year/yule.svg'     },
  { name: 'Imbolc',     shortName: 'Imbolc',   icon: '/sundial/year/imbolc.svg'   },
  { name: 'Ostara',     shortName: 'Ostara',   icon: '/sundial/year/ostara.svg'   },
  { name: 'Beltane',    shortName: 'Beltane',  icon: '/sundial/year/beltain.svg'  },
  { name: 'Litha',      shortName: 'Litha',    icon: '/sundial/year/litha.svg'    },
  { name: 'Lughnasadh', shortName: 'Lughnasa', icon: '/sundial/year/lunasa.svg'   },
  { name: 'Mabon',      shortName: 'Mabon',    icon: '/sundial/year/mabon.svg'    },
];

// ---- Seasonal color palette ---------------------------------
// One color per sabbat; the gradient ring blends between adjacent colors.
const SEASONAL_COLORS: ColorStop[] = SABBATS.map((_, i) => ({
  pos: i / SABBATS.length,
  hex: [
    '#B22222', // Samhain  — deep autumn red
    '#7C3AED', // Yule     — deep winter purple
    '#1E3A8A', // Imbolc   — late-winter sky blue
    '#60A5FA', // Ostara   — spring blue
    '#16A34A', // Beltane  — vibrant green
    '#FDE047', // Litha    — summer gold
    '#F97316', // Lughnasadh — harvest orange
    '#EA580C', // Mabon    — autumn rust
  ][i],
}));

// ---- Seasons as ring sectors --------------------------------
// Defined as fractions of the 8-sabbat wheel (each sabbat = 1/8 = 0.125).
// Samhain is at pos=0 (right side of wheel, i.e. startAngleOffset=0).
const YEAR_SECTORS: RingSector[] = [
  { startPos: 3 / 8, endPos: 5 / 8, label: 'Spring', color: '#86EFAC' }, // Ostara → Litha
  { startPos: 5 / 8, endPos: 7 / 8, label: 'Summer', color: '#FDE047' }, // Litha → Mabon
  { startPos: 7 / 8, endPos: 9 / 8, label: 'Autumn', color: '#EA580C' }, // Mabon → Yule  (wraps)
  { startPos: 1 / 8, endPos: 3 / 8, label: 'Winter', color: '#60A5FA' }, // Yule → Ostara
];

// ---- Labels -------------------------------------------------
// Short sabbat names shown as text at each major position.
const YEAR_LABELS: RingLabel[] = SABBATS.map((sab, i) => ({
  pos: i / SABBATS.length,
  text: sab.shortName,
}));

// ---- Tick marks ---------------------------------------------
// 52 minor ticks (one per week), major at each sabbat (every ~6.5 weeks)
const YEAR_TICKS = 52;
const YEAR_MAJOR_TICKS = SABBATS.map((_, i) => Math.round((i / SABBATS.length) * YEAR_TICKS));

// ---- Hand position ------------------------------------------
// Converts today's date to a 0–1 fraction of the pagan year.
// The pagan year starts at Samhain (≈ Nov 1), which sits at pos=0.
// Jan 1 is approximately 61 days after Samhain (Nov 1).
const SAMHAIN_OFFSET_DAYS = 61;

function dayOfYearToFraction(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff  = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000); // 1–365
  return ((dayOfYear + SAMHAIN_OFFSET_DAYS) / 365) % 1;
}

// ---- Component ----------------------------------------------

interface YearClockProps {
  date: Date;
}

export const YearClock: React.FC<YearClockProps> = ({ date }) => {
  const theme    = useTheme();
  const handPos  = dayOfYearToFraction(date);

  // Render sabbat SVG icons as flat silhouettes: white in dark mode, black in light.
  const iconFilterStyle = theme.palette.mode === 'dark'
    ? 'brightness(0) invert(1)'
    : 'brightness(0)';

  // One icon per sabbat, placed outside the ring at each sabbat's angular position.
  const icons: RingIcon[] = SABBATS.map((sab, i) => ({
    pos:         i / SABBATS.length,
    href:        sab.icon,
    filterStyle: iconFilterStyle,
    size:        22,
  }));

  return (
    <RadialClock
      handPos={handPos}
      colorStops={SEASONAL_COLORS}
      ticks={YEAR_TICKS}
      majorTicks={YEAR_MAJOR_TICKS}
      labels={YEAR_LABELS}
      sectors={YEAR_SECTORS}
      // pos=0 (Samhain) at the right side (3-o'clock position, offset=0)
      startAngleOffset={0}
      icons={icons}
      size={280}
      ringRadius={100}
      ringWidth={12}
      iconOffset={28}
      idPrefix="year"
    />
  );
};

export default YearClock;
