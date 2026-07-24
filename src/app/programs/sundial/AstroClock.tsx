// ============================================================
// AstroClock.tsx — Astrological zodiac clock using RadialClock
//
// The ring is divided into 12 zodiac sign segments with an
// elemental color gradient. The main hand marks the Sun.
// Each planet (Moon through Neptune) has its own shorter hand.
// Sign symbols inside the ring are clickable.
// Positions use simplified mean orbital elements (±5° accuracy).
// ============================================================
'use client';

import React from 'react';
import RadialClock, { ColorStop } from './RadialClock';
import { calcPlanetLongitudes } from './astro';

// ---- Zodiac sign data with descriptions ---------------------

export interface ZodiacInfo { name: string; symbol: string; description: string }

export const ZODIAC_DATA: ZodiacInfo[] = [
  { name: 'Aries',        symbol: '♈︎', description: 'Bold, pioneering, and courageous. Season of beginnings and initiative.' },
  { name: 'Taurus',       symbol: '♉︎', description: 'Steady, sensual, and grounded. Season of growth and earthly pleasures.' },
  { name: 'Gemini',       symbol: '♊︎', description: 'Curious, adaptable, and communicative. Season of ideas and connection.' },
  { name: 'Cancer',       symbol: '♋︎', description: 'Intuitive, nurturing, and emotional. Season of home and inner reflection.' },
  { name: 'Leo',          symbol: '♌︎', description: 'Creative, dramatic, and generous. Season of vitality and self-expression.' },
  { name: 'Virgo',        symbol: '♍︎', description: 'Analytical, practical, and precise. Season of refinement and harvest.' },
  { name: 'Libra',        symbol: '♎︎', description: 'Diplomatic, balanced, and aesthetic. Season of partnership and beauty.' },
  { name: 'Scorpio',      symbol: '♏︎', description: 'Intense, transformative, and perceptive. Season of depth and mystery.' },
  { name: 'Sagittarius',  symbol: '♐︎', description: 'Expansive, philosophical, and adventurous. Season of exploration and truth.' },
  { name: 'Capricorn',    symbol: '♑︎', description: 'Disciplined, ambitious, and patient. Season of structure and achievement.' },
  { name: 'Aquarius',     symbol: '♒︎', description: 'Innovative, humanitarian, and independent. Season of vision and progress.' },
  { name: 'Pisces',       symbol: '♓︎', description: 'Compassionate, dreamy, and spiritual. Season of endings and transcendence.' },
];

// ---- Zodiac gradient colors ---------------------------------
// Colors follow elemental associations cycling through each sign:
// Fire (Aries/Leo/Sag): warm reds & oranges
// Earth (Taurus/Virgo/Cap): greens & olives
// Air (Gemini/Libra/Aqua): golds, violets, sky blues
// Water (Cancer/Scorpio/Pisces): blues & purples
const ZODIAC_COLORS: ColorStop[] = [
  { pos:  0 / 12, hex: '#FF4500' }, // Aries        — fire red
  { pos:  1 / 12, hex: '#228B22' }, // Taurus       — earth green
  { pos:  2 / 12, hex: '#DAA520' }, // Gemini       — air gold
  { pos:  3 / 12, hex: '#4169E1' }, // Cancer       — water blue
  { pos:  4 / 12, hex: '#FF8C00' }, // Leo          — fire orange
  { pos:  5 / 12, hex: '#8FBC8F' }, // Virgo        — earth sage
  { pos:  6 / 12, hex: '#9370DB' }, // Libra        — air violet
  { pos:  7 / 12, hex: '#8B0000' }, // Scorpio      — water deep red
  { pos:  8 / 12, hex: '#FF6347' }, // Sagittarius  — fire tomato
  { pos:  9 / 12, hex: '#556B2F' }, // Capricorn    — earth olive
  { pos: 10 / 12, hex: '#87CEEB' }, // Aquarius     — air sky blue
  { pos: 11 / 12, hex: '#7B68EE' }, // Pisces       — water medium slate
];

// ---- Planet display data ------------------------------------
// lengthFraction: how far the hand reaches relative to the Sun hand length
const PLANETS: {
  key: string; symbol: string; color: string; lengthFraction: number; strokeWidth: number
}[] = [
  { key: 'Moon',    symbol: '\u263D\uFE0E', color: '#C0C0C0', lengthFraction: 0.80, strokeWidth: 1.5 },
  { key: 'Mercury', symbol: '\u263F\uFE0E', color: '#B8860B', lengthFraction: 0.65, strokeWidth: 1.0 },
  { key: 'Venus',   symbol: '\u2640\uFE0E', color: '#FFB6C1', lengthFraction: 0.70, strokeWidth: 1.5 },
  { key: 'Mars',    symbol: '\u2642\uFE0E', color: '#FF4500', lengthFraction: 0.72, strokeWidth: 1.5 },
  { key: 'Jupiter', symbol: '\u2643\uFE0E', color: '#FFA500', lengthFraction: 0.60, strokeWidth: 1.5 },
  { key: 'Saturn',  symbol: '\u2644\uFE0E', color: '#A0522D', lengthFraction: 0.55, strokeWidth: 1.5 },
  { key: 'Uranus',  symbol: '\u2645\uFE0E', color: '#40E0D0', lengthFraction: 0.50, strokeWidth: 1.0 },
  { key: 'Neptune', symbol: '\u2646\uFE0E', color: '#6495ED', lengthFraction: 0.50, strokeWidth: 1.0 },
];

// ---- Shared layout constants --------------------------------
// Must match the props passed to RadialClock below.
const SIZE         = 280;
const CX           = SIZE / 2;
const CY           = SIZE / 2;
const RING_RADIUS  = 100;
const RING_WIDTH   = 12;
// Sun hand length: almost reaches the ring inner edge
const SUN_HAND_R   = RING_RADIUS - RING_WIDTH / 2 - 2;  // = 92
// 0° Aries at the top (12-o'clock)
const START_ANGLE  = -Math.PI / 2;
// Distance from ring outer edge to symbol center
const ICON_OFFSET  = 30;
const ICON_R       = RING_RADIUS + RING_WIDTH / 2 + ICON_OFFSET; // = 136

// ---- Zodiac symbols (interactive, rendered as children) -----
// Sign symbols sit OUTSIDE the ring at each sign's start angle,
// aligned with the major tick marks. The active sign (Sun's current
// sign) gets a highlight ring; all others are shown at reduced opacity.

interface ZodiacSymbolsProps {
  activeIndex: number;
  onSignClick?: (index: number) => void;
}

const ZodiacSymbols: React.FC<ZodiacSymbolsProps> = ({ activeIndex, onSignClick }) => {
  // Connector line: from just outside the ring outer edge to just before the symbol
  const lineStart = RING_RADIUS + RING_WIDTH / 2 + 2;
  const lineEnd   = ICON_R - 13;
  return (
    <>
      {ZODIAC_DATA.map((sign, i) => {
        // Position at the START of each sign (aligns with major ring ticks)
        const a        = (i / 12) * 2 * Math.PI + START_ANGLE;
        const x        = CX + ICON_R * Math.cos(a);
        const y        = CY + ICON_R * Math.sin(a);
        const color    = ZODIAC_COLORS[i].hex;
        const isActive = i === activeIndex;
        return (
          <g
            key={sign.name}
            onClick={() => onSignClick?.(i)}
            style={{ cursor: onSignClick ? 'pointer' : undefined }}
          >
            {/* Connector line from ring edge to symbol */}
            <line
              x1={CX + lineStart * Math.cos(a)} y1={CY + lineStart * Math.sin(a)}
              x2={CX + lineEnd   * Math.cos(a)} y2={CY + lineEnd   * Math.sin(a)}
              stroke={color}
              strokeWidth={1}
              opacity={0.45}
            />
            {/* Highlight ring for the Sun’s current sign */}
            {isActive && (
              <circle
                cx={x} cy={y} r={11}
                fill="none"
                stroke={color} strokeWidth={1.5} opacity={0.85}
              />
            )}
            <text
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="12"
              fill={color}
              opacity={isActive ? 1 : 0.72}
            >
              {sign.symbol}
            </text>
          </g>
        );
      })}
    </>
  );
};

// ---- Planet hands (rendered as children) --------------------
// Each planet is a line from the center with its symbol at the tip.

interface PlanetHandsProps {
  lons: Record<string, number>;
}

const PlanetHands: React.FC<PlanetHandsProps> = ({ lons }) => (
  <>
    {PLANETS.map(planet => {
      const lon = lons[planet.key];
      if (lon === undefined) return null;
      const a       = (lon / 360) * 2 * Math.PI + START_ANGLE;
      const handR   = SUN_HAND_R * planet.lengthFraction;
      const symbolR = handR + 10; // symbol floats slightly past the tip
      return (
        <g key={planet.key}>
          <line
            x1={CX} y1={CY}
            x2={CX + handR * Math.cos(a)}
            y2={CY + handR * Math.sin(a)}
            stroke={planet.color}
            strokeWidth={planet.strokeWidth}
            strokeLinecap="round"
            opacity={0.8}
          />
          <text
            x={CX + symbolR * Math.cos(a)}
            y={CY + symbolR * Math.sin(a)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="9"
            fill={planet.color}
            opacity={0.9}
          >
            {planet.symbol}
          </text>
        </g>
      );
    })}
  </>
);

// ---- Component ----------------------------------------------

export interface AstroClockProps {
  date: Date;
  /** Override for the highlighted icon; defaults to the computed Sun-sign when not provided */
  activeIconIndex?: number;
  onSignClick?: (index: number) => void;
}

export const AstroClock: React.FC<AstroClockProps> = ({ date, activeIconIndex: activeOverride, onSignClick }) => {
  const lons          = calcPlanetLongitudes(date);
  const sunLon        = lons.Sun ?? 0;
  const sunPos        = sunLon / 360;
  const activeSunSign = Math.floor(sunLon / 30) % 12;
  // Use the parent-provided index (user selection) or fall back to the Sun's sign
  const effectiveActive = activeOverride ?? activeSunSign;

  return (
    <RadialClock
      handPos={sunPos}
      colorStops={ZODIAC_COLORS}
      // 36 ticks = one per 10°; major tick at each sign boundary (every 3 ticks)
      ticks={36}
      majorTicks={Array.from({ length: 12 }, (_, i) => i * 3)}
      labels={[]}       // signs rendered interactively in children below
      sectors={[]}
      icons={[]}
      startAngleOffset={START_ANGLE}
      size={SIZE}
      ringRadius={RING_RADIUS}
      ringWidth={RING_WIDTH}
      iconOffset={ICON_OFFSET}
      innerCircleRadius={33}
      idPrefix="astro"
    >
      {/* Clickable zodiac sign symbols inside the ring */}
      <ZodiacSymbols activeIndex={effectiveActive} onSignClick={onSignClick} />
      {/* Planet position hands */}
      <PlanetHands lons={lons} />
    </RadialClock>
  );
};

export default AstroClock;
