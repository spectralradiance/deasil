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

// ---- Zodiac element colors — one flat color per element ----
// Paired stops (start + end-ε) produce solid bands with sharp boundaries.
const FIRE  = '#EE3311';
const EARTH = '#44AA44';
const AIR   = '#DDCC22';
const WATER = '#2288BB';
const SIGN_ELEMENTS = [FIRE, EARTH, AIR, WATER, FIRE, EARTH, AIR, WATER, FIRE, EARTH, AIR, WATER];
const ZODIAC_COLORS: ColorStop[] = SIGN_ELEMENTS.flatMap((color, i) => [
  { pos: i / 12,            hex: color },
  { pos: (i + 1) / 12 - 0.001, hex: color },
]);

// ---- Planet orbit ring data --------------------------------
// Planets ordered from fastest (Moon, inner ring) to slowest (Neptune, outer).
// orbitR: SVG radius of the orbit ring, evenly spaced inward from the zodiac ring.
const PLANET_RINGS: { key: string; symbol: string; color: string; orbitR: number }[] = [
  { key: 'Moon',    symbol: '\u263D\uFE0E', color: '#C0C0C0', orbitR: 16 },
  { key: 'Mercury', symbol: '\u263F\uFE0E', color: '#B8860B', orbitR: 26 },
  { key: 'Venus',   symbol: '\u2640\uFE0E', color: '#FFB6C1', orbitR: 36 },
  { key: 'Mars',    symbol: '\u2642\uFE0E', color: '#FF6644', orbitR: 46 },
  { key: 'Jupiter', symbol: '\u2643\uFE0E', color: '#FFA500', orbitR: 56 },
  { key: 'Saturn',  symbol: '\u2644\uFE0E', color: '#C09060', orbitR: 66 },
  { key: 'Uranus',  symbol: '\u2645\uFE0E', color: '#40E0D0', orbitR: 76 },
  { key: 'Neptune', symbol: '\u2646\uFE0E', color: '#6495ED', orbitR: 86 },
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
// 0° Aries at the top (12-o’clock)
const START_ANGLE  = -Math.PI / 2;
// Extra space outside the ring for the zodiac symbol markers
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
  const lineStart = RING_RADIUS + RING_WIDTH / 2;
  const lineEnd   = RING_RADIUS + RING_WIDTH;
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
              strokeWidth={2}
              opacity={0.45}
            />
            {/* Highlight ring for the Sun’s current sign */}
            {isActive && (
              <circle
                cx={x} cy={y} r={16}
                fill="none"
                stroke={color} strokeWidth={1.5} opacity={0.85}
              />
            )}
          {/* Symbol in white/neutral — text rendering forced by VS-15 */}
          <text
            x={x} y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="16"
            fill="currentColor"
          >
              {sign.symbol}
            </text>
          </g>
        );
      })}
    </>
  );
};

// ---- Planet orbit rings (rendered as children) -------------
// Each planet: a faint circular orbit ring + its symbol at the
// current ecliptic longitude position on that ring.

interface PlanetRingsProps {
  lons: Record<string, number>;
}

const PlanetRings: React.FC<PlanetRingsProps> = ({ lons }) => (
  <>
    {PLANET_RINGS.map(planet => {
      const lon = lons[planet.key];
      if (lon === undefined) return null;
      const a  = (lon / 360) * 2 * Math.PI + START_ANGLE;
      const ix = CX + planet.orbitR * Math.cos(a);
      const iy = CY + planet.orbitR * Math.sin(a);
      return (
        <g key={planet.key}>
          {/* Faint orbit ring */}
          <circle
            cx={CX} cy={CY} r={planet.orbitR}
            fill="none"
            stroke={planet.color}
            strokeWidth={0.5}
            opacity={0.2}
          />
          {/* Planet symbol at current ecliptic longitude */}
          <text
            x={ix} y={iy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="13"
            fill={planet.color}
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
      // 36 ticks = one per 10°, all uniform (no major-tick grouping at sign boundaries)
      ticks={36}
      majorTicks={[]}
      labels={[]}       // signs rendered interactively as children below
      sectors={[]}
      icons={[]}
      startAngleOffset={START_ANGLE}
      size={SIZE}
      ringRadius={RING_RADIUS}
      ringWidth={RING_WIDTH}
      iconOffset={ICON_OFFSET}
      innerCircleRadius={0}
      idPrefix="astro"
    >
      {/* Planet orbit rings with symbol markers */}
      <PlanetRings lons={lons} />
      {/* Sun symbol at the tip of the main hand */}
      {(() => {
        const a = sunPos * 2 * Math.PI + START_ANGLE;
        return (
          <text
            x={CX + SUN_HAND_R * Math.cos(a)}
            y={CY + SUN_HAND_R * Math.sin(a)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="11"
            fill="#FFD700"
          >
            &#x2609;&#xFE0E;
          </text>
        );
      })()}
      {/* Clickable zodiac sign symbols outside the ring */}
      <ZodiacSymbols activeIndex={effectiveActive} onSignClick={onSignClick} />
    </RadialClock>
  );
};

export default AstroClock;
