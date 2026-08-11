// ============================================================
// astro.ts — Shared astronomical calculation utilities
// ============================================================

// --- Lunar constants ---
// Synodic month length in days (new moon to new moon)
export const SYNODIC_MONTH = 29.53058770576;
// Julian date of a known new moon (Jan 6, 2000)
const JD_EPOCH = 2451550.1;

/** Convert a JS Date to Julian Day Number */
export function dateToJulian(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Returns the lunar age as a fraction 0–1 (0 = new moon, 0.5 = full moon) */
export function lunarAgePercent(date: Date): number {
  const raw = (dateToJulian(date) - JD_EPOCH) / SYNODIC_MONTH;
  return raw - Math.floor(raw);
}

/** Human-readable name for a lunar phase fraction */
export function moonPhaseName(p: number): string {
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

// --- Solar calculation helpers ---
function toRad(deg: number) { return (deg * Math.PI) / 180; }
function toDeg(rad: number) { return (rad * 180) / Math.PI; }

/** Calculate sunrise and sunset times using the NOAA algorithm.
 *  Returns UTC Date objects; returns null for polar day/night.
 */
export function calcSunTimes(
  date: Date,
  lat: number,
  lon: number,
): { sunrise: Date | null; sunset: Date | null; solarNoon: Date | null; solarMidnight: Date | null } {
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
    - 1.25 * e * e * Math.sin(2 * Mrad),
  );
  const cosHA = (Math.cos(toRad(90.833)) - Math.sin(toRad(lat)) * Math.sin(toRad(dec)))
              / (Math.cos(toRad(lat)) * Math.cos(toRad(dec)));
  if (cosHA < -1 || cosHA > 1) return { sunrise: null, sunset: null, solarNoon: null, solarMidnight: null };
  const HA   = toDeg(Math.acos(cosHA));
  const noon = 720 - 4 * lon - eot;
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  return {
    sunrise: new Date(dayStart.getTime() + (noon - HA * 4) * 60000),
    sunset:  new Date(dayStart.getTime() + (noon + HA * 4) * 60000),
    solarNoon:     new Date(dayStart.getTime() + noon * 60000),
    solarMidnight: new Date(dayStart.getTime() + (noon + 720) * 60000),
  };
}

/** Format a Date as 12-hour time with seconds and milliseconds, e.g. "6:42:07.312 AM" */
export function formatSunTime(date: Date, use24h = false): string {
  const h  = date.getHours();
  const m  = date.getMinutes().toString().padStart(2, '0');
  const s  = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  if (use24h) return `${h.toString().padStart(2, '0')}:${m}:${s}.${ms}`;
  return `${h % 12 || 12}:${m}:${s}.${ms} ${h >= 12 ? 'PM' : 'AM'}`;
}

// --- Wheel of the Year (Sabbat) utilities ---

/** Fixed calendar dates for the 8 sabbats */
export function getSabbatDates(year: number): { name: string; date: Date }[] {
  return [
    { name: 'Imbolc',     date: new Date(year, 1,  2)  },
    { name: 'Ostara',     date: new Date(year, 2,  20) },
    { name: 'Beltane',    date: new Date(year, 4,  1)  },
    { name: 'Litha',      date: new Date(year, 5,  21) },
    { name: 'Lughnasadh', date: new Date(year, 7,  1)  },
    { name: 'Mabon',      date: new Date(year, 8,  22) },
    { name: 'Samhain',    date: new Date(year, 10, 1)  },
    { name: 'Yule',       date: new Date(year, 11, 21) },
  ];
}

/** Returns the nearest past and upcoming sabbat relative to `now` */
export function getNearestSabbats(now: Date): {
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

/** Interpolate between two hex colors by a 0–1 factor */
export function lerpColor(hex0: string, hex1: string, t: number): string {
  const parse = (h: string) => ({
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  });
  const c0 = parse(hex0);
  const c1 = parse(hex1);
  return `rgb(${Math.round(c0.r + (c1.r - c0.r) * t)}, ${Math.round(c0.g + (c1.g - c0.g) * t)}, ${Math.round(c0.b + (c1.b - c0.b) * t)})`;
}

// ---- Planet positions ---------------------------------------

/** Days since J2000.0 (2000 Jan 1.5 = JD 2451545.0) */
function daysSinceJ2000(date: Date): number {
  return dateToJulian(date) - 2451545.0;
}

/** Reduce degrees to [0, 360) */
function normDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Approximate ecliptic longitude (0–360°) for the Sun and major planets.
 * The Sun is corrected to ~1° accuracy. Planets use mean longitude only
 * and may be off by several degrees, which is sufficient for a visual display.
 */
export function calcPlanetLongitudes(date: Date): Record<string, number> {
  const d = daysSinceJ2000(date);

  // Sun: mean longitude + equation-of-centre correction
  const Lsun = normDeg(280.46 + 0.9856474 * d);
  const Msun = normDeg(357.53 + 0.9856003 * d);
  const Mr   = (Msun * Math.PI) / 180;
  const sun  = normDeg(Lsun + 1.915 * Math.sin(Mr) + 0.020 * Math.sin(2 * Mr));

  // Moon: simplified Brown theory term
  const moonL0 = normDeg(218.316 + 13.176396 * d);
  const moonM  = normDeg(134.963 + 13.064993 * d);
  const moonMr = (moonM * Math.PI) / 180;
  const moon   = normDeg(moonL0 + 6.289 * Math.sin(moonMr));

  return {
    Sun:     sun,
    Moon:    moon,
    Mercury: normDeg(252.25 + 4.09236 * d),
    Venus:   normDeg(181.98 + 1.60214 * d),
    Mars:    normDeg(355.43 + 0.52402 * d),
    Jupiter: normDeg( 34.33 + 0.08309 * d),
    Saturn:  normDeg( 50.08 + 0.03346 * d),
    Uranus:  normDeg(314.20 + 0.01172 * d),
    Neptune: normDeg(304.22 + 0.00598 * d),
  };
}

// ---- Aspect calculations ------------------------------------

export interface Aspect {
  body1: string;
  body2: string;
  type:  'Conjunction' | 'Sextile' | 'Square' | 'Trine' | 'Opposition';
  exact: number;   // exact aspect angle (0 | 60 | 90 | 120 | 180)
  orb:   number;   // degrees from exact
}

const ASPECT_DEFS: { type: Aspect['type']; angle: number; maxOrb: number }[] = [
  { type: 'Conjunction', angle:   0, maxOrb: 8 },
  { type: 'Sextile',     angle:  60, maxOrb: 6 },
  { type: 'Square',      angle:  90, maxOrb: 8 },
  { type: 'Trine',       angle: 120, maxOrb: 8 },
  { type: 'Opposition',  angle: 180, maxOrb: 8 },
];

/** Compute all major aspects among the supplied ecliptic longitudes */
export function calcAspects(lons: Record<string, number>): Aspect[] {
  const bodies = Object.keys(lons);
  const result: Aspect[] = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const raw = Math.abs(((lons[bodies[i]] - lons[bodies[j]]) % 360 + 360) % 360);
      const sep = raw > 180 ? 360 - raw : raw;
      for (const def of ASPECT_DEFS) {
        const orb = Math.abs(sep - def.angle);
        if (orb <= def.maxOrb) {
          result.push({ body1: bodies[i], body2: bodies[j], type: def.type, exact: def.angle, orb });
        }
      }
    }
  }
  return result;
}
