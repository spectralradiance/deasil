// ============================================================
// AstroClock.tsx — Astrological zodiac clock using RadialClock
//
// The ring is divided into 12 zodiac sign segments colored by
// element, running counter-clockwise from 0° Aries at the top as
// an astrological chart does. Outside it, a calendar collar marks
// where the civil months fall against the same ecliptic.
//
// Two renderings of the same positions are available:
//   • 'wheel' — every body on one band, staggered radially,
//     with a web of chords for the major aspects.
//   • 'rings' — each body on its own concentric orbit ring,
//     in classical geocentric order with the Earth at center.
//
// Positions are geocentric tropical longitudes from lib/astro.
// ============================================================
'use client';

import React, { useMemo } from 'react';
import { Box, useTheme } from '@mui/material';
import RadialClock, { ColorStop } from './RadialClock';
import { calcPlanetLongitudes, calcAspects, calcRetrogrades, CHART_BODIES } from '../lib/astro';

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

// ---- Zodiac colors — one hue per element, repeating three times ----
//
// The band is the scale, not the data: the planet glyphs sit on top of it and
// have to stay the loudest thing on the dial. So it carries four colors, not
// twelve — elements cycle Fire → Earth → Air → Water around the whole wheel,
// and sign identity comes from the glyphs and ticks rather than from a hue of
// its own.
//
// Each theme has its own steps of the same four hues. Both sets clear the
// lightness band, chroma floor, CVD separation, normal-vision floor and
// contrast gates on every pair, in both themes.
//
// Fire and Earth are the delicate pair: they are adjacent on the wheel
// (Aries -> Taurus) and red/green is exactly what protan and deutan vision
// collapse — and the redder Fire gets, the darker it simulates, closing the
// gap further. They are held apart by LIGHTNESS, and Earth sits at a green
// leaning slightly toward emerald rather than grass; that hue is what buys
// the separation back. Shifting Earth much below ~150 deg or Fire much below
// ~36 deg drops the pair under the CVD threshold, so re-validate if either
// moves.
export const ELEMENTS = ['Fire', 'Earth', 'Air', 'Water'] as const;
export type Element = typeof ELEMENTS[number];

const ELEMENT_PALETTE: Record<'light' | 'dark', Record<Element, string>> = {
  light: { Fire: '#dc4d04', Earth: '#028758', Air: '#8d77c0', Water: '#1063ae' },
  dark:  { Fire: '#ea5b1e', Earth: '#009561', Air: '#9a86cc', Water: '#266fb8' },
};

/** Element of sign `i` — they cycle in step with the wheel */
export const signElement = (i: number): Element => ELEMENTS[i % 4];

export const MODALITIES = ['Cardinal', 'Fixed', 'Mutable'] as const;
export type Modality = typeof MODALITIES[number];

/** Modality of sign i — the three cycle alongside the four elements, so every
 *  sign lands on a unique element/modality pair over the twelve. */
export const signModality = (i: number): Modality => MODALITIES[i % 3];

/** The element colors for the active theme */
export function useElementColors(): Record<Element, string> {
  return ELEMENT_PALETTE[useDark() ? 'dark' : 'light'];
}

/** The 12 band colors for a theme (four element hues, each used three times) */
function signColors(mode: 'light' | 'dark'): string[] {
  const pal = ELEMENT_PALETTE[mode];
  return Array.from({ length: 12 }, (_, i) => pal[signElement(i)]);
}

/** Paired stops (start + end-ε) produce solid bands with sharp boundaries */
function zodiacStops(colors: string[]): ColorStop[] {
  return colors.flatMap((color, i) => [
    { pos: i / 12,               hex: color },
    { pos: (i + 1) / 12 - 0.001, hex: color },
  ]);
}

// ---- Planet symbol & color maps ----------------------------
const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉︎', Moon: '☽︎', Mercury: '☿︎', Venus: '♀︎', Mars: '♂︎',
  Jupiter: '♃︎', Saturn: '♄︎', Uranus: '♅︎', Neptune: '♆︎',
};
// The planets are the data layer and have to stay the loudest thing on the
// dial, so they get their own steps per theme — the traditional dark-background
// metals wash out completely on white.
const PLANET_PALETTE: Record<'light' | 'dark', Record<string, string>> = {
  dark: {
    Sun: '#FFD700', Moon: '#C0C0C0', Mercury: '#B8860B', Venus: '#FFB6C1',
    Mars: '#FF6644', Jupiter: '#FFA500', Saturn: '#C09060', Uranus: '#40E0D0', Neptune: '#6495ED',
  },
  light: {
    Sun: '#A67C00', Moon: '#6E6E6E', Mercury: '#7A5C08', Venus: '#B0436A',
    Mars: '#C6341A', Jupiter: '#B26B00', Saturn: '#7A5A34', Uranus: '#0E8C80', Neptune: '#2B5FBF',
  },
};
const RETROGRADE_SYMBOL = '℞';

// ---- Shared layout constants --------------------------------
const SIZE         = 280;
const CX           = SIZE / 2;
const CY           = SIZE / 2;
const RING_RADIUS  = 100;
const RING_WIDTH   = 12;
const SUN_HAND_R   = RING_RADIUS - RING_WIDTH / 2 - 2;  // = 92
const START_ANGLE  = -Math.PI / 2;
const ICON_OFFSET  = 34;
const ICON_R       = RING_RADIUS + RING_WIDTH / 2 + ICON_OFFSET; // = 140

// Calendar collar: a thin neutral band outside the zodiac ring
const MONTH_R       = 114;
const MONTH_WIDTH   = 8;
const MONTH_INNER_R = MONTH_R - MONTH_WIDTH / 2;
const MONTH_OUTER_R = MONTH_R + MONTH_WIDTH / 2;
const TAU           = Math.PI * 2;

// Standard chart wheels run counter-clockwise: Aries → Taurus → Gemini …
const CHART_DIRECTION: -1 = -1;

/** Ecliptic longitude (degrees) → SVG angle (radians) on the chart face */
function lonToAngle(lon: number): number {
  return CHART_DIRECTION * (lon / 360) * 2 * Math.PI + START_ANGLE;
}

// Ring ticks every 10°, with the 12 sign boundaries drawn long
const RING_TICKS       = 36;
const SIGN_BOUNDARIES  = Array.from({ length: 12 }, (_, i) => i * 3);

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Where each civil month starts and ends on the ecliptic, for a given year.
 *  Months are measured, not assumed: because the Sun enters a sign around the
 *  20th, a month boundary lands roughly a third of the way into a sign, and
 *  that offset is the interesting part.
 */
function monthArcs(year: number): { name: string; startLon: number; endLon: number }[] {
  return MONTH_NAMES.map((name, m) => ({
    name,
    startLon: calcPlanetLongitudes(new Date(year, m, 1)).Sun,
    endLon:   calcPlanetLongitudes(new Date(year, m + 1, 1)).Sun,
  }));
}

/** Filled annulus segment between two angles, counter-clockwise */
function bandPath(rIn: number, rOut: number, a0: number, a1: number): string {
  const span = TAU - (((a1 - a0) % TAU) + TAU) % TAU;
  const large = span > Math.PI ? 1 : 0;
  return [
    `M ${CX + rIn  * Math.cos(a0)} ${CY + rIn  * Math.sin(a0)}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${CX + rIn  * Math.cos(a1)} ${CY + rIn  * Math.sin(a1)}`,
    `L ${CX + rOut * Math.cos(a1)} ${CY + rOut * Math.sin(a1)}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${CX + rOut * Math.cos(a0)} ${CY + rOut * Math.sin(a0)}`,
    'Z',
  ].join(' ');
}

// Aspect chord visual properties
const ASPECT_PALETTE: Record<'light' | 'dark', Record<string, string>> = {
  dark: {
    Conjunction: '#9C9C9C', Sextile: '#4A8FC0', Square: '#C25F52',
    Trine: '#5F9A6C', Opposition: '#C25F52',
  },
  light: {
    Conjunction: '#6E6E6E', Sextile: '#2F6FA0', Square: '#A8402F',
    Trine: '#3E7A4C', Opposition: '#A8402F',
  },
};

/** Whether the app is on its dark theme — used for every step below */
function useDark(): boolean {
  const theme = useTheme();
  return theme.palette.mode === 'dark';
}
const ASPECT_MAX_ORB: Record<string, number> = {
  Conjunction: 8, Sextile: 6, Square: 8, Trine: 8, Opposition: 8,
};

// Glyph placement: track 0 = r 74, ±1 = ±12, ±2 = ±24
const MIN_SEP_DEG  = 11;
const WEB_R        = 88;
const RING_INNER_R = RING_RADIUS - RING_WIDTH / 2; // 94
function trackRadius(track: number) { return 74 + track * 12; }

// Concentric-rings view: one orbit ring per body, innermost sphere first
const ORBIT_INNER_R = 20;
const ORBIT_OUTER_R = 86;
const ORBIT_STEP    = (ORBIT_OUTER_R - ORBIT_INNER_R) / (CHART_BODIES.length - 1);
function orbitRadius(index: number) { return ORBIT_INNER_R + index * ORBIT_STEP; }

export type AstroView = 'wheel' | 'rings';

// ---- Zodiac symbols (interactive, rendered as children) -----
// Sign symbols sit OUTSIDE the ring at each sign's center angle.
// The active sign (Sun's current sign) gets a highlight ring.

interface ZodiacSymbolsProps {
  activeIndex: number;
  colors: string[];
  onSignClick?: (index: number) => void;
}

const ZodiacSymbols: React.FC<ZodiacSymbolsProps> = ({ activeIndex, colors, onSignClick }) => {
  // Connector line: from outside the calendar collar to just before the symbol
  const lineStart = MONTH_OUTER_R + 2;
  const lineEnd   = MONTH_OUTER_R + 8;
  return (
    <>
      {ZODIAC_DATA.map((sign, i) => {
        // Position at CENTER of each sign's arc band
        const a        = lonToAngle((i + 0.5) * 30);
        const x        = CX + ICON_R * Math.cos(a);
        const y        = CY + ICON_R * Math.sin(a);
        const color    = colors[i];
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

// ---- MonthCollar — civil calendar against the same ecliptic --
// Deliberately neutral: the elements own the color on this dial, and the
// calendar is a reference scale sitting beside them, not another category.
const MonthCollar: React.FC<{ year: number }> = ({ year }) => {
  const months = useMemo(() => monthArcs(year), [year]);
  return (
    <g>
      {months.map((mo, i) => {
        const a0  = lonToAngle(mo.startLon);
        const a1  = lonToAngle(mo.endLon);
        // Midpoint of the arc, stepping the short way round
        const mid = lonToAngle(mo.startLon + ((((mo.endLon - mo.startLon) % 360) + 360) % 360) / 2);
        return (
          <g key={mo.name}>
            <path
              d={bandPath(MONTH_INNER_R, MONTH_OUTER_R, a0, a1)}
              fill="currentColor"
              opacity={i % 2 === 0 ? 0.05 : 0.018}
            />
            {/* Boundary tick at the start of the month */}
            <line
              x1={CX + MONTH_INNER_R * Math.cos(a0)} y1={CY + MONTH_INNER_R * Math.sin(a0)}
              x2={CX + MONTH_OUTER_R * Math.cos(a0)} y2={CY + MONTH_OUTER_R * Math.sin(a0)}
              stroke="currentColor" strokeWidth={0.5} opacity={0.22}
            />
            {/* Upright label — never rotated, so nothing reads upside down */}
            <text
              x={CX + MONTH_R * Math.cos(mid)} y={CY + MONTH_R * Math.sin(mid)}
              textAnchor="middle" dominantBaseline="central"
              fontSize="6.5" fill="currentColor" opacity={0.72}
            >
              {mo.name}
            </text>
          </g>
        );
      })}
      <circle cx={CX} cy={CY} r={MONTH_OUTER_R} fill="none"
        stroke="currentColor" strokeWidth={0.4} opacity={0.1} />
    </g>
  );
};

// ---- Shared defs -------------------------------------------
// A halo in the page's own background colour keeps planet glyphs legible where
// they cross aspect lines and orbit rings.
const GlyphShadow: React.FC<{ id: string; dark: boolean }> = ({ id, dark }) => (
  <defs>
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="0" stdDeviation="1.8"
        floodColor={dark ? '#000000' : '#ffffff'} floodOpacity={dark ? 0.85 : 0.95} />
    </filter>
  </defs>
);

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
const AspectWeb: React.FC<{ lons: Record<string, number>; colors: Record<string, string> }> = ({ lons, colors }) => {
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
          const a1 = lonToAngle(lons[asp.body1]);
          const a2 = lonToAngle(lons[asp.body2]);
          const color   = colors[asp.type];
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
const PlanetGlyphs: React.FC<{
  lons: Record<string, number>;
  planetColors: Record<string, string>;
  dark: boolean;
}> = ({ lons, planetColors, dark }) => {
  const tracks = assignTracks(lons);
  return (
    <>
      <GlyphShadow id="planet-shadow" dark={dark} />
      {Object.entries(lons)
        .filter(([k]) => k !== 'Sun')
        .map(([name, lon]) => {
          const track  = tracks.get(name) ?? 0;
          const r      = trackRadius(track);
          const a      = lonToAngle(lon);
          const gx     = CX + r * Math.cos(a);
          const gy     = CY + r * Math.sin(a);
          const color  = planetColors[name] ?? 'currentColor';
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

// ---- OrbitRings — one concentric ring per body --------------
// Bodies run outward in classical geocentric order (Moon → Neptune) around an
// Earth at the center. A retrograde body's ring is drawn dashed. Each glyph
// carries a leader out to the zodiac band so its sign and degree stay readable.
const OrbitRings: React.FC<{
  lons: Record<string, number>;
  retrogrades: Record<string, boolean>;
  colors: string[];
  planetColors: Record<string, string>;
  dark: boolean;
}> = ({ lons, retrogrades, colors, planetColors, dark }) => (
  <>
    <GlyphShadow id="orbit-shadow" dark={dark} />

    {/* Sign-boundary spokes, so a body's sign can be read straight off its ring */}
    {ZODIAC_DATA.map((_, i) => {
      const a = lonToAngle(i * 30);
      return (
        <line
          key={`spoke-${i}`}
          x1={CX + 11 * Math.cos(a)} y1={CY + 11 * Math.sin(a)}
          x2={CX + RING_INNER_R * Math.cos(a)} y2={CY + RING_INNER_R * Math.sin(a)}
          stroke={colors[i]} strokeWidth={0.6} opacity={0.22}
        />
      );
    })}

    {/* Earth at the center — these are geocentric positions */}
    <circle cx={CX} cy={CY} r={7} fill="currentColor" fillOpacity={0.08}
      stroke="currentColor" strokeOpacity={0.35} strokeWidth={0.6} />
    <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central"
      fontSize="9" fill="currentColor" opacity={0.55}>
      &#x2295;&#xFE0E;
    </text>

    {CHART_BODIES.map((name, i) => {
      const lon   = lons[name];
      if (lon === undefined) return null;
      const r     = orbitRadius(i);
      const a     = lonToAngle(lon);
      const gx    = CX + r * Math.cos(a);
      const gy    = CY + r * Math.sin(a);
      const color = planetColors[name] ?? 'currentColor';
      const retro = retrogrades[name];
      return (
        <g key={name}>
          {/* The body's orbit ring; dashed while it is retrograde */}
          <circle
            cx={CX} cy={CY} r={r}
            fill="none" stroke={color} strokeWidth={0.6}
            strokeOpacity={0.3}
            strokeDasharray={retro ? '2 3' : undefined}
          />
          {/* Leader from the body out to the zodiac band, ending in a degree tick */}
          <line
            x1={gx} y1={gy}
            x2={CX + (RING_INNER_R - 6) * Math.cos(a)} y2={CY + (RING_INNER_R - 6) * Math.sin(a)}
            stroke={color} strokeWidth={0.4} opacity={0.3}
          />
          <line
            x1={CX + (RING_INNER_R - 6) * Math.cos(a)} y1={CY + (RING_INNER_R - 6) * Math.sin(a)}
            x2={CX + (RING_INNER_R - 1) * Math.cos(a)} y2={CY + (RING_INNER_R - 1) * Math.sin(a)}
            stroke={color} strokeWidth={1} opacity={0.75}
          />
          {/* The body itself, sitting on its ring */}
          <text
            x={gx} y={gy}
            textAnchor="middle" dominantBaseline="central"
            fontSize="9.5" fill={color}
            filter="url(#orbit-shadow)"
          >
            {PLANET_SYMBOLS[name]}
          </text>
        </g>
      );
    })}
  </>
);

// ---- Component ----------------------------------------------

export interface AstroClockProps {
  date: Date;
  /** Which rendering to use; defaults to the classic single-band wheel */
  view?: AstroView;
  /** Override for the highlighted icon; defaults to the computed Sun-sign when not provided */
  activeIconIndex?: number;
  onSignClick?: (index: number) => void;
}

export const AstroClock: React.FC<AstroClockProps> = ({
  date,
  view = 'wheel',
  activeIconIndex: activeOverride,
  onSignClick,
}) => {
  const dark          = useDark();
  const mode          = dark ? 'dark' : 'light';
  const colors        = signColors(mode);
  const planetColors  = PLANET_PALETTE[mode];
  const lons          = calcPlanetLongitudes(date);
  const sunLon        = lons.Sun ?? 0;
  const activeSunSign = Math.floor(sunLon / 30) % 12;
  // Use the parent-provided index (user selection) or fall back to the Sun's sign
  const effectiveActive = activeOverride ?? activeSunSign;
  const retrogrades   = view === 'rings' ? calcRetrogrades(date) : {};

  return (
    <RadialClock
      colorStops={zodiacStops(colors)}
      ticks={RING_TICKS}
      majorTicks={SIGN_BOUNDARIES}
      labels={[]}
      sectors={[]}
      icons={[]}
      startAngleOffset={START_ANGLE}
      direction={CHART_DIRECTION}
      size={SIZE}
      ringRadius={RING_RADIUS}
      ringWidth={RING_WIDTH}
      iconOffset={ICON_OFFSET}
      innerCircleRadius={0}
      idPrefix="astro"
    >
      {view === 'rings' ? (
        <OrbitRings lons={lons} retrogrades={retrogrades} colors={colors}
          planetColors={planetColors} dark={dark} />
      ) : (
        <>
          {/* Major aspect chord web */}
          <AspectWeb lons={lons} colors={ASPECT_PALETTE[mode]} />
          {/* Staggered planet glyphs with degree tick marks */}
          <PlanetGlyphs lons={lons} planetColors={planetColors} dark={dark} />
          {/* Sun glyph at hand tip */}
          {(() => {
            const a = lonToAngle(sunLon);
            return (
              <text
                x={CX + SUN_HAND_R * Math.cos(a)}
                y={CY + SUN_HAND_R * Math.sin(a)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="11"
                fill={planetColors.Sun}
              >
                &#x2609;&#xFE0E;
              </text>
            );
          })()}
        </>
      )}
      {/* Civil months, measured against the same ecliptic */}
      <MonthCollar year={date.getFullYear()} />
      {/* Clickable zodiac sign symbols outside the collar */}
      <ZodiacSymbols activeIndex={effectiveActive} colors={colors} onSignClick={onSignClick} />
    </RadialClock>
  );
};

// ---- PlanetaryPositionsTable --------------------------------
const PLANET_ORDER = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune'];

export const PlanetaryPositionsTable: React.FC<{ date: Date }> = ({ date }) => {
  const mode         = useDark() ? 'dark' : 'light';
  const colors       = signColors(mode);
  const planetColors = PLANET_PALETTE[mode];
  const lons         = calcPlanetLongitudes(date);
  const retro        = calcRetrogrades(date);
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
              <Box component="td" sx={{ pr: 0.75, color: planetColors[name], textAlign: 'center' }}>
                {PLANET_SYMBOLS[name]}
              </Box>
              <Box component="td" sx={{ pr: 1, color: 'text.secondary', fontSize: '0.72rem' }}>
                {name}
              </Box>
              <Box component="td" sx={{ pr: 0.5, color: colors[signIdx] }}>
                {sign.symbol}
              </Box>
              <Box component="td" sx={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                {degInSign}°{minutes.toString().padStart(2, '0')}′
              </Box>
              <Box component="td" sx={{ pl: 0.5, color: planetColors[name], fontSize: '0.72rem', opacity: 0.85 }}
                title={retro[name] ? `${name} is retrograde` : undefined}>
                {retro[name] ? RETROGRADE_SYMBOL : ''}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// ---- ElementModalitySummary ---------------------------------
const SIGN_INDEXES = Array.from({ length: 12 }, (_, i) => i);
const ELEMENT_SIGN_SETS: Record<string, number[]> = Object.fromEntries(
  ELEMENTS.map(el => [el, SIGN_INDEXES.filter(i => signElement(i) === el)]),
);
const MODALITY_SIGN_SETS: Record<string, number[]> = Object.fromEntries(
  MODALITIES.map(mo => [mo, SIGN_INDEXES.filter(i => signModality(i) === mo)]),
);
export const ElementModalitySummary: React.FC<{ date: Date }> = ({ date }) => {
  const elemColor = ELEMENT_PALETTE[useDark() ? 'dark' : 'light'];
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
            <Box sx={{ color: elemColor[name as Element], fontWeight: 600, fontSize: '0.85rem' }}>{count}</Box>
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
  Conjunction: '☌︎',
  Sextile:     '⚹',
  Square:      '□',
  Trine:       '△',
  Opposition:  '☍︎',
};

export const AspectsTable: React.FC<{ date: Date }> = ({ date }) => {
  const mode         = useDark() ? 'dark' : 'light';
  const planetColors = PLANET_PALETTE[mode];
  const aspectColors = ASPECT_PALETTE[mode];
  const lons    = calcPlanetLongitudes(date);
  const aspects = calcAspects(lons).sort((a, b) => a.orb - b.orb);
  if (aspects.length === 0) return null;
  return (
    <Box component="table" sx={{ borderCollapse: 'collapse', lineHeight: 1.65, mt: 0.5 }}>
      <Box component="tbody">
        {aspects.map((asp, i) => {
          const color = aspectColors[asp.type];
          return (
            <Box component="tr" key={i}>
              <Box component="td" sx={{ pr: 0.5, color: planetColors[asp.body1], textAlign: 'center' }}>
                {PLANET_SYMBOLS[asp.body1]}
              </Box>
              <Box component="td" sx={{ pr: 0.75, color: 'text.secondary', fontSize: '0.72rem' }}>
                {asp.body1}
              </Box>
              <Box component="td" sx={{ px: 0.5, color, textAlign: 'center', fontSize: '1rem', lineHeight: 1 }}>
                {ASPECT_SYMBOLS[asp.type]}
              </Box>
              <Box component="td" sx={{ pr: 0.5, pl: 0.5, color: planetColors[asp.body2], textAlign: 'center' }}>
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
