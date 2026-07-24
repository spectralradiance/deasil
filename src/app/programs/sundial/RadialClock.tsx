// ============================================================
// RadialClock.tsx — Generic radial/circular clock component
//
// Renders a circle with:
//   • A colored gradient ring (segments between keyColors)
//   • Tick marks at each division
//   • Labels (text) inside the ring at specified positions
//   • Sector text arcs (e.g. "Day", "Night") curved along the ring
//   • SVG icon markers placed outside the ring at arbitrary angles
//   • A single hand pointing from the center to the current value
// ============================================================
'use client';

import React from 'react';

// ---- Types --------------------------------------------------

/** One color stop that anchors the gradient ring at a fractional position (0–1) */
export interface ColorStop {
  pos: number;   // 0–1 fraction around the ring
  hex: string;   // CSS hex color, e.g. '#FF8C00'
}

/** A text label rendered inside the ring at a given fractional position */
export interface RingLabel {
  pos: number;    // 0–1 fraction around the ring
  text: string;   // displayed text
}

/** A filled arc sector with curved text, e.g. "Day", "Season" */
export interface RingSector {
  startPos: number;   // 0–1 fraction
  endPos: number;     // 0–1 fraction
  label: string;      // text along the arc
  color?: string;     // optional fill color
}

/** An SVG icon placed outside the ring at a given fractional position */
export interface RingIcon {
  pos: number;          // 0–1 fraction around the ring
  href: string;         // path to SVG/PNG image
  color?: string;       // tint color applied via SVG flood filter
  filterStyle?: string; // CSS filter string applied directly to the <image> element
                        // (e.g. 'brightness(0) invert(1)' to make icons white in dark mode)
  size?: number;        // icon size in SVG units (default 22)
  label?: string;       // optional text below the icon
}

export interface RadialClockProps {
  /** Current position of the hand, 0–1 fraction of the full cycle */
  handPos: number;

  /** Color stops that define the gradient ring.
   *  Positions should span 0–1; colors are linearly interpolated between stops.
   */
  colorStops: ColorStop[];

  /** Number of minor tick divisions around the ring */
  ticks: number;

  /** Which tick indices are "major" (longer tick, optional) */
  majorTicks?: number[];

  /** Text labels inside the ring */
  labels?: RingLabel[];

  /** Filled arc sectors with curved text (e.g. "Day", "Night") */
  sectors?: RingSector[];

  /** Icons placed outside the ring at given positions */
  icons?: RingIcon[];

  /** Angle offset in radians so that pos=0 maps to a specific clock position.
   *  Default: -Math.PI / 2 so that pos=0 is at the 12-o'clock (top).
   *  Use Math.PI / 2 to place pos=0 at the bottom.
   */
  startAngleOffset?: number;

  /** SVG viewBox size (square); default 200 */
  size?: number;

  /** Radius of the gradient ring; default 70 */
  ringRadius?: number;

  /** Width of the gradient ring stroke; default 8 */
  ringWidth?: number;

  /** Extra radial distance from ring edge to icon centers; default 28 */
  iconOffset?: number;

  /** Radius of the inner filled circle shown at the center of the clock face.
   *  Set to 0 (default) for no inner circle.
   *  When > 0, sector arc text is placed at the midpoint between this circle
   *  and the ring inner edge rather than just inside the ring.
   */
  innerCircleRadius?: number;

  /** Children rendered inside the SVG (e.g. custom moon phase overlay) */
  children?: React.ReactNode;

  /** Unique id prefix to avoid filter/gradient id collisions when multiple
   *  clocks are on the same page; default 'rc' */
  idPrefix?: string;
}

// ---- Helpers ------------------------------------------------

/** Convert a 0–1 position to radians, with an optional offset */
function posToRad(pos: number, offset: number): number {
  return pos * 2 * Math.PI + offset;
}

/** Interpolate a color at position `pos` across an array of ColorStops */
function interpolateColor(pos: number, stops: ColorStop[]): string {
  if (stops.length === 0) return '#ffffff';
  if (stops.length === 1) return stops[0].hex;

  // Normalize pos to [0, 1)
  const p = ((pos % 1) + 1) % 1;

  // Find the surrounding stops (wrapping)
  let lo = stops[stops.length - 1];
  let hi = stops[0];
  for (let i = 0; i < stops.length - 1; i++) {
    if (p >= stops[i].pos && p < stops[i + 1].pos) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }

  // Fractional distance between lo and hi
  const span = ((hi.pos - lo.pos + 1) % 1) || 1;
  const t = ((p - lo.pos + 1) % 1) / span;

  const parse = (h: string) => ({
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  });
  const c0 = parse(lo.hex);
  const c1 = parse(hi.hex);
  return `rgb(${Math.round(c0.r + (c1.r - c0.r) * t)}, ${Math.round(c0.g + (c1.g - c0.g) * t)}, ${Math.round(c0.b + (c1.b - c0.b) * t)})`;
}

/** Build an SVG arc path string from angle a0 to a1 at radius r around (cx, cy) */
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number, sweep = 1): string {
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  // Compute the clockwise angular span so the large-arc flag is correct even when
  // a1 < a0 (i.e. when the last gradient segment wraps from ~0.75 back to 0.0).
  const span = ((a1 - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const large = span > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`;
}

// ---- Component ----------------------------------------------

export const RadialClock: React.FC<RadialClockProps> = ({
  handPos,
  colorStops,
  ticks,
  majorTicks = [],
  labels = [],
  sectors = [],
  icons = [],
  startAngleOffset = -Math.PI / 2,
  size = 200,
  ringRadius = 70,
  ringWidth = 8,
  iconOffset = 28,
  innerCircleRadius = 0,
  children,
  idPrefix = 'rc',
}) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = ringRadius;
  const innerR = R - ringWidth / 2;
  const outerR = R + ringWidth / 2;

  // Sector arc text traces just outside the inner circle when one is present,
  // otherwise sits near the ring inner edge.
  const sectorTextR = innerCircleRadius > 0
    ? innerCircleRadius + 4
    : innerR - 10;

  // Number of gradient arc segments to draw (one per adjacent stop pair)
  const nSegments = colorStops.length;

  // Hand color = gradient color at handPos
  const handColor = interpolateColor(handPos, colorStops);
  const handRad = posToRad(handPos, startAngleOffset);

  return (
    <svg
      width={size + iconOffset * 2 + 30}
      height={size + iconOffset * 2 + 30}
      viewBox={`${-iconOffset - 15} ${-iconOffset - 15} ${size + (iconOffset + 15) * 2} ${size + (iconOffset + 15) * 2}`}
    >
      <defs>
        {/* One linear gradient per color-stop segment */}
        {colorStops.map((stop, i) => {
          const next = colorStops[(i + 1) % colorStops.length];
          const a0 = posToRad(stop.pos, startAngleOffset);
          const a1 = posToRad(next.pos, startAngleOffset);
          const midR = R;
          return (
            <linearGradient
              key={`${idPrefix}-grad-${i}`}
              id={`${idPrefix}-grad-${i}`}
              x1={cx + midR * Math.cos(a0)}
              y1={cy + midR * Math.sin(a0)}
              x2={cx + midR * Math.cos(a1)}
              y2={cy + midR * Math.sin(a1)}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor={stop.hex} />
              <stop offset="100%" stopColor={next.hex} />
            </linearGradient>
          );
        })}

        {/* One SVG color filter per icon that has a color tint */}
        {icons.filter(ic => ic.color).map((ic, i) => {
          const filterId = `${idPrefix}-icon-filter-${i}`;
          return (
            <filter key={filterId} id={filterId} x="0%" y="0%" width="100%" height="100%">
              <feFlood floodColor={ic.color} result="flood" />
              <feComposite in="flood" in2="SourceAlpha" operator="in" />
            </filter>
          );
        })}

        {/* Arc paths for sector labels */}
        {sectors.map(sec => {
          const a0 = posToRad(sec.startPos, startAngleOffset);
          const a1 = posToRad(sec.endPos, startAngleOffset);
          const textR = sectorTextR;
          return (
            <path
              key={`${idPrefix}-sector-path-${sec.label}`}
              id={`${idPrefix}-sector-path-${sec.label}`}
              d={arcPath(cx, cy, textR, a0, a1)}
              fill="none"
            />
          );
        })}
      </defs>

      {/* ── Inner circle (clock face center) — tinted with the hand's current color ── */}
      {innerCircleRadius > 0 && (
        <circle
          cx={cx} cy={cy} r={innerCircleRadius}
          fill={handColor}
          fillOpacity={0.2}
          stroke={handColor}
          strokeOpacity={0.55}
          strokeWidth={1}
        />
      )}

      {/* ── Sector fills ── */}
      {sectors.map(sec => {
        if (!sec.color) return null;
        const a0 = posToRad(sec.startPos, startAngleOffset);
        const a1 = posToRad(sec.endPos, startAngleOffset);
        const large = ((sec.endPos - sec.startPos + 1) % 1) > 0.5 ? 1 : 0;
        const d = [
          `M ${cx + innerR * Math.cos(a0)} ${cy + innerR * Math.sin(a0)}`,
          `A ${innerR} ${innerR} 0 ${large} 1 ${cx + innerR * Math.cos(a1)} ${cy + innerR * Math.sin(a1)}`,
          `L ${cx + outerR * Math.cos(a1)} ${cy + outerR * Math.sin(a1)}`,
          `A ${outerR} ${outerR} 0 ${large} 0 ${cx + outerR * Math.cos(a0)} ${cy + outerR * Math.sin(a0)}`,
          'Z',
        ].join(' ');
        return <path key={`${idPrefix}-sector-fill-${sec.label}`} d={d} fill={sec.color} opacity={0.35} />;
      })}

      {/* ── Gradient ring arcs ── */}
      {colorStops.map((stop, i) => {
        const next = colorStops[(i + 1) % colorStops.length];
        const a0 = posToRad(stop.pos, startAngleOffset);
        const a1 = posToRad(next.pos, startAngleOffset);
        return (
          <path
            key={`${idPrefix}-arc-${i}`}
            d={arcPath(cx, cy, R, a0, a1)}
            fill="none"
            stroke={`url(#${idPrefix}-grad-${i})`}
            strokeWidth={ringWidth}
            strokeLinecap="butt"
          />
        );
      })}

      {/* ── Tick marks ── */}
      {Array.from({ length: ticks }, (_, i) => {
        const pos = i / ticks;
        const isMajor = majorTicks.includes(i);
        const tickInner = isMajor ? R - ringWidth / 2 - 8 : R - ringWidth / 2 - 4;
        const tickOuter = R + ringWidth / 2 + (isMajor ? 4 : 0);
        const a = posToRad(pos, startAngleOffset);
        const color = interpolateColor(pos, colorStops);
        return (
          <line
            key={`${idPrefix}-tick-${i}`}
            x1={cx + tickInner * Math.cos(a)} y1={cy + tickInner * Math.sin(a)}
            x2={cx + tickOuter * Math.cos(a)} y2={cy + tickOuter * Math.sin(a)}
            stroke={color}
            strokeWidth={isMajor ? 2 : 1}
          />
        );
      })}

      {/* ── Labels inside the ring ── */}
      {labels.map(lbl => {
        const a = posToRad(lbl.pos, startAngleOffset);
        const labelR = R - ringWidth / 2 - 14;
        return (
          <text
            key={`${idPrefix}-lbl-${lbl.text}`}
            x={cx + labelR * Math.cos(a)}
            y={cy + labelR * Math.sin(a)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="9"
            fill="currentColor"
          >
            {lbl.text}
          </text>
        );
      })}

      {/* ── Sector arc text ── */}
      {sectors.map(sec => (
        <text key={`${idPrefix}-sector-text-${sec.label}`} fontSize="8" fill="currentColor" opacity={0.75}>
          <textPath
            href={`#${idPrefix}-sector-path-${sec.label}`}
            startOffset="50%"
            textAnchor="middle"
          >
            {sec.label}
          </textPath>
        </text>
      ))}

      {/* ── Custom children (e.g. moon phase disc) ── */}
      {children}

      {/* ── Clock hand ── */}
      <line
        x1={cx}
        y1={cy}
        x2={cx + (R - ringWidth / 2 - 2) * Math.cos(handRad)}
        y2={cy + (R - ringWidth / 2 - 2) * Math.sin(handRad)}
        stroke={handColor}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={3} fill="currentColor" />

      {/* ── Icons outside the ring ── */}
      {icons.map((ic, i) => {
        const iconSize = ic.size ?? 22;
        const iconR = R + ringWidth / 2 + iconOffset;
        const a = posToRad(ic.pos, startAngleOffset);
        const ix = cx + iconR * Math.cos(a);
        const iy = cy + iconR * Math.sin(a);
        const filterId = ic.color ? `${idPrefix}-icon-filter-${icons.filter(x => x.color).findIndex(x => x === ic)}` : undefined;

        // Small connector line from ring edge to icon
        const lineStart = R + ringWidth / 2 + 2;
        const lineEnd   = R + ringWidth / 2 + iconOffset - iconSize / 2 - 2;

        return (
          <g key={`${idPrefix}-icon-${i}`}>
            <line
              x1={cx + lineStart * Math.cos(a)} y1={cy + lineStart * Math.sin(a)}
              x2={cx + lineEnd   * Math.cos(a)} y2={cy + lineEnd   * Math.sin(a)}
              stroke={ic.color ?? 'transparent'}
              strokeWidth={2}
              opacity={0.6}
            />
            <image
              href={ic.href}
              x={ix - iconSize / 2}
              y={iy - iconSize / 2}
              width={iconSize}
              height={iconSize}
              filter={filterId ? `url(#${filterId})` : undefined}
              style={ic.filterStyle ? { filter: ic.filterStyle } : undefined}
            />
            {ic.label && (
              <text
                x={ix}
                y={iy + iconSize / 2 + 9}
                textAnchor="middle"
                fontSize="7"
                fill="currentColor"
                opacity={0.7}
              >
                {ic.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

export default RadialClock;
