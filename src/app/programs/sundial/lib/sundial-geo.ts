// Timezone utilities: UTC offset formatting and lat/lon → timezone lookup (tz-lookup → API fallback).

import tzlookup from 'tz-lookup';

export function getUtcOffset(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    return (parts.find(p => p.type === 'timeZoneName')?.value ?? '').replace('GMT', 'UTC');
  } catch { return ''; }
}

// Uses January to get the standard (non-DST) offset, matching the zone boundary data
export function getStandardUtcOffset(tz: string): string {
  try {
    const jan = new Date(new Date().getFullYear(), 0, 15);
    const parts = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(jan);
    return (parts.find(p => p.type === 'timeZoneName')?.value ?? '').replace('GMT', 'UTC');
  } catch { return ''; }
}

// geo-tz runs server-side via /api/timezone; tz-lookup handles most locations instantly
export async function lookupTimezone(lat: number, lon: number): Promise<string> {
  try { const tz = tzlookup(lat, lon); if (tz) return tz; } catch {}
  try {
    const res = await fetch(`/api/timezone?lat=${lat}&lon=${lon}`);
    if (res.ok) { const d = await res.json(); if (d.timezone) return d.timezone; }
  } catch {}
  return '';
}
