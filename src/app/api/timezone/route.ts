import { NextRequest, NextResponse } from 'next/server';
import { find } from 'geo-tz';

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get('lat') ?? '');
  const lon = parseFloat(req.nextUrl.searchParams.get('lon') ?? '');
  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180)
    return NextResponse.json({ error: 'invalid coordinates' }, { status: 400 });
  const tzs = find(lat, lon);
  return NextResponse.json({ timezone: tzs[0] ?? null });
}
