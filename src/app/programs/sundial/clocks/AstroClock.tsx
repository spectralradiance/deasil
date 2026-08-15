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
import { Box } from '@mui/material';
import RadialClock, { ColorStop } from './RadialClock';
import { calcPlanetLongitudes, calcAspects } from '../lib/astro';

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

// ---- Zodiac colors — richer per-sign palette, still element-grouped ----
// Paired stops (start + end-ε) produce solid bands with sharp boundaries.
const FIRE  = '#D94040';
const EARTH = '#4A7A30';
const AIR   = '#C8A820';
const WATER = '#2050A8';
// Individual sign colors within each element family
const SIGN_COLORS = [
  '#D94040', // Aries        — cardinal fire
  '#3D8A3A', // Taurus       — fixed earth
  '#C8B020', // Gemini       — mutable air
  '#2060B8', // Cancer       — cardinal water
  '#E06820', // Leo          — fixed fire
  '#5A9040', // Virgo        — mutable earth
  '#90C830', // Libra        — cardinal air
  '#3A2F8A', // Scorpio      — fixed water
  '#C02828', // Sagittarius  — mutable fire
  '#8A5A18', // Capricorn    — cardinal earth
  '#30A8C8', // Aquarius     — fixed air
  '#6030A0', // Pisces       — mutable water
];
const ZODIAC_COLORS: ColorStop[] = SIGN_COLORS.flatMap((color, i) => [
  { pos: i / 12,                hex: color },
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

// ---- Planet symbol & color maps ----------------------------
const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉︎', Moon: '☽︎', Mercury: '☿︎', Venus: '♀︎', Mars: '♂︎',
  Jupiter: '♃︎', Saturn: '♄︎', Uranus: '♅︎', Neptune: '♆︎',
};
const PLANET_COLORS: Record<string, string> = {
  Sun: '#FFD700', Moon: '#C0C0C0', Mercury: '#B8860B', Venus: '#FFB6C1',
  Mars: '#FF6644', Jupiter: '#FFA500', Saturn: '#C09060', Uranus: '#40E0D0', Neptune: '#6495ED',
};

// ---- Shared layout constants --------------------------------
const SIZE         = 280;
const CX           = SIZE / 2;
const CY           = SIZE / 2;
const RING_RADIUS  = 100;
const RING_WIDTH   = 12;
const SUN_HAND_R   = RING_RADIUS - RING_WIDTH / 2 - 2;  // = 92
const START_ANGLE  = -Math.PI / 2;
const ICON_OFFSET  = 30;
const ICON_R       = RING_RADIUS + RING_WIDTH / 2 + ICON_OFFSET; // = 136

// Aspect chord visual properties
const ASPECT_COLOR: Record<string, string> = {
  Conjunction: '#AAAAAA', Sextile: '#1976D2', Square: '#D32F2F',
  Trine: '#388E3C', Opposition: '#D32F2F',
};
const ASPECT_MAX_ORB: Record<string, number> = {
  Conjunction: 8, Sextile: 6, Square: 8, Trine: 8, Opposition: 8,
};

// Glyph placement: track 0 = r 74, ±1 = ±12, ±2 = ±24
const MIN_SEP_DEG  = 11;
const WEB_R        = 88;
const RING_INNER_R = RING_RADIUS - RING_WIDTH / 2; // 94
function trackRadius(track: number) { return 74 + track * 12; }

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
        // Position at CENTER of each sign's arc band
        const a        = ((i + 0.5) / 12) * 2 * Math.PI + START_ANGLE;
        const x        = CX + ICON_R * Math.cos(a);
        const y        = CY + ICON_R * Math.sin(a);
        const color    = SIGN_COLORS[i];
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
            fontSize="18"
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

// ---- Track assignment — greedy radial staggering -----------
function assignTracks(lons: Record<string, number>): Map<string, number> {
  const sorted = Object.entries(lons)
    .filter(([k]) => k !== 'Sun')
    .sort(([, a], [, b]) => a - b);
  const placed: { lon: number; track: number }[] = [];
  const result = new Map<string, number>();
  for (const [name, lon] of sorted) {
    let assigned = false;
    for (const track of [-2, -1, 0, 1]) {
      const clear = placed
        .filter(p => p.track === track)
        .every(p => {
          const diff = Math.abs(((lon - p.lon) % 360 + 360) % 360);
          return Math.min(diff, 360 - diff) >= MIN_SEP_DEG;
        });
      if (clear) {
        result.set(name, track);
        placed.push({ lon, track });
        assigned = true;
        break;
      }
    }
    if (!assigned) result.set(name, 0);
  }
  return result;
}

// ---- AspectWeb — major aspect chord lines in center ---------
const AspectWeb: React.FC<{ lons: Record<string, number> }> = ({ lons }) => {
  const aspects = calcAspects(lons);
  return (
    <>
      <defs>
        {/* Clip aspect lines to the inner boundary circle */}
        <clipPath id="aspect-clip">
          <circle cx={CX} cy={CY} r={WEB_R - 0.5} />
        </clipPath>
      </defs>
      <circle cx={CX} cy={CY} r={WEB_R}
        fill="none" stroke="currentColor" strokeWidth={0.3} opacity={0.15} />
      <g clipPath="url(#aspect-clip)">
        {aspects.map(asp => {
          const a1 = (lons[asp.body1] / 360) * 2 * Math.PI + START_ANGLE;
          const a2 = (lons[asp.body2] / 360) * 2 * Math.PI + START_ANGLE;
          const color   = ASPECT_COLOR[asp.type];
          const maxOrb  = ASPECT_MAX_ORB[asp.type];
          const tight   = 1 - asp.orb / maxOrb;
          const opacity = 0.25 + tight * 0.75;
          const sw      = 0.5  + tight * 1.5;
          return (
            <line
              key={`${asp.body1}-${asp.body2}-${asp.type}`}
              x1={CX + WEB_R * Math.cos(a1)} y1={CY + WEB_R * Math.sin(a1)}
              x2={CX + WEB_R * Math.cos(a2)} y2={CY + WEB_R * Math.sin(a2)}
              stroke={color} strokeWidth={sw} strokeOpacity={opacity}
            />
          );
        })}
      </g>
    </>
  );
};

// ---- PlanetGlyphs — staggered symbols with degree ticks -----
const PlanetGlyphs: React.FC<{ lons: Record<string, number> }> = ({ lons }) => {
  const tracks = assignTracks(lons);
  return (
    <>
      <defs>
        {/* Dark dropshadow keeps planet glyphs legible over aspect lines */}
        <filter id="planet-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.8" floodColor="#000000" floodOpacity="0.85" />
        </filter>
      </defs>
      {Object.entries(lons)
        .filter(([k]) => k !== 'Sun')
        .map(([name, lon]) => {
          const track  = tracks.get(name) ?? 0;
          const r      = trackRadius(track);
          const a      = (lon / 360) * 2 * Math.PI + START_ANGLE;
          const gx     = CX + r * Math.cos(a);
          const gy     = CY + r * Math.sin(a);
          const color  = PLANET_COLORS[name] ?? '#FFFFFF';
          const tickX1 = CX + (RING_INNER_R - 6) * Math.cos(a);
          const tickY1 = CY + (RING_INNER_R - 6) * Math.sin(a);
          const tickX2 = CX + (RING_INNER_R - 1) * Math.cos(a);
          const tickY2 = CY + (RING_INNER_R - 1) * Math.sin(a);
          return (
            <g key={name}>
              {/* Degree tick at inner ring edge */}
              <line x1={tickX1} y1={tickY1} x2={tickX2} y2={tickY2}
                stroke={color} strokeWidth={1} opacity={0.75} />
              {/* Leader line from glyph to tick */}
              <line x1={gx} y1={gy} x2={tickX1} y2={tickY1}
                stroke={color} strokeWidth={0.4} opacity={0.3} />
              <text x={gx} y={gy}
                textAnchor="middle" dominantBaseline="central"
                fontSize="11" fill={color}
                filter="url(#planet-shadow)">
                {PLANET_SYMBOLS[name]}
              </text>
            </g>
          );
        })}
    </>
  );
};

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
      colorStops={ZODIAC_COLORS}
      ticks={36}
      majorTicks={[]}
      labels={[]}
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
      {/* Major aspect chord web */}
      <AspectWeb lons={lons} />
      {/* Staggered planet glyphs with degree tick marks */}
      <PlanetGlyphs lons={lons} />
      {/* Sun glyph at hand tip */}
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

// ---- PlanetaryPositionsTable --------------------------------
const PLANET_ORDER = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune'];

export const PlanetaryPositionsTable: React.FC<{ date: Date }> = ({ date }) => {
  const lons = calcPlanetLongitudes(date);
  return (
    <Box component="table" sx={{ borderCollapse: 'collapse', lineHeight: 1.7 }}>
      <Box component="tbody">
        {PLANET_ORDER.filter(k => lons[k] !== undefined).map(name => {
          const lon       = lons[name];
          const signIdx   = Math.floor(lon / 30);
          const degInSign = Math.floor(lon % 30);
          const minutes   = Math.floor(((lon % 30) - degInSign) * 60);
          const sign      = ZODIAC_DATA[signIdx];
          return (
            <Box component="tr" key={name}>
              <Box component="td" sx={{ pr: 0.75, color: PLANET_COLORS[name], textAlign: 'center' }}>
                {PLANET_SYMBOLS[name]}
              </Box>
              <Box component="td" sx={{ pr: 1, color: 'text.secondary', fontSize: '0.72rem' }}>
                {name}
              </Box>
              <Box component="td" sx={{ pr: 0.5, color: SIGN_COLORS[signIdx] }}>
                {sign.symbol}
              </Box>
              <Box component="td" sx={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                {degInSign}°{minutes.toString().padStart(2, '0')}′
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// ---- ElementModalitySummary ---------------------------------
const ELEMENT_SIGN_SETS: Record<string, number[]> = {
  Fire:  [0, 4, 8],
  Earth: [1, 5, 9],
  Air:   [2, 6, 10],
  Water: [3, 7, 11],
};
const MODALITY_SIGN_SETS: Record<string, number[]> = {
  Cardinal: [0, 3, 6, 9],
  Fixed:    [1, 4, 7, 10],
  Mutable:  [2, 5, 8, 11],
};
const ELEMENT_COLOR_MAP: Record<string, string> = {
  Fire: '#D94040', Earth: '#4A7A30', Air: '#C8A820', Water: '#2050A8',
};

export const ElementModalitySummary: React.FC<{ date: Date }> = ({ date }) => {
  const lons      = calcPlanetLongitudes(date);
  const signIdxes = Object.values(lons).map(lon => Math.floor(lon / 30));
  const tally     = (sets: Record<string, number[]>) =>
    Object.entries(sets).map(([name, idxes]) => ({
      name, count: signIdxes.filter(s => idxes.includes(s)).length,
    }));
  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 0.5 }}>
        {tally(ELEMENT_SIGN_SETS).map(({ name, count }) => (
          <Box key={name} sx={{ textAlign: 'center', minWidth: 34 }}>
            <Box sx={{ color: ELEMENT_COLOR_MAP[name], fontWeight: 600, fontSize: '0.85rem' }}>{count}</Box>
            <Box sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>{name}</Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        {tally(MODALITY_SIGN_SETS).map(({ name, count }) => (
          <Box key={name} sx={{ textAlign: 'center', minWidth: 42 }}>
            <Box sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{count}</Box>
            <Box sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>{name}</Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default AstroClock;

// ---- AspectsTable ------------------------------------------

const ASPECT_SYMBOLS: Record<string, string> = {
  Conjunction: '\u260C\uFE0E',
  Sextile:     '\u26B9',
  Square:      '\u25A1',
  Trine:       '\u25B3',
  Opposition:  '\u260D\uFE0E',
};

export const AspectsTable: React.FC<{ date: Date }> = ({ date }) => {
  const lons    = calcPlanetLongitudes(date);
  const aspects = calcAspects(lons).sort((a, b) => a.orb - b.orb);
  if (aspects.length === 0) return null;
  return (
    <Box component="table" sx={{ borderCollapse: 'collapse', lineHeight: 1.65, mt: 0.5 }}>
      <Box component="tbody">
        {aspects.map((asp, i) => {
          const color = ASPECT_COLOR[asp.type];
          return (
            <Box component="tr" key={i}>
              <Box component="td" sx={{ pr: 0.5, color: PLANET_COLORS[asp.body1], textAlign: 'center' }}>
                {PLANET_SYMBOLS[asp.body1]}
              </Box>
              <Box component="td" sx={{ pr: 0.75, color: 'text.secondary', fontSize: '0.72rem' }}>
                {asp.body1}
              </Box>
              <Box component="td" sx={{ px: 0.5, color, textAlign: 'center', fontSize: '1rem', lineHeight: 1 }}>
                {ASPECT_SYMBOLS[asp.type]}
              </Box>
              <Box component="td" sx={{ pr: 0.5, pl: 0.5, color: PLANET_COLORS[asp.body2], textAlign: 'center' }}>
                {PLANET_SYMBOLS[asp.body2]}
              </Box>
              <Box component="td" sx={{ pr: 0.75, color: 'text.secondary', fontSize: '0.72rem' }}>
                {asp.body2}
              </Box>
              <Box component="td" sx={{ color, fontSize: '0.65rem', fontVariantNumeric: 'tabular-nums', opacity: 0.8 }}>
                {asp.type}
              </Box>
              <Box component="td" sx={{ pl: 0.75, color: 'text.secondary', fontSize: '0.65rem', fontVariantNumeric: 'tabular-nums' }}>
                {asp.orb.toFixed(1)}°
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
