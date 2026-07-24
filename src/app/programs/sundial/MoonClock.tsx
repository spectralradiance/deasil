// ============================================================
// MoonClock.tsx — Lunar phase clock using RadialClock
//
// The ring color shifts from dark (new moon) through silver-white
// (full moon) and back, reflecting the illumination cycle.
// Icons for each of the 8 moon phases are placed outside the ring.
// A moon-phase disc is rendered in the center as a custom child.
// The hand sweeps once per synodic month; pos=0 at new moon (bottom).
// ============================================================
'use client';

import React from 'react';
import { useTheme } from '@mui/material';
import RadialClock, { ColorStop, RingIcon, RingLabel, RingSector } from './RadialClock';
import { SYNODIC_MONTH } from './astro';

// ---- Color palette ------------------------------------------
// Colors reflect the illumination level around the lunar cycle.
// pos=0 is new moon (dark), pos=0.5 is full moon (bright).
const MOON_COLORS: ColorStop[] = [
  { pos: 0,    hex: '#1a1a3e' }, // new moon  — very dark blue-black
  { pos: 0.25, hex: '#8888aa' }, // 1st quarter — muted blue-grey
  { pos: 0.5,  hex: '#f0e8c8' }, // full moon  — warm parchment white
  { pos: 0.75, hex: '#8888aa' }, // 3rd quarter — muted blue-grey
];

// ---- Phase icon definitions ---------------------------------
// 8 phases, evenly spaced around the ring; pos=0 = new moon (bottom of clock).
// Icons go counterclockwise on screen so waxing is on the left.
const PHASE_ICONS: RingIcon[] = [
  { pos: 0,     href: '/sundial/moon/new_moon.svg'        },
  { pos: 0.125, href: '/sundial/moon/waxing_crescent.svg' },
  { pos: 0.25,  href: '/sundial/moon/first_quarter.svg'   },
  { pos: 0.375, href: '/sundial/moon/waxing_gibbous.svg'  },
  { pos: 0.5,   href: '/sundial/moon/full_moon.svg'       },
  { pos: 0.625, href: '/sundial/moon/waning_gibbous.svg'  },
  { pos: 0.75,  href: '/sundial/moon/last_quarter.svg'    },
  { pos: 0.875, href: '/sundial/moon/waning_crescent.svg' },
];

// ---- Tick marks & labels ------------------------------------
// 32 ticks = 8 phases × 4, so major ticks at [0,4,8,...] land exactly on icon positions.
const MOON_TICKS = 32;
const MOON_MAJOR_TICKS = [0, 4, 8, 12, 16, 20, 24, 28];

// Day-of-cycle labels at the 8 major phase positions (one decimal place)
const MOON_LABELS: RingLabel[] = PHASE_ICONS.map(ic => ({
  pos: ic.pos,
  text: (ic.pos * SYNODIC_MONTH).toFixed(1) + 'd',
}));

// ---- Sectors ------------------------------------------------
const MOON_SECTORS: RingSector[] = [
  { startPos: 0,   endPos: 0.5,  label: 'Waxing' },
  { startPos: 0.5, endPos: 1.0,  label: 'Waning' },
];

// ---- Moon disc (center decoration) -------------------------
// Renders the familiar illuminated/dark moon face based on the phase fraction.
const MoonDisc: React.FC<{ percent: number; cx: number; cy: number; R: number }> = ({
  percent, cx, cy, R,
}) => {
  // Terminator x-radius: wide at new/full, narrow at quarters
  const tx = R * Math.abs(Math.cos(percent * 2 * Math.PI));
  const isNew     = percent < 0.025 || percent > 0.975;
  const isWaxing  = percent <= 0.5;

  // Build SVG path for the lit portion of the moon
  let litPath = '';
  if (!isNew) {
    if (isWaxing) {
      const tSweep = percent < 0.25 ? 0 : 1;
      litPath = `M ${cx} ${cy - R} A ${R} ${R} 0 0 1 ${cx} ${cy + R} A ${tx} ${R} 0 0 ${tSweep} ${cx} ${cy - R} Z`;
    } else {
      const tSweep = percent < 0.75 ? 0 : 1;
      litPath = `M ${cx} ${cy - R} A ${R} ${R} 0 0 0 ${cx} ${cy + R} A ${tx} ${R} 0 0 ${tSweep} ${cx} ${cy - R} Z`;
    }
  }

  // Hand endpoint (using difference blend so it is visible on both dark/light sides)
  const angle = percent * 2 * Math.PI + Math.PI / 2;
  const hx = cx + R * Math.cos(angle);
  const hy = cy + R * Math.sin(angle);

  return (
    <g>
      {/* Dark moon body */}
      <circle cx={cx} cy={cy} r={R} fill="#1a1a2e" stroke="#33334a" strokeWidth="1" />
      {/* Lit crescent / gibbous / full */}
      {litPath && <path d={litPath} fill="#f0e8c8" />}
      {/* Terminator line */}
      <line
        x1={cx} y1={cy} x2={hx} y2={hy}
        stroke="white" strokeWidth="1"
        style={{ mixBlendMode: 'difference' }}
      />
    </g>
  );
};

// ---- Props & Component --------------------------------------

interface MoonClockProps {
  /** Lunar age as a 0–1 fraction (0 = new moon, 0.5 = full moon) */
  percent: number;
}

export const MoonClock: React.FC<MoonClockProps> = ({ percent }) => {
  const theme = useTheme();

  // Pass a CSS filter string so RadialClock can apply it directly to each <image>.
  // This inverts the icons to white in dark mode and renders them black in light mode.
  const iconFilterStyle = theme.palette.mode === 'dark'
    ? 'brightness(0) invert(1)'
    : 'brightness(0)';

  const icons: RingIcon[] = PHASE_ICONS.map(ic => ({ ...ic, filterStyle: iconFilterStyle }));

  // SVG center for the moon disc
  const size     = 200;
  const cx       = size / 2;
  const cy       = size / 2;
  // 33% of the ring radius (72) — matches the inner circle proportion of other clocks
  const discR    = Math.round(72 * 0.33); // ~24

  return (
    <RadialClock
      handPos={percent}
      colorStops={MOON_COLORS}
      ticks={MOON_TICKS}
      majorTicks={MOON_MAJOR_TICKS}
      labels={MOON_LABELS}
      sectors={MOON_SECTORS}
      // pos=0 (new moon) at bottom (Math.PI/2)
      startAngleOffset={Math.PI / 2}
      icons={icons}
      size={size}
      ringRadius={72}
      ringWidth={8}
      iconOffset={30}
      innerCircleRadius={discR}
      idPrefix="moon"
    >
      {/* Moon phase disc rendered in the center of the clock */}
      <MoonDisc percent={percent} cx={cx} cy={cy} R={discR} />
    </RadialClock>
  );
};

export default MoonClock;
