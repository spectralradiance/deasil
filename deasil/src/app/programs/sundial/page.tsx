'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';

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

function dayIconMarker(time: Date, cx: number, cy: number, R: number, iconFile: string, color: string) {
  const th = time.getHours();
  const tm = time.getMinutes();
  const angle = ((th + tm / 60) / 24) * 360 + 90;
  const rad = (angle * Math.PI) / 180;
  const outerR = R + 30;
  const iconSize = 24;
  const x = cx + outerR * Math.cos(rad);
  const y = cy + outerR * Math.sin(rad);
  // Sanitize color string to use as an SVG id
  const filterId = `day-icon-${color.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <g>
      <defs>
        <filter id={filterId} x="0%" y="0%" width="100%" height="100%">
          {/* Flood the target color, mask by the icon's own alpha channel */}
          <feFlood floodColor={color} result="flood" />
          <feComposite in="flood" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
      <line
        x1={cx + (R + 2) * Math.cos(rad)} y1={cy + (R + 2) * Math.sin(rad)}
        x2={cx + (R + 6) * Math.cos(rad)} y2={cy + (R + 6) * Math.sin(rad)}
        stroke={color} strokeWidth={1.5}
      />
      <image
        href={iconFile}
        x={x - iconSize / 2}
        y={y - iconSize / 2}
        width={iconSize}
        height={iconSize}
        filter={`url(#${filterId})`}
      />
    </g>
  );
}

// --- Analog Clock SVG ---
const AnalogClock = ({ date, sunrise, sunset }: { date: Date; sunrise?: Date | null; sunset?: Date | null }) => {
  const size = 250;
  const cx = size / 2;
  const cy = size / 2;
  const R = 60;

  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds() + date.getMilliseconds() / 1000;

  // Single 24-hour hand — midnight at bottom (+90° offset)
  const dayAngle = ((h + m / 60 + s / 3600) / 24) * 360 + 90;
  const rad = (dayAngle * Math.PI) / 180;

  const ClockColors = ['#ffffff', '#FF8C00', '#0000ff', '#FFD700'];

  // Solar noon = midpoint of sunrise/sunset; solar midnight = noon ± 12h
  const solarNoon = (sunrise && sunset)
    ? new Date((sunrise.getTime() + sunset.getTime()) / 2)
    : null;
  const solarMidnight = solarNoon
    ? new Date(solarNoon.getTime() + 12 * 3600 * 1000)
    : null;

  return (
    <svg width={size} height={size} viewBox="-20 -20 240 240">
      <defs>
        {Array.from({ length: 4 }, (_, i) => {
          const a0 = (i / 4) * 2 * Math.PI - Math.PI / 2;
          const a1 = ((i + 1) / 4) * 2 * Math.PI - Math.PI / 2;
          return (
            <linearGradient
              key={i}
              id={`cg-${i}`}
              x1={cx + R * Math.cos(a0)}
              y1={cy + R * Math.sin(a0)}
              x2={cx + R * Math.cos(a1)}
              y2={cy + R * Math.sin(a1)}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor={ClockColors[i]} />
              <stop offset="100%" stopColor={ClockColors[(i + 1) % 4]} />
            </linearGradient>
          );
        })}
      </defs>
      {Array.from({ length: 4 }, (_, i) => {
        const a0 = (i / 4) * 2 * Math.PI - Math.PI / 2;
        const a1 = ((i + 1) / 4) * 2 * Math.PI - Math.PI / 2;
        const pathData = `M ${cx + R * Math.cos(a0)} ${cy + R * Math.sin(a0)} A ${R} ${R} 0 0 1 ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)}`;
        return (
          <path
            key={i}
            d={pathData}
            fill="none"
            stroke={`url(#cg-${i})`}
            strokeWidth="2"
          />
        );
      })}
      {/* 24 hour marks — midnight at bottom */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * 2 * Math.PI - Math.PI / 2;
        const isMajor = i % 6 === 0;
        
        // Determine color based on position in the gradient
        const colorIndex = Math.floor(i / 6);
        const nextColorIndex = (colorIndex + 1) % 4;
        const segmentPercent = (i % 6) / 6;

        const hexToRgb = (hex: string) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return { r, g, b };
        };

        const startRgb = hexToRgb(ClockColors[colorIndex]);
        const endRgb = hexToRgb(ClockColors[nextColorIndex]);

        const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * segmentPercent);
        const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * segmentPercent);
        const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * segmentPercent);
        const tickColor = `rgb(${r}, ${g}, ${b})`;

        return (
          <line key={i}
            x1={cx + (R - (isMajor ? 10 : 5)) * Math.cos(a)} y1={cy + (R - (isMajor ? 10 : 5)) * Math.sin(a)}
            x2={cx + R * Math.cos(a)}                         y2={cy + R * Math.sin(a)}
            stroke={tickColor} strokeWidth={isMajor ? 2 : 1}
          />
        );
      })}
      {/* Hour labels at 0, 6, 12, 18 */}
      {[0, 6, 12, 18].map(hr => {
        const a = (hr / 24) * 2 * Math.PI + Math.PI / 2;
        const lx = cx + (R - 20) * Math.cos(a);
        const ly = cy + (R - 20) * Math.sin(a);
        return (
          <text key={hr} x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
            fontSize="10" fill="currentColor">
            {hr}
          </text>
        );
      })}
      {/* Single 24-hour hand */}
      <line
        x1={cx} y1={cy}
        x2={cx + R * 0.75 * Math.cos(rad)}
        y2={cy + R * 0.75 * Math.sin(rad)}
        stroke="currentColor" strokeWidth={3} strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={3} fill="currentColor" />
      {sunrise && dayIconMarker(sunrise, cx, cy, R, '/sundial/day/sunrise.svg', ClockColors[3])}
      {sunset  && dayIconMarker(sunset,  cx, cy, R, '/sundial/day/sunset.svg',  ClockColors[1])}
      {solarNoon     && dayIconMarker(solarNoon,     cx, cy, R, '/sundial/day/noon.svg',     ClockColors[0])}
      {solarMidnight && dayIconMarker(solarMidnight, cx, cy, R, '/sundial/day/midnight.svg', ClockColors[2])}
    </svg>
  );
};

// --- Moon SVG ---
// Phase icons ordered starting at bottom (new moon), going counterclockwise on screen
// (increasing SVG angle), so waxing phases appear on the left side.
const MoonPhaseIcons = [
  { name: 'New Moon',        file: '/sundial/moon/new_moon.svg'        }, // bottom
  { name: 'Waxing Crescent', file: '/sundial/moon/waxing_crescent.svg' }, // lower-left
  { name: 'First Quarter',   file: '/sundial/moon/first_quarter.svg'   }, // left
  { name: 'Waxing Gibbous',  file: '/sundial/moon/waxing_gibbous.svg'  }, // upper-left
  { name: 'Full Moon',       file: '/sundial/moon/full_moon.svg'       }, // top
  { name: 'Waning Gibbous',  file: '/sundial/moon/waning_gibbous.svg'  }, // upper-right
  { name: 'Last Quarter',    file: '/sundial/moon/last_quarter.svg'    }, // right
  { name: 'Waning Crescent', file: '/sundial/moon/waning_crescent.svg' }, // lower-right
];

// Sweep flags: sweep=1 is clockwise on screen. From the bottom of the circle,
// clockwise goes LEFT and counterclockwise (sweep=0) goes RIGHT.
const MoonSvg = ({ percent }: { percent: number }) => {
  const theme = useTheme();
  const iconFilter = theme.palette.mode === 'dark' 
    ? 'brightness(0) invert(1)' 
    : 'brightness(0)';
  const cx = 100;
  const cy = 100;
  const R = 70;
  const iconR = 106; // distance from center to phase icons
  const iconSize = 22;
  // Terminator x-radius: R at new/full, 0 at quarter moons
  const tx = R * Math.abs(Math.cos(percent * 2 * Math.PI));
  const isNew = percent < 0.025 || percent > 0.975;
  const isWaxing = percent <= 0.5;
  // Active phase index: 0=new moon … 7=waning crescent
  const activePhase = Math.round(percent * 8) % 8;

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

  const angle = percent * 2 * Math.PI + Math.PI / 2;
  const x2 = cx + R * Math.cos(angle);
  const y2 = cy + R * Math.sin(angle);

  return (
    <svg width="260" height="260" viewBox="-30 -30 260 260">
      <circle cx={cx} cy={cy} r={R} fill="#1a1a2e" stroke="#444" strokeWidth="1" />
      {litPath && <path d={litPath} fill="#f0e8c8" />}
      <line
        x1={cx}
        y1={cy}
        x2={x2}
        y2={y2}
        stroke="white"
        strokeWidth="1"
        style={{ mixBlendMode: 'difference' }}
      />
      {/* Phase tick marks */}
      {Array.from({ length: 8 }).map((_, i) => {
        const alphaRad = ((90 + i * 45) * Math.PI) / 180;
        const tickLength = 5;
        return (
          <line
            key={`tick-${i}`}
            x1={cx + (R - tickLength) * Math.cos(alphaRad)}
            y1={cy + (R - tickLength) * Math.sin(alphaRad)}
            x2={cx + R * Math.cos(alphaRad)}
            y2={cy + R * Math.sin(alphaRad)}
            stroke="white"
            strokeWidth={1.5}
            style={{ mixBlendMode: 'difference' }}
          />
        );
      })}
      {/* Phase day numbers */}
      {Array.from({ length: 8 }).map((_, i) => {
        const alphaRad = ((90 + i * 45) * Math.PI) / 180;
        const day = ((i / 8) * SYNODIC_MONTH).toFixed(1);
        const textR = R - 12;
        return (
          <text
            key={`day-${i}`}
            x={cx + textR * Math.cos(alphaRad)}
            y={cy + textR * Math.sin(alphaRad)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="8"
            fill="white"
            style={{ mixBlendMode: 'difference' }}
          >
            {day}
          </text>
        );
      })}
      {/* Phase icon ring: index 0 at bottom (90°), +45° per step = counterclockwise on screen */}
      {MoonPhaseIcons.map((phase, i) => {
        const alphaRad = ((90 + i * 45) * Math.PI) / 180;
        const icx = cx + iconR * Math.cos(alphaRad);
        const icy = cy + iconR * Math.sin(alphaRad);
        const isActive = i === activePhase;
        return (
          <g key={phase.name}>
            {/* Phase icon — inverted to white so it shows on dark background */}
            <image
              href={phase.file}
              x={icx - iconSize / 2}
              y={icy - iconSize / 2}
              width={iconSize}
              height={iconSize}
              style={{ filter: iconFilter}}
            />
          </g>
        );
      })}
    </svg>
  );
};

// --- Moon Phase Component ---
// --- Sabbats ---
const Sabbats = [
  { name: 'Samhain',    icon: '/sundial/year/samhain.svg' },
  { name: 'Yule',       icon: '/sundial/year/yule.svg' },
  { name: 'Imbolc',     icon: '/sundial/year/imbolc.svg' },
  { name: 'Ostara',     icon: '/sundial/year/ostara.svg' },
  { name: 'Beltane',    icon: '/sundial/year/beltain.svg' },
  { name: 'Litha',      icon: '/sundial/year/litha.svg' },
  { name: 'Lughnasadh', icon: '/sundial/year/lunasa.svg' },
  { name: 'Mabon',      icon: '/sundial/year/mabon.svg' },
];

// Seasonal colors aligned to each sabbat
const SeasonalColors = [
  '#8B4513', // Samhain  – deep autumn brown
  '#1E3A8A', // Yule     – deep winter blue
  '#60A5FA', // Imbolc   – late-winter sky blue
  '#86EFAC', // Ostara   – spring green
  '#16A34A', // Beltane  – vibrant green
  '#FDE047', // Litha    – summer gold
  '#F97316', // Lughnasadh – harvest orange
  '#EA580C', // Mabon    – autumn rust
];

// Seasons defined by start/end sabbat index (0=Samhain … 7=Mabon)
// endIdx may exceed 7 to handle wrap-around (e.g. 9 = Yule at 1+8)
const Seasons = [
  { name: 'Spring', color: '#86EFAC', startIdx: 3, endIdx: 5 }, // Ostara → Litha
  { name: 'Summer', color: '#FDE047', startIdx: 5, endIdx: 7 }, // Litha → Mabon
  { name: 'Autumn', color: '#EA580C', startIdx: 7, endIdx: 9 }, // Mabon → Yule (wraps)
  { name: 'Winter', color: '#60A5FA', startIdx: 1, endIdx: 3 }, // Yule → Ostara
];

const WheelOfYear = () => {
  const theme = useTheme();
  const iconFilter =
    theme.palette.mode === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)';
  const size = 400; // Total SVG width/height
  const center = size / 2;
  const radius = 130; // Distance from center to symbols
  const innerR = 95;
  const outerR = 105;
  const seasonOuterR = 88;
  const seasonInnerR = 58;
  const n = Sabbats.length;

  // Calculate current day of the year
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay); // 1-365

  // Angle for the line indicating the current day.
  // The year starts with Samhain (Nov 1) at 0 degrees (right side).
  // Jan 1 is approx. 61 days after Samhain.
  const samhainOffset = 61;
  const dayAngle = ((dayOfYear + samhainOffset) / 365) * 2 * Math.PI + Math.PI / 4;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g>
        {/* Season inner sectors */}
        {Seasons.map(({ name, color, startIdx, endIdx }) => {
          const a0 = (startIdx / n) * 2 * Math.PI + Math.PI / 4;
          const a1 = (endIdx / n) * 2 * Math.PI + Math.PI / 4;
          const c0 = Math.cos(a0), s0 = Math.sin(a0);
          const c1 = Math.cos(a1), s1 = Math.sin(a1);
          const d = [
            `M ${center + seasonOuterR * c0} ${center + seasonOuterR * s0}`,
            `A ${seasonOuterR} ${seasonOuterR} 0 0 1 ${center + seasonOuterR * c1} ${center + seasonOuterR * s1}`,
            `L ${center + seasonInnerR * c1} ${center + seasonInnerR * s1}`,
            `A ${seasonInnerR} ${seasonInnerR} 0 0 0 ${center + seasonInnerR * c0} ${center + seasonInnerR * s0}`,
            'Z',
          ].join(' ');
          const textR = (seasonOuterR + seasonInnerR) / 2 - 4;
          const textPathId = `season-arc-${name}`;
          // Arc path for the text to follow, going clockwise from a0 to a1
          const textArcD = [
            `M ${center + textR * Math.cos(a0)} ${center + textR * Math.sin(a0)}`,
            `A ${textR} ${textR} 0 0 1 ${center + textR * Math.cos(a1)} ${center + textR * Math.sin(a1)}`,
          ].join(' ');
          return (
            <g key={name}>
              <defs>
                <path id={textPathId} d={textArcD} />
              </defs>
              <path d={d} fill={color} opacity={0.8} />
              <text fontSize="10" fill="currentColor">
                <textPath href={`#${textPathId}`} startOffset="50%" textAnchor="middle">
                  {name}
                </textPath>
              </text>
            </g>
          );
        })}
        {/* Sabbaths Ticks */}
        {Array.from({ length: n }).map((_, i) => {
          const angle = (i / n) * 2 * Math.PI + Math.PI / 4;
          const tickLength = 10;
          return (
            <line
              key={`tick-${i}`}
              x1={center + (outerR - tickLength) * Math.cos(angle)}
              y1={center + (outerR - tickLength) * Math.sin(angle)}
              x2={center + outerR * Math.cos(angle)}
              y2={center + outerR * Math.sin(angle)}
              stroke="currentColor"
              strokeWidth={1.5}
            />
          );
        })}
        {/* Seasonal rainbow ring */}
        <defs>
          {Array.from({ length: n }, (_, i) => {
            const a0 = (i * (360 / n) * Math.PI) / 180 + Math.PI / 4;
            const a1 = ((i + 1) * (360 / n) * Math.PI) / 180 + Math.PI / 4;
            const midR = (innerR + outerR) / 2;
            return (
              <linearGradient
                key={i}
                id={`sg-${i}`}
                x1={center + midR * Math.cos(a0)}
                y1={center + midR * Math.sin(a0)}
                x2={center + midR * Math.cos(a1)}
                y2={center + midR * Math.sin(a1)}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={SeasonalColors[i]} />
                <stop offset="100%" stopColor={SeasonalColors[(i + 1) % n]} />
              </linearGradient>
            );
          })}
        </defs>
        {Array.from({ length: n }, (_, i) => {
          const a0 = (i * (360 / n) * Math.PI) / 180 + Math.PI / 4;
          const a1 = ((i + 1) * (360 / n) * Math.PI) / 180 + Math.PI / 4;
          const c0 = Math.cos(a0),
            s0 = Math.sin(a0);
          const c1 = Math.cos(a1),
            s1 = Math.sin(a1);
          const d = [
            `M ${center + outerR * c0} ${center + outerR * s0}`,
            `A ${outerR} ${outerR} 0 0 1 ${center + outerR * c1} ${center + outerR * s1}`,
            `L ${center + innerR * c1} ${center + innerR * s1}`,
            `A ${innerR} ${innerR} 0 0 0 ${center + innerR * c0} ${center + innerR * s0}`,
            'Z',
          ].join(' ');
          return <path key={i} d={d} fill={`url(#sg-${i})`} opacity={1.0} />;
        })}
        {/* Optional: The actual circle line */}
        {/* <circle cx={center} cy={center} r={radius} fill="none" stroke="#ccc" /> */}

        {Sabbats.map((sabbat, i) => {
          // Calculate the angle for this item (in radians)
          const angle = (i * (360 / Sabbats.length) * Math.PI) / 180 + Math.PI / 4;

          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);

          return (
            <g key={sabbat.name} transform={`translate(${x}, ${y})`}>
              {/* Rotate text back to be upright */}
              <g>
                <image
                  href={sabbat.icon}
                  x="-12"
                  y="-12"
                  width="24"
                  height="24"
                  style={{ filter: iconFilter }}
                />
                {/* <text y="25" textAnchor="middle" fontSize="12" fill="#fff">
                  {sabbat.name}
                </text> */}
              </g>
            </g>
          );
        })}
      </g>
      {/* Line for current day of year */}
      <line
        x1={center}
        y1={center}
        x2={center + radius * Math.cos(dayAngle)}
        y2={center + radius * Math.sin(dayAngle)}
        stroke="currentColor"
        strokeWidth="2"
      />
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
      <h1>Sundial</h1>
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
