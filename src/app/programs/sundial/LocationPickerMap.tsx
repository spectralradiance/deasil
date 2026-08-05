'use client';
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { IconButton } from '@mui/material';
import ZoomInIcon      from '@mui/icons-material/ZoomIn';
import ZoomOutIcon     from '@mui/icons-material/ZoomOut';
import FitScreenIcon   from '@mui/icons-material/FitScreen';
import MyLocationIcon  from '@mui/icons-material/MyLocation';

// Coordinate system matches the fla-shop equirectangular SVG (viewBox 0 0 2000 1280)
const W = 2000;
const H = 1280;

function geoToSvg(lon: number, lat: number): [number, number] {
  return [(lon + 180) / 360 * W, (90 - lat) / 180 * H];
}
function svgToGeo(x: number, y: number): [number, number] {
  return [
    Math.max(-180, Math.min(180, x / W * 360 - 180)),
    Math.max(-90,  Math.min(90,  90 - y / H * 180)),
  ];
}

interface Props {
  lat: number;
  lon: number;
  onChange: (lat: number, lon: number) => void;
}

type TF = { x: number; y: number; s: number };
const RESET: TF = { x: 0, y: 0, s: 1 };

export default function LocationPickerMap({ lat, lon, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tf, setTf] = useState<TF>(RESET);
  const drag = useRef<{ cx: number; cy: number; tx: number; ty: number } | null>(null);

  const toMap = useCallback((clientX: number, clientY: number): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect();
    return [
      ((clientX - r.left) / r.width  * W - tf.x) / tf.s,
      ((clientY - r.top)  / r.height * H - tf.y) / tf.s,
    ];
  }, [tf]);

  const placePin = useCallback((clientX: number, clientY: number) => {
    const [mx, my] = toMap(clientX, clientY);
    const [newLon, newLat] = svgToGeo(mx, my);
    onChange(newLat, newLon);
  }, [toMap, onChange]);

  const onMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    drag.current = { cx: e.clientX, cy: e.clientY, tx: tf.x, ty: tf.y };
    e.preventDefault();
  };
  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const r = svgRef.current!.getBoundingClientRect();
    const dx = (e.clientX - drag.current.cx) / r.width  * W;
    const dy = (e.clientY - drag.current.cy) / r.height * H;
    const tx = drag.current.tx;
    const ty = drag.current.ty;
    setTf(t => ({ ...t, x: tx + dx, y: ty + dy }));
  };
  const onMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (Math.abs(e.clientX - d.cx) < 4 && Math.abs(e.clientY - d.cy) < 4) placePin(e.clientX, e.clientY);
  };

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const r = svgRef.current!.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width  * W;
    const my = (e.clientY - r.top)  / r.height * H;
    const f  = e.deltaY < 0 ? 1.25 : 0.8;
    setTf(t => {
      const ns = Math.max(0.9, Math.min(16, t.s * f));
      return { s: ns, x: mx - (mx - t.x) * (ns / t.s), y: my - (my - t.y) * (ns / t.s) };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Non-passive so preventDefault actually stops page scroll
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const onTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    drag.current = { cx: t.clientX, cy: t.clientY, tx: tf.x, ty: tf.y };
  };
  const onTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!drag.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    const r = svgRef.current!.getBoundingClientRect();
    const dx = (t.clientX - drag.current.cx) / r.width  * W;
    const dy = (t.clientY - drag.current.cy) / r.height * H;
    const tx = drag.current.tx;
    const ty = drag.current.ty;
    setTf(prev => ({ ...prev, x: tx + dx, y: ty + dy }));
  };
  const onTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    if (Math.abs(t.clientX - d.cx) < 8 && Math.abs(t.clientY - d.cy) < 8) placePin(t.clientX, t.clientY);
  };

  const zoomBtn = (f: number) => setTf(t => {
    const ns = Math.max(0.9, Math.min(16, t.s * f));
    return { s: ns, x: W / 2 - (W / 2 - t.x) * (ns / t.s), y: H / 2 - (H / 2 - t.y) * (ns / t.s) };
  });

  const [px, py] = geoToSvg(lon, lat);
  const ts = tf.s;
  const theme = useTheme();
  const strokeColor  = theme.palette.mode === 'dark' ? '#ffffff' : '#222222';
  const borderColor  = strokeColor;

  const locateMe = () => navigator.geolocation?.getCurrentPosition(
    pos => onChange(pos.coords.latitude, pos.coords.longitude),
    () => {},
  );

  // Fetch and cache the two path d-strings so currentColor resolves from the outer SVG
  const [outlineD, setOutlineD]       = useState('');
  const [boundariesD, setBoundariesD] = useState('');
  useEffect(() => {
    fetch('/sundial/world.svg')
      .then(r => r.text())
      .then(text => {
        const get = (id: string) =>
          text.match(new RegExp(`id="${id}"[^>]*\\bd="([^"]+)`))?.[1] ?? '';
        setOutlineD(get('outline'));
        setBoundariesD(get('boundaries'));
      });
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: 280,
                   border: `1px solid ${borderColor}`, borderRadius: 4, boxSizing: 'border-box' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%" height="100%"
        style={{ display: 'block', cursor: 'crosshair', borderRadius: 4, touchAction: 'none', userSelect: 'none', color: strokeColor }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { drag.current = null; }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <g transform={`translate(${tf.x},${tf.y}) scale(${tf.s})`}>
          {outlineD    && <path d={outlineD}    fill="none" stroke="currentColor" strokeWidth={1}   vectorEffect="non-scaling-stroke" />}
          {boundariesD && <path d={boundariesD} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
          {/* Gold location circle, constant screen size via inverse zoom scaling */}
          <circle cx={px} cy={py} r={20/ts} fill="#D4A017" stroke="#8B6900" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', flexDirection: 'column' }}>
        {([
          { Icon: ZoomInIcon,     title: 'Zoom in',      act: () => zoomBtn(1.5)  },
          { Icon: ZoomOutIcon,    title: 'Zoom out',     act: () => zoomBtn(0.67) },
          { Icon: FitScreenIcon,  title: 'Reset view',   act: () => setTf(RESET)  },
          { Icon: MyLocationIcon, title: 'My location',  act: locateMe            },
        ] as const).map(({ Icon, title, act }) => (
          <IconButton key={title} size="small" onClick={act} title={title}
            sx={{ color: '#D4A017', p: 0.25 }}>
            <Icon fontSize="small" />
          </IconButton>
        ))}
      </div>
    </div>
  );
}