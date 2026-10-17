// A resonating plate and a water surface, both driven by the master bus.

'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';

/**
 * The oscilloscope and the spectrum are instruments: you read a number off
 * them. This is the other thing a visualiser can be — a physical system with
 * the audio as its forcing function, where you watch the music do something
 * rather than watch it be measured.
 *
 * Two systems, because they answer different questions. **Sand** is a Chladni
 * plate: grains on a vibrating square migrate off the antinodes and pile up on
 * the nodal lines, so what you see is the *shape* of the current resonance —
 * it holds still while the harmony holds still, and reorganises when the
 * harmony moves. **Water** is a wave equation with the transients dropped into
 * it, so what you see is the *rhythm* — every onset is a stone, and the
 * interference afterwards is the groove.
 *
 * Both run off the same analyser the meters use. Neither is a frequency
 * readout; if you want to know what note is playing, look at the spectrum.
 */

interface Props {
  /** Read lazily: the analyser does not exist until the engine starts. */
  getAnalyser: () => AnalyserNode | null;
  playing: boolean;
  height?: number;
}

type Mode = 'sand' | 'water';
type Rgb = readonly [number, number, number];

/**
 * Palettes are ramps from the quiet end to the loud end. Each is a short list
 * of stops interpolated in plain RGB — the ramps are close enough in
 * luminance that a perceptual space would not earn its arithmetic here.
 */
const PALETTES: Record<string, { label: string; stops: Rgb[] }> = {
  ember: {
    label: 'ember',
    stops: [[8, 5, 12], [72, 18, 24], [186, 58, 26], [240, 148, 52], [255, 238, 200]],
  },
  tide: {
    label: 'tide',
    stops: [[4, 10, 26], [12, 46, 92], [24, 118, 158], [86, 200, 208], [226, 250, 255]],
  },
  moss: {
    label: 'moss',
    stops: [[6, 12, 8], [22, 54, 32], [64, 122, 52], [146, 196, 78], [238, 250, 206]],
  },
  ultraviolet: {
    label: 'ultraviolet',
    stops: [[10, 4, 20], [52, 16, 86], [122, 36, 152], [214, 84, 176], [252, 222, 248]],
  },
  sodium: {
    label: 'sodium',
    stops: [[14, 10, 4], [64, 38, 6], [156, 96, 12], [232, 170, 44], [255, 244, 206]],
  },
  bone: {
    label: 'bone',
    stops: [[10, 10, 12], [46, 46, 52], [104, 104, 112], [176, 176, 184], [246, 246, 250]],
  },
  aurora: {
    label: 'aurora',
    stops: [[6, 12, 20], [10, 72, 86], [36, 166, 128], [132, 226, 150], [236, 255, 226]],
  },
};

const PALETTE_NAMES = Object.keys(PALETTES);

/** Samples a ramp at `t` in 0..1, writing into `out` to avoid allocating. */
function ramp(stops: Rgb[], t: number, out: Uint8ClampedArray, at: number): void {
  const clamped = t <= 0 ? 0 : t >= 1 ? 1 : t;
  const scaled = clamped * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(scaled));
  const f = scaled - i;
  const a = stops[i];
  const b = stops[i + 1];
  out[at] = a[0] + (b[0] - a[0]) * f;
  out[at + 1] = a[1] + (b[1] - a[1]) * f;
  out[at + 2] = a[2] + (b[2] - a[2]) * f;
  out[at + 3] = 255;
}

/** The same ramp as a CSS colour, for the canvas backdrop and the grains. */
function rampCss(stops: Rgb[], t: number): string {
  const clamped = t <= 0 ? 0 : t >= 1 ? 1 : t;
  const scaled = clamped * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(scaled));
  const f = scaled - i;
  const a = stops[i];
  const b = stops[i + 1];
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r}, ${g}, ${bl})`;
}

const PARTICLES = 3200;
/** Water is simulated coarse and blitted up; the ripples are low-frequency anyway. */
const WATER_W = 192;
const WATER_H = 108;

export default function ResonanceField({ getAnalyser, playing, height = 260 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<Mode>('sand');
  const [palette, setPalette] = useState<string>('ember');

  // Read through refs inside the animation loop so changing either control
  // does not tear down and restart the simulation — the sand keeps its pile,
  // the water keeps its waves.
  const modeRef = useRef(mode);
  const paletteRef = useRef(palette);
  modeRef.current = mode;
  paletteRef.current = palette;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ---- sand state ----
    const px = new Float32Array(PARTICLES);
    const py = new Float32Array(PARTICLES);
    for (let i = 0; i < PARTICLES; ++i) {
      px[i] = Math.random();
      py[i] = Math.random();
    }
    // The plate's current mode numbers, eased towards the audio's so the
    // figure morphs between resonances instead of snapping between them.
    let modeM = 3;
    let modeN = 4;

    // ---- water state ----
    const cells = WATER_W * WATER_H;
    let cur = new Float32Array(cells);
    let prev = new Float32Array(cells);
    const image = ctx.createImageData(WATER_W, WATER_H);
    // The simulation grid is blitted up to the canvas through this.
    const scratch = document.createElement('canvas');
    scratch.width = WATER_W;
    scratch.height = WATER_H;
    const scratchCtx = scratch.getContext('2d');

    let frame = 0;
    let time: Uint8Array<ArrayBuffer> | null = null;
    let freq: Uint8Array<ArrayBuffer> | null = null;
    let loudness = 0;
    let previousLoudness = 0;

    const fit = () => {
      const ratio = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
        canvas.width = Math.round(w * ratio);
        canvas.height = Math.round(h * ratio);
      }
      return { w, h, ratio };
    };

    /** Loudness, and where in the spectrum the energy sits (0 low, 1 high). */
    const listen = (): { level: number; centroid: number; low: number } => {
      const analyser = getAnalyser();
      if (!analyser) return { level: 0, centroid: 0.5, low: 0 };

      if (!time || time.length !== analyser.fftSize) {
        time = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      }
      if (!freq || freq.length !== analyser.frequencyBinCount) {
        freq = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      }
      analyser.getByteTimeDomainData(time);
      analyser.getByteFrequencyData(freq);

      let sum = 0;
      for (let i = 0; i < time.length; ++i) {
        const v = (time[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / time.length);

      // Weighted mean bin, on a log axis so the centroid is not dragged to the
      // top by a handful of quiet high bins.
      let weighted = 0;
      let total = 0;
      let lowEnergy = 0;
      const bins = freq.length;
      for (let i = 1; i < bins; ++i) {
        const v = freq[i] / 255;
        const position = Math.log(i) / Math.log(bins);
        weighted += position * v;
        total += v;
        if (position < 0.25) lowEnergy += v;
      }
      return {
        level: Math.min(1, rms * 2.6),
        centroid: total > 0 ? weighted / total : 0.5,
        low: Math.min(1, lowEnergy / Math.max(1, bins * 0.25) * 3),
      };
    };

    // ---- sand ----------------------------------------------------------------
    //
    // The Chladni figure for a square plate clamped at its centre. Grains are
    // shaken in proportion to |f|, so they random-walk away from the
    // antinodes and come to rest where f is zero: the nodal lines. Nothing
    // draws the lines — they are just where the grains stop moving.
    const chladni = (x: number, y: number, m: number, n: number): number => {
      const pi = Math.PI;
      return Math.cos(n * pi * x) * Math.cos(m * pi * y)
        - Math.cos(m * pi * x) * Math.cos(n * pi * y);
    };

    const paintSand = (w: number, h: number, ratio: number, heard: ReturnType<typeof listen>) => {
      const stops = PALETTES[paletteRef.current].stops;

      // Ease the plate towards the mode numbers the audio is asking for. The
      // ranges are chosen to stay in the figures that read as patterns rather
      // than as noise.
      const targetN = 1 + heard.centroid * 8;
      const targetM = 1 + heard.low * 7;
      modeN += (targetN - modeN) * 0.02;
      modeM += (targetM - modeM) * 0.02;

      // Silence should settle, not freeze solid: a floor keeps the grains
      // breathing so a stopped transport still looks alive.
      const shake = 0.0016 + heard.level * 0.03;

      for (let i = 0; i < PARTICLES; ++i) {
        const value = Math.abs(chladni(px[i], py[i], modeM, modeN));
        const step = shake * (value * value + 0.02);
        let nx = px[i] + (Math.random() - 0.5) * step * 2;
        let ny = py[i] + (Math.random() - 0.5) * step * 2;
        // Reflect at the rim; wrapping would tear the figure in half.
        if (nx < 0) nx = -nx;
        if (nx > 1) nx = 2 - nx;
        if (ny < 0) ny = -ny;
        if (ny > 1) ny = 2 - ny;
        px[i] = nx;
        py[i] = ny;
      }

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = rampCss(stops, 0);
      ctx.fillRect(0, 0, w, h);

      // The plate is square; centre it and letterbox the remainder.
      const size = Math.min(w, h);
      const ox = (w - size) / 2;
      const oy = (h - size) / 2;

      const grain = Math.max(1, size / 420);
      ctx.fillStyle = rampCss(stops, 0.72 + heard.level * 0.28);
      ctx.globalAlpha = 0.85;
      for (let i = 0; i < PARTICLES; ++i) {
        ctx.fillRect(ox + px[i] * size, oy + py[i] * size, grain, grain);
      }
      ctx.globalAlpha = 1;
    };

    // ---- water ---------------------------------------------------------------
    //
    // The classic two-buffer wave equation: the next height at a cell is the
    // mean of its neighbours minus what it was last frame, damped. Onsets drop
    // stones into it; the interference afterwards is free.
    const drop = (cx: number, cy: number, strength: number, radius: number) => {
      const x0 = Math.max(1, Math.round(cx - radius));
      const x1 = Math.min(WATER_W - 2, Math.round(cx + radius));
      const y0 = Math.max(1, Math.round(cy - radius));
      const y1 = Math.min(WATER_H - 2, Math.round(cy + radius));
      for (let y = y0; y <= y1; ++y) {
        for (let x = x0; x <= x1; ++x) {
          const dx = x - cx;
          const dy = y - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > radius) continue;
          cur[y * WATER_W + x] -= strength * Math.cos((d / radius) * Math.PI * 0.5);
        }
      }
    };

    const paintWater = (w: number, h: number, ratio: number, heard: ReturnType<typeof listen>) => {
      const stops = PALETTES[paletteRef.current].stops;

      // A transient is a rise in loudness, not loudness itself — otherwise a
      // sustained pad would hammer the surface forever.
      const attack = heard.level - previousLoudness;
      if (attack > 0.045) {
        drop(
          WATER_W * (0.12 + heard.centroid * 0.76),
          WATER_H * (0.78 - heard.low * 0.56),
          attack * 240,
          3 + heard.low * 5,
        );
      }
      previousLoudness = heard.level;

      for (let y = 1; y < WATER_H - 1; ++y) {
        const row = y * WATER_W;
        for (let x = 1; x < WATER_W - 1; ++x) {
          const i = row + x;
          const next = (cur[i - 1] + cur[i + 1] + cur[i - WATER_W] + cur[i + WATER_W]) / 2
            - prev[i];
          prev[i] = next * 0.976;
        }
      }
      const swap = cur;
      cur = prev;
      prev = swap;

      const data = image.data;
      for (let y = 0; y < WATER_H; ++y) {
        const row = y * WATER_W;
        for (let x = 0; x < WATER_W; ++x) {
          const i = row + x;
          // Slope across the cell reads as a highlight, which is what makes a
          // height field look like a lit surface rather than a heat map.
          const left = x > 0 ? cur[i - 1] : cur[i];
          const right = x < WATER_W - 1 ? cur[i + 1] : cur[i];
          const shade = 0.5 + cur[i] * 0.021 + (right - left) * 0.03;
          ramp(stops, shade, data, i * 4);
        }
      }

      if (scratchCtx) {
        scratchCtx.putImageData(image, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(scratch, 0, 0, canvas.width, canvas.height);
      }
    };

    const paint = () => {
      frame = requestAnimationFrame(paint);
      const { w, h, ratio } = fit();
      if (w === 0 || h === 0) return;

      const heard = listen();
      // Smooth the level a little; a per-frame RMS is jumpy enough to make the
      // sand jitter visibly at the frame rate.
      loudness += (heard.level - loudness) * 0.25;
      const smoothed = { ...heard, level: loudness };

      if (modeRef.current === 'sand') paintSand(w, h, ratio, smoothed);
      else paintWater(w, h, ratio, smoothed);
    };

    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [getAnalyser]);

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 1 }}
      >
        <TextField
          select
          size="small"
          label="field"
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          sx={{ width: 140 }}
        >
          <MenuItem value="sand" sx={{ fontSize: 14 }}>vibrating sand</MenuItem>
          <MenuItem value="water" sx={{ fontSize: 14 }}>water</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="colour"
          value={palette}
          onChange={(e) => setPalette(e.target.value)}
          sx={{ width: 160 }}
        >
          {PALETTE_NAMES.map((name) => (
            <MenuItem key={name} value={name} sx={{ fontSize: 14 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 34,
                    height: 12,
                    borderRadius: 0.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    background: `linear-gradient(to right, ${PALETTES[name].stops
                      .map((_, i, all) => rampCss(PALETTES[name].stops, i / (all.length - 1)))
                      .join(', ')})`,
                  }}
                />
                <span>{PALETTES[name].label}</span>
              </Stack>
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Box
        component="canvas"
        ref={canvasRef}
        sx={{
          width: '100%',
          height,
          display: 'block',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          backgroundColor: 'background.default',
        }}
      />

      <Typography variant="caption" sx={{ opacity: 0.55, display: 'block', mt: 0.75 }}>
        {mode === 'sand'
          ? 'A Chladni plate: grains are shaken hardest where the plate moves most, so they migrate to the nodal lines and stay there. The figure follows the spectrum — bass sets one mode number, brightness the other — so it holds while the harmony holds and reorganises when it moves.'
          : 'A wave equation with the transients dropped into it. Every onset is a stone; where it lands follows the spectrum, and everything after it is interference.'}
        {!playing && ' Press play to drive it.'}
      </Typography>
    </Box>
  );
}
