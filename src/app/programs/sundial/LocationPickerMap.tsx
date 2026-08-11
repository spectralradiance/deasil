'use client';
import React from 'react';
import L from 'leaflet';
import { useTheme } from '@mui/material/styles';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';

interface Props {
  lat: number;
  lon: number;
  onChange: (lat: number, lon: number) => void;
}

type NominatimResult = { display_name: string; lat: string; lon: string };

const makePin = (color: string) => L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.6)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function ClickHandler({ onChange }: { onChange: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (e) => onChange(e.latlng.lat, e.latlng.lng) });
  return null;
}

function MapController({ target }: { target: [number, number] | null }) {
  const map = useMap();
  React.useEffect(() => { if (target) map.flyTo(target, 12); }, [target, map]);
  return null;
}

function tzOffsetHours(tz: string): number {
  try {
    // Use January to get standard (non-DST) offset; zone boundary data uses standard offsets
    const jan = new Date(new Date().getFullYear(), 0, 15);
    const s = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(jan).find(p => p.type === 'timeZoneName')?.value ?? '';
    const m = s.replace('GMT', 'UTC').match(/UTC([+-])(\d+)(?::(\d+))?/);
    if (!m) return 0;
    return (m[1] === '+' ? 1 : -1) * (parseInt(m[2]) + parseInt(m[3] ?? '0') / 60);
  } catch { return 0; }
}

export default function LocationPickerMap({ lat, lon, onChange }: Props) {
  const { palette } = useTheme();
  const isDark = palette.mode === 'dark';

  const [query, setQuery]         = React.useState('');
  const [results, setResults]     = React.useState<NominatimResult[]>([]);
  const [flyTarget, setFlyTarget] = React.useState<[number, number] | null>(null);

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const search = async () => {
    if (!query.trim()) return;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
      { headers: { 'Accept-Language': 'en' } },
    );
    setResults(await res.json());
  };

  const pick = (r: NominatimResult) => {
    const newLat = parseFloat(r.lat), newLon = parseFloat(r.lon);
    onChange(newLat, newLon);
    setFlyTarget([newLat, newLon]);
    setResults([]); setQuery('');
  };

  const inputSx: React.CSSProperties = {
    flex: 1, padding: '6px 10px', border: 'none', borderRadius: 4,
    background: isDark ? '#222' : '#fff', color: isDark ? '#fff' : '#000',
    fontSize: 13, outline: 'none', boxShadow: '0 1px 5px rgba(0,0,0,0.35)',
  };
  const btnSx: React.CSSProperties = {
    padding: '6px 12px', border: 'none', borderRadius: 4, cursor: 'pointer',
    background: isDark ? '#444' : '#e0e0e0', color: isDark ? '#fff' : '#000',
    fontSize: 13, boxShadow: '0 1px 5px rgba(0,0,0,0.25)',
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'absolute', top: 8, left: 48, right: 8, zIndex: 1000 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Search address..." style={inputSx} />
          <button onClick={search} style={btnSx}>Search</button>
        </div>
        {results.length > 0 && (
          <div style={{
            background: isDark ? '#222' : '#fff', borderRadius: 4, marginTop: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)', maxHeight: 200, overflowY: 'auto',
          }}>
            {results.map((r, i) => (
              <div key={i} onClick={() => pick(r)}
                style={{
                  padding: '7px 10px', cursor: 'pointer', fontSize: 12,
                  borderBottom: `1px solid ${isDark ? '#333' : '#eee'}`,
                  color: isDark ? '#ccc' : '#333',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = isDark ? '#333' : '#f5f5f5')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >{r.display_name}</div>
            ))}
          </div>
        )}
      </div>

      <MapContainer center={[lat, lon]} zoom={10} scrollWheelZoom
        style={{ width: '100%', height: 450, borderRadius: 4 }}
      >
        <TileLayer url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19} className={isDark ? 'leaflet-tiles-dark' : undefined}
        />
        <Marker position={[lat, lon]} icon={makePin(isDark ? '#90caf9' : '#1976d2')} />
        <ClickHandler onChange={onChange} />
        <MapController target={flyTarget} />
      </MapContainer>
    </div>
  );
}