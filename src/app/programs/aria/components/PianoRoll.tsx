// A piano roll of one lane: keyboard down the left, time running right.
//
// The pattern grid answers "what is on step 12". This answers "what shape is
// this phrase" — the thing a column of degree numbers cannot show you. It is
// also where a generator setting stops being abstract: raise the range and the
// notes visibly climb, add pulses and they visibly crowd.

'use client';
import React, { useMemo } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import type { Scale } from '../lib/scale';
import type { StepSlot } from '../lib/song';
import { Note } from '../lib/note';

interface Props {
  steps: StepSlot[];
  scale: Scale;
  stepsPerBeat: number;
  /** Note length as a multiple of the step, so overlaps are visible. */
  gate: number;
  height?: number;
}

const KEY_WIDTH = 30;
/** Semitones in an octave; the keyboard is drawn chromatically. */
const OCTAVE = 12;
const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);

export default function PianoRoll({ steps, scale, stepsPerBeat, gate, height = 190 }: Props) {
  const theme = useTheme();

  const model = useMemo(() => {
    const indices = steps
      .map((slot) => (slot ? scale.indexAt(slot.degree) : null))
      .filter((n): n is number => n !== null);

    if (indices.length === 0) return null;

    // Pad the range out to a comfortable window and snap to whole octaves, so
    // the keyboard always shows complete Cs rather than a floating slice.
    const lowest = Math.min(...indices);
    const highest = Math.max(...indices);
    const centre = (lowest + highest) / 2;
    const span = Math.max(highest - lowest + 4, OCTAVE);
    const from = Math.floor((centre - span / 2) / OCTAVE) * OCTAVE;
    const to = Math.ceil((centre + span / 2) / OCTAVE) * OCTAVE;

    return { from, to, rows: to - from, indices };
  }, [steps, scale]);

  if (!model) {
    return (
      <Typography variant="caption" sx={{ opacity: 0.55 }}>
        No notes in this lane yet — generate or type some in.
      </Typography>
    );
  }

  const { from, rows } = model;
  const rowHeight = Math.max(4, Math.min(11, height / rows));
  const gridHeight = rows * rowHeight;
  const stepWidth = 100 / Math.max(1, steps.length);

  const line = theme.palette.divider;
  const white = theme.palette.mode === 'dark' ? '#2a2a2a' : '#fafafa';
  const black = theme.palette.mode === 'dark' ? '#141414' : '#33333a';

  return (
    <Box>
      <Box sx={{ display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
        {/* keyboard */}
        <Box sx={{ width: KEY_WIDTH, flexShrink: 0, position: 'relative', height: gridHeight }}>
          {Array.from({ length: rows }, (_, r) => {
            // Row 0 is the top, so pitch descends as r increases.
            const index = from + rows - 1 - r;
            const pitchClass = ((index % OCTAVE) + OCTAVE) % OCTAVE;
            const isBlack = BLACK_KEYS.has(pitchClass);
            return (
              <Box
                key={r}
                sx={{
                  position: 'absolute', top: r * rowHeight, left: 0, right: 0, height: rowHeight,
                  backgroundColor: isBlack ? black : white,
                  borderBottom: '1px solid', borderColor: line,
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 0.4,
                  fontSize: 7.5, lineHeight: 1,
                  color: theme.palette.text.secondary,
                }}
              >
                {pitchClass === 0 ? new Note(index).shortName : ''}
              </Box>
            );
          })}
        </Box>

        {/* note area */}
        <Box sx={{ position: 'relative', flex: 1, height: gridHeight, backgroundColor: 'background.default' }}>
          {/* pitch lanes */}
          {Array.from({ length: rows }, (_, r) => {
            const index = from + rows - 1 - r;
            const pitchClass = ((index % OCTAVE) + OCTAVE) % OCTAVE;
            return (
              <Box
                key={`lane-${r}`}
                sx={{
                  position: 'absolute', top: r * rowHeight, left: 0, right: 0, height: rowHeight,
                  backgroundColor: BLACK_KEYS.has(pitchClass) ? 'action.hover' : 'transparent',
                  borderBottom: pitchClass === 0 ? '1px solid' : 'none',
                  borderColor: line,
                }}
              />
            );
          })}

          {/* beat lines */}
          {Array.from({ length: Math.ceil(steps.length / stepsPerBeat) }, (_, b) => (
            <Box
              key={`beat-${b}`}
              sx={{
                position: 'absolute', top: 0, bottom: 0,
                left: `${b * stepsPerBeat * stepWidth}%`,
                borderLeft: '1px solid', borderColor: line,
                opacity: b % 4 === 0 ? 0.9 : 0.4,
              }}
            />
          ))}

          {/* notes */}
          {steps.map((slot, i) => {
            if (!slot) return null;
            const index = scale.indexAt(slot.degree);
            const row = from + rows - 1 - index;
            if (row < 0 || row >= rows) return null;
            return (
              <Box
                key={`note-${i}`}
                title={`step ${i} · degree ${slot.degree} · ${new Note(index).shortName}`}
                sx={{
                  position: 'absolute',
                  top: row * rowHeight + 0.5,
                  height: Math.max(3, rowHeight - 1.5),
                  left: `${i * stepWidth}%`,
                  width: `${Math.max(stepWidth * gate, stepWidth * 0.6)}%`,
                  backgroundColor: 'primary.main',
                  borderRadius: 0.5,
                  opacity: 0.9,
                }}
              />
            );
          })}
        </Box>
      </Box>

      <Typography variant="caption" sx={{ opacity: 0.55, display: 'block', mt: 0.75 }}>
        Note length follows the track&apos;s gate, so notes that overrun their
        step — and so need the polyphony to hold them — overlap here.
      </Typography>
    </Box>
  );
}
