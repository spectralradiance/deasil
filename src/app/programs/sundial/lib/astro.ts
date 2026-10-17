// Astronomical calculations: sun times, lunar age, planetary positions, aspects, and sabbat proximity.

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

/** The sabbats in wheel order, starting at Samhain (pos 0 on the Year clock) */
export const SABBAT_WHEEL_ORDER = [
  'Samhain', 'Yule', 'Imbolc', 'Ostara', 'Beltane', 'Litha', 'Lughnasadh', 'Mabon',
] as const;

/** Position of `date` around the Wheel of the Year, as a 0–1 fraction with
 *  Samhain at 0.
 *
 *  The eight sabbats are drawn evenly around the dial, an eighth apart, but
 *  they are NOT evenly spaced in time — the gaps run from 40 days
 *  (Mabon → Samhain) to 52 days (Litha → Lughnasadh). Mapping the day of the
 *  year linearly onto the dial therefore drifts away from the spokes by up to
 *  about a week, so the hand misses the tick on the very days it should point
 *  straight at one.
 *
 *  Instead each eighth of the dial is mapped onto the actual span between the
 *  two sabbats that bound it. The hand then lands exactly on a spoke on every
 *  sabbat, and moves at a slightly different rate through each segment —
 *  which is the honest picture of an uneven year. Real dates are used
 *  throughout, so leap years need no special handling.
 */
export function sabbatWheelPosition(date: Date): number {
  const year = date.getFullYear();
  const marks = [year - 1, year, year + 1]
    .flatMap(y => getSabbatDates(y))
    .map(s => ({ index: SABBAT_WHEEL_ORDER.indexOf(s.name as typeof SABBAT_WHEEL_ORDER[number]), time: s.date.getTime() }))
    .sort((a, b) => a.time - b.time);
  const t = date.getTime();
  for (let i = 0; i < marks.length - 1; i++) {
    if (t >= marks[i].time && t < marks[i + 1].time) {
      const span = marks[i + 1].time - marks[i].time;
      // Sorted chronologically the sabbats step through the wheel one at a
      // time, so the next mark is always this one's index + 1.
      const progress = span > 0 ? (t - marks[i].time) / span : 0;
      return ((marks[i].index + progress) / SABBAT_WHEEL_ORDER.length) % 1;
    }
  }
  return 0;
}

/** Returns the nearest past and upcoming occurrence of one named sabbat relative to `now` */
export function getSabbatOccurrence(name: string, now: Date): { next: Date; last: Date } {
  const year = now.getFullYear();
  const all = [
    ...getSabbatDates(year - 1),
    ...getSabbatDates(year),
    ...getSabbatDates(year + 1),
  ]
    .filter(s => s.name === name)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  let last = all[0].date;
  let next = all[all.length - 1].date;
  for (const s of all) {
    if (s.date.getTime() <= now.getTime()) last = s.date;
    if (s.date.getTime() > now.getTime()) { next = s.date; break; }
  }
  return { next, last };
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
//
// Geocentric ecliptic longitudes from Keplerian elements (Paul Schlyter's
// low-precision ephemeris), referred to the ecliptic and mean equinox of date
// — i.e. tropical zodiac longitudes, which is what an astrological chart wants.
//
// Heliocentric positions are computed for each planet, then the Sun's
// rectangular coordinates are added to shift the origin to the Earth. Skipping
// that shift is what lets a mean-longitude approximation place the inner
// planets anywhere in the zodiac; seen from Earth, Mercury and Venus never
// stray more than ~28° and ~47° from the Sun.
//
// Accuracy is roughly ±1–2 arcminutes for the Sun, a few arcminutes for the
// Moon and planets — well inside the degree that decides a sign placement.

/** Schlyter's day number: days since 2000 Jan 0.0 TDT (JD 2451543.5) */
function daysSinceEpoch2000(date: Date): number {
  return dateToJulian(date) - 2451543.5;
}

/** Reduce degrees to [0, 360) */
function normDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Shortest signed difference a − b, in (−180, 180] */
function deltaDeg(a: number, b: number): number {
  return ((a - b + 540) % 360) - 180;
}

const sinD = (deg: number) => Math.sin(toRad(deg));
const cosD = (deg: number) => Math.cos(toRad(deg));

/** Keplerian orbital elements at a given instant */
interface OrbitalElements {
  N: number;  // longitude of the ascending node, degrees
  i: number;  // inclination to the ecliptic, degrees
  w: number;  // argument of perihelion, degrees
  a: number;  // semi-major axis (AU; Earth radii for the Moon)
  e: number;  // eccentricity
  M: number;  // mean anomaly, degrees
}

/** Mean elements as linear functions of the day number `d` */
const ELEMENTS: Record<string, (d: number) => OrbitalElements> = {
  Sun:     d => ({ N:   0,                       i: 0,                     w: 282.9404 + 4.70935e-5   * d, a:  1.0,                     e: 0.016709 - 1.151e-9 * d,  M: 356.0470 + 0.9856002585  * d }),
  Moon:    d => ({ N: 125.1228 - 0.0529538083 * d, i: 5.1454,              w: 318.0634 + 0.1643573223 * d, a: 60.2666,                  e: 0.054900,                 M: 115.3654 + 13.0649929509 * d }),
  Mercury: d => ({ N:  48.3313 + 3.24587e-5   * d, i: 7.0047 + 5.00e-8  * d, w:  29.1241 + 1.01444e-5  * d, a:  0.387098,                e: 0.205635 + 5.59e-10 * d,  M: 168.6562 + 4.0923344368  * d }),
  Venus:   d => ({ N:  76.6799 + 2.46590e-5   * d, i: 3.3946 + 2.75e-8  * d, w:  54.8910 + 1.38374e-5  * d, a:  0.723330,                e: 0.006773 - 1.302e-9 * d,  M:  48.0052 + 1.6021302244  * d }),
  Mars:    d => ({ N:  49.5574 + 2.11081e-5   * d, i: 1.8497 - 1.78e-8  * d, w: 286.5016 + 2.92961e-5  * d, a:  1.523688,                e: 0.093405 + 2.516e-9 * d,  M:  18.6021 + 0.5240207766  * d }),
  Jupiter: d => ({ N: 100.4542 + 2.76854e-5   * d, i: 1.3030 - 1.557e-7 * d, w: 273.8777 + 1.64505e-5  * d, a:  5.20256,                 e: 0.048498 + 4.469e-9 * d,  M:  19.8950 + 0.0830853001  * d }),
  Saturn:  d => ({ N: 113.6634 + 2.38980e-5   * d, i: 2.4886 - 1.081e-7 * d, w: 339.3939 + 2.97661e-5  * d, a:  9.55475,                 e: 0.055546 - 9.499e-9 * d,  M: 316.9670 + 0.0334442282  * d }),
  Uranus:  d => ({ N:  74.0005 + 1.3978e-5    * d, i: 0.7733 + 1.9e-8   * d, w:  96.6612 + 3.0565e-5   * d, a: 19.18171 - 1.55e-8  * d,  e: 0.047318 + 7.45e-9 * d,   M: 142.5905 + 0.011725806   * d }),
  Neptune: d => ({ N: 131.7806 + 3.0173e-5    * d, i: 1.7700 - 2.55e-7  * d, w: 272.8461 - 6.027e-6    * d, a: 30.05826 + 3.313e-8 * d,  e: 0.008606 + 2.15e-9 * d,   M: 260.2471 + 0.005995147   * d }),
};

/** Solve Kepler's equation for the eccentric anomaly, in degrees */
function solveKepler(M: number, e: number): number {
  let E = M + toDeg(e) * sinD(M) * (1 + e * cosD(M));
  for (let k = 0; k < 12; k++) {
    const dE = (E - toDeg(e) * sinD(E) - M) / (1 - e * cosD(E));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return E;
}

/** Ecliptic longitude, latitude and radius from a set of orbital elements */
function orbitToEcliptic(el: OrbitalElements): { lon: number; lat: number; r: number } {
  const E  = solveKepler(normDeg(el.M), el.e);
  const xv = el.a * (cosD(E) - el.e);
  const yv = el.a * Math.sqrt(1 - el.e * el.e) * sinD(E);
  const v  = toDeg(Math.atan2(yv, xv));      // true anomaly
  const r  = Math.hypot(xv, yv);
  const u  = v + el.w;                       // argument of latitude
  const x  = r * (cosD(el.N) * cosD(u) - sinD(el.N) * sinD(u) * cosD(el.i));
  const y  = r * (sinD(el.N) * cosD(u) + cosD(el.N) * sinD(u) * cosD(el.i));
  const z  = r * sinD(u) * sinD(el.i);
  return {
    lon: normDeg(toDeg(Math.atan2(y, x))),
    lat: toDeg(Math.atan2(z, Math.hypot(x, y))),
    r,
  };
}

/** The Sun's geocentric longitude and rectangular ecliptic coordinates (AU) */
function sunPosition(d: number): { lon: number; x: number; y: number } {
  const el  = ELEMENTS.Sun(d);
  const E   = solveKepler(normDeg(el.M), el.e);
  const xv  = cosD(E) - el.e;
  const yv  = Math.sqrt(1 - el.e * el.e) * sinD(E);
  const r   = Math.hypot(xv, yv);
  const lon = normDeg(toDeg(Math.atan2(yv, xv)) + el.w);
  return { lon, x: r * cosD(lon), y: r * sinD(lon) };
}

/** The Moon's geocentric longitude, including the main periodic terms (~1.3° total) */
function moonLongitude(d: number): number {
  const m  = ELEMENTS.Moon(d);
  const s  = ELEMENTS.Sun(d);
  // The Moon's elements are already geocentric, so no origin shift is needed.
  const { lon } = orbitToEcliptic(m);
  const Ms = normDeg(s.M);
  const Mm = normDeg(m.M);
  const Ls = normDeg(s.M + s.w);
  const Lm = normDeg(m.M + m.w + m.N);
  const D  = normDeg(Lm - Ls);               // mean elongation
  const F  = normDeg(Lm - m.N);              // argument of latitude
  const pert =
    - 1.274 * sinD(Mm - 2 * D)               // evection
    + 0.658 * sinD(2 * D)                    // variation
    - 0.186 * sinD(Ms)                       // yearly equation
    - 0.059 * sinD(2 * Mm - 2 * D)
    - 0.057 * sinD(Mm - 2 * D + Ms)
    + 0.053 * sinD(Mm + 2 * D)
    + 0.046 * sinD(2 * D - Ms)
    + 0.041 * sinD(Mm - Ms)
    - 0.035 * sinD(D)                        // parallactic equation
    - 0.031 * sinD(Mm + Ms)
    - 0.015 * sinD(2 * F - 2 * D)
    + 0.011 * sinD(Mm - 4 * D);
  return normDeg(lon + pert);
}

/** Mutual perturbations of Jupiter, Saturn and Uranus, in degrees of longitude */
function giantPlanetPerturbation(name: string, d: number): number {
  if (name !== 'Jupiter' && name !== 'Saturn' && name !== 'Uranus') return 0;
  const Mj = normDeg(ELEMENTS.Jupiter(d).M);
  const Ms = normDeg(ELEMENTS.Saturn(d).M);
  const Mu = normDeg(ELEMENTS.Uranus(d).M);
  if (name === 'Jupiter') {
    return -0.332 * sinD(2 * Mj - 5 * Ms - 67.6)
         -  0.056 * sinD(2 * Mj - 2 * Ms + 21)
         +  0.042 * sinD(3 * Mj - 5 * Ms + 21)
         -  0.036 * sinD(Mj - 2 * Ms)
         +  0.022 * cosD(Mj - Ms)
         +  0.023 * sinD(2 * Mj - 3 * Ms + 52)
         -  0.016 * sinD(Mj - 5 * Ms - 69);
  }
  if (name === 'Saturn') {
    return  0.812 * sinD(2 * Mj - 5 * Ms - 67.6)
         -  0.229 * cosD(2 * Mj - 4 * Ms - 2)
         +  0.119 * sinD(Mj - 2 * Ms - 3)
         +  0.046 * sinD(2 * Mj - 6 * Ms - 69)
         +  0.014 * sinD(Mj - 3 * Ms + 32);
  }
  return  0.040 * sinD(Ms - 2 * Mu + 6)
       +  0.035 * sinD(Ms - 3 * Mu + 33)
       -  0.015 * sinD(Mj - Mu + 20);
}

/** Geocentric ecliptic longitude of a planet, in degrees */
function planetLongitude(name: string, d: number): number {
  const { lon, lat, r } = orbitToEcliptic(ELEMENTS[name](d));
  const l   = normDeg(lon + giantPlanetPerturbation(name, d));
  const sun = sunPosition(d);
  // Heliocentric rectangular coordinates, shifted to a geocentric origin
  const xg = r * cosD(l) * cosD(lat) + sun.x;
  const yg = r * sinD(l) * cosD(lat) + sun.y;
  return normDeg(toDeg(Math.atan2(yg, xg)));
}

/** The charted bodies in classical geocentric order, innermost sphere first */
export const CHART_BODIES = [
  'Moon', 'Mercury', 'Venus', 'Sun', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune',
] as const;

/** Geocentric ecliptic longitude (0–360°, tropical) for the Sun, Moon and major planets */
export function calcPlanetLongitudes(date: Date): Record<string, number> {
  const d = daysSinceEpoch2000(date);
  return {
    Sun:     sunPosition(d).lon,
    Moon:    moonLongitude(d),
    Mercury: planetLongitude('Mercury', d),
    Venus:   planetLongitude('Venus',   d),
    Mars:    planetLongitude('Mars',    d),
    Jupiter: planetLongitude('Jupiter', d),
    Saturn:  planetLongitude('Saturn',  d),
    Uranus:  planetLongitude('Uranus',  d),
    Neptune: planetLongitude('Neptune', d),
  };
}

/** Which bodies are apparently moving backwards through the zodiac on `date`.
 *  Sampled over ±12 hours — long enough for even Neptune to clear rounding,
 *  short enough not to smear a station into the wrong direction.
 */
export function calcRetrogrades(date: Date): Record<string, boolean> {
  const before = calcPlanetLongitudes(new Date(date.getTime() - 43200000));
  const after  = calcPlanetLongitudes(new Date(date.getTime() + 43200000));
  const result: Record<string, boolean> = {};
  for (const name of Object.keys(before)) {
    result[name] = deltaDeg(after[name], before[name]) < 0;
  }
  return result;
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

// ---- Zodiac sign transition dates ----------------------------

// Mean rate of change of the Sun's ecliptic longitude, degrees/day
const MEAN_SUN_RATE = 360 / 365.2422;

/** Find the nearest date (forward or backward from `now`) at which the Sun's
 *  ecliptic longitude crosses `targetLon`, refined via a few Newton-style
 *  iterations against the actual longitude function.
 */
function findSunLongitudeCrossing(targetLon: number, now: Date, direction: 'forward' | 'backward'): Date {
  const currentLon = calcPlanetLongitudes(now).Sun;
  const rawDiff = direction === 'forward'
    ? ((targetLon - currentLon + 360) % 360)
    : ((currentLon - targetLon + 360) % 360);
  const sign = direction === 'forward' ? 1 : -1;
  let estDate = new Date(now.getTime() + sign * (rawDiff / MEAN_SUN_RATE) * 86400000);
  for (let i = 0; i < 5; i++) {
    const lonAtEst = calcPlanetLongitudes(estDate).Sun;
    const err = (((targetLon - lonAtEst + 540) % 360) - 180); // shortest signed diff
    estDate = new Date(estDate.getTime() + (err / MEAN_SUN_RATE) * 86400000);
  }
  return estDate;
}

/** Returns the nearest past and upcoming date the Sun enters zodiac sign `signIndex` (0=Aries...11=Pisces) */
export function getZodiacSignOccurrence(signIndex: number, now: Date): { next: Date; last: Date } {
  const targetLon = signIndex * 30;
  return {
    next: findSunLongitudeCrossing(targetLon, now, 'forward'),
    last: findSunLongitudeCrossing(targetLon, now, 'backward'),
  };
}

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
