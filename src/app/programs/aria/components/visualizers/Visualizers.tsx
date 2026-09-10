// Oscilloscope, spectrum and a peak meter, all driven from one rAF loop.

'use client';
import React, { useEffect, useRef } from 'react';
import { Box, Typography, useTheme } from '@mui/material';

interface Props {
  /** Read lazily: the analyser does not exist until the engine starts. */
  getAnalyser: () => AnalyserNode | null;
  playing: boolean;
  height?: number;
}

/**
 * These are per-frame redraws of live audio, not data visualisation, so they
 * paint straight onto a canvas. One loop drives all three — waking three
 * separate rAF callbacks to read the same analyser would be wasteful, and they
 * would tear against each other.
 */
export default function Visualizers({ getAnalyser, playing, height = 120 }: Props) {
  const theme = useTheme();
  const scopeRef = useRef<HTMLCanvasElement | null>(null);
  const spectrumRef = useRef<HTMLCanvasElement | null>(null);
  const meterRef = useRef<HTMLDivElement | null>(null);
  const peakRef = useRef(0);

  useEffect(() => {
    const scope = scopeRef.current;
    const spectrum = spectrumRef.current;
    const meter = meterRef.current;
    if (!scope || !spectrum) return;

    const scopeCtx = scope.getContext('2d');
    const spectrumCtx = spectrum.getContext('2d');
    if (!scopeCtx || !spectrumCtx) return;

    const line = theme.palette.primary.main;
    const dim = theme.palette.divider;
    const bars = theme.palette.text.secondary;

    let frame = 0;
    let time: Uint8Array<ArrayBuffer> | null = null;
    let freq: Uint8Array<ArrayBuffer> | null = null;

    /** Canvases need their backing store sized in device pixels to stay sharp. */
    const fit = (canvas: HTMLCanvasElement) => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== width * ratio || canvas.height !== h * ratio) {
        canvas.width = width * ratio;
        canvas.height = h * ratio;
      }
      return { width, height: h, ratio };
    };

    const paint = () => {
      frame = requestAnimationFrame(paint);
      const analyser = getAnalyser();

      const s = fit(scope);
      const f = fit(spectrum);
      scopeCtx.setTransform(s.ratio, 0, 0, s.ratio, 0, 0);
      spectrumCtx.setTransform(f.ratio, 0, 0, f.ratio, 0, 0);
      scopeCtx.clearRect(0, 0, s.width, s.height);
      spectrumCtx.clearRect(0, 0, f.width, f.height);

      // Centre line, drawn whether or not anything is playing so the panel
      // never looks broken when stopped.
      scopeCtx.strokeStyle = dim;
      scopeCtx.lineWidth = 1;
      scopeCtx.beginPath();
      scopeCtx.moveTo(0, s.height / 2);
      scopeCtx.lineTo(s.width, s.height / 2);
      scopeCtx.stroke();

      if (!analyser) return;

      if (!time || time.length !== analyser.fftSize) {
        time = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      }
      if (!freq || freq.length !== analyser.frequencyBinCount) {
        freq = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      }

      analyser.getByteTimeDomainData(time);
      analyser.getByteFrequencyData(freq);

      // ---- oscilloscope ----
      scopeCtx.strokeStyle = line;
      scopeCtx.lineWidth = 1.5;
      scopeCtx.beginPath();
      let peak = 0;
      for (let i = 0; i < time.length; ++i) {
        const value = (time[i] - 128) / 128;
        if (Math.abs(value) > peak) peak = Math.abs(value);
        const x = (i / (time.length - 1)) * s.width;
        const y = s.height / 2 - value * (s.height / 2 - 2);
        if (i === 0) scopeCtx.moveTo(x, y);
        else scopeCtx.lineTo(x, y);
      }
      scopeCtx.stroke();

      // ---- spectrum ----
      // Bins are linear in frequency, so a linear x axis spends most of its
      // width on treble nobody is looking at. Lay them out logarithmically.
      const binCount = freq.length;
      const barCount = Math.min(72, Math.floor(f.width / 4));
      spectrumCtx.fillStyle = bars;
      for (let i = 0; i < barCount; ++i) {
        const from = Math.floor(Math.pow(binCount, i / barCount));
        const to = Math.max(from + 1, Math.floor(Math.pow(binCount, (i + 1) / barCount)));
        let sum = 0;
        for (let b = from; b < to && b < binCount; ++b) sum += freq[b];
        const value = sum / Math.max(1, to - from) / 255;
        const barWidth = f.width / barCount;
        const barHeight = value * f.height;
        spectrumCtx.fillRect(i * barWidth, f.height - barHeight, barWidth - 1, barHeight);
      }

      // ---- peak meter ----
      // Fall slowly so a transient stays readable instead of flickering.
      peakRef.current = Math.max(peak, peakRef.current * 0.94);
      if (meter) meter.style.transform = `scaleX(${Math.min(1, peakRef.current)})`;
    };

    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [getAnalyser, theme]);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {[
          { label: 'waveform', ref: scopeRef },
          { label: 'spectrum', ref: spectrumRef },
        ].map(({ label, ref }) => (
          <Box key={label} sx={{ flex: '1 1 280px', minWidth: 240 }}>
            <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mb: 0.5 }}>
              {label}
            </Typography>
            <Box
              component="canvas"
              ref={ref}
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
          </Box>
        ))}
      </Box>

      <Box sx={{ mt: 1.5 }}>
        <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mb: 0.5 }}>
          peak
        </Typography>
        <Box
          sx={{
            height: 8,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            backgroundColor: 'background.default',
          }}
        >
          <Box
            ref={meterRef}
            sx={{
              height: '100%',
              width: '100%',
              transformOrigin: 'left center',
              transform: 'scaleX(0)',
              backgroundColor: 'primary.main',
            }}
          />
        </Box>
      </Box>

      {!playing && (
        <Typography variant="caption" sx={{ opacity: 0.5, display: 'block', mt: 1 }}>
          Press play to see the master bus.
        </Typography>
      )}
    </Box>
  );
}
