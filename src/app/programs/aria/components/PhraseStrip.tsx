// The phrase as a row of scale-degree cells, with the playhead moving across it.

'use client';
import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import type { Scale } from '../lib/scale';
import type { Phrase } from '../lib/generate';

interface Props {
  phrase: Phrase;
  scale: Scale;
  stepsPerBeat: number;
  /** Polled for the playing step; returns -1 when stopped. */
  readStep: () => number;
  playing: boolean;
  onToggleStep?: (index: number) => void;
}

export default function PhraseStrip({
  phrase,
  scale,
  stepsPerBeat,
  readStep,
  playing,
  onToggleStep,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // The playhead runs at 60Hz. Routing it through React state would re-render
  // the whole strip every frame and put render work between the scheduler and
  // the audio clock, so it moves a class on the DOM directly instead.
  useEffect(() => {
    if (!playing) return;
    // Captured here so the cleanup clears the highlight on the same element the
    // loop was painting, even if the ref has since moved on.
    const container = containerRef.current;
    let frame = 0;
    let painted = -1;

    const paint = () => {
      const step = readStep();
      if (step !== painted) {
        const cells = container?.children;
        if (cells) {
          if (painted >= 0) cells[painted]?.classList.remove('aria-on');
          if (step >= 0) cells[step]?.classList.add('aria-on');
        }
        painted = step;
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);

    return () => {
      cancelAnimationFrame(frame);
      const cells = container?.children;
      if (cells && painted >= 0) cells[painted]?.classList.remove('aria-on');
    };
  }, [playing, readStep]);

  return (
    <Box>
      <Box
        ref={containerRef}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '3px',
          '& .aria-cell': {
            minWidth: 40,
            py: 0.75,
            px: 0.5,
            textAlign: 'center',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: 14,
            fontVariantNumeric: 'tabular-nums',
            cursor: onToggleStep ? 'pointer' : 'default',
            userSelect: 'none',
            transition: 'background-color 80ms linear, color 80ms linear',
          },
          '& .aria-rest': { opacity: 0.35 },
          '& .aria-downbeat': { borderColor: 'text.secondary' },
          '& .aria-on': {
            backgroundColor: 'text.primary',
            color: 'background.paper',
            borderColor: 'text.primary',
          },
        }}
      >
        {phrase.map((degree, i) => {
          const classes = ['aria-cell'];
          if (degree === null) classes.push('aria-rest');
          if (i % stepsPerBeat === 0) classes.push('aria-downbeat');
          return (
            <Box
              component="span"
              key={i}
              className={classes.join(' ')}
              title={degree === null ? 'rest' : `degree ${degree} — ${scale.noteAt(degree).shortName}`}
              onClick={onToggleStep ? () => onToggleStep(i) : undefined}
            >
              {degree === null ? '·' : degree}
            </Box>
          );
        })}
      </Box>
      <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mt: 1 }}>
        Scale degrees, not semitones — change the key or the scale and the whole
        phrase moves with it. Click a cell to toggle it into a rest. Rests are ·
      </Typography>
    </Box>
  );
}
