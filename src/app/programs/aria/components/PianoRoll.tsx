// An editable piano roll of one lane: keyboard down the left, time running right.
//
// The pattern grid answers "what is on step 12". This answers "what shape is
// this phrase" — the thing a column of degree numbers cannot show you. It is
// also where a generator setting stops being abstract: raise the range and the
// notes visibly climb, add pulses and they visibly crowd.
//
// It edits in *degrees* while drawing twelve chromatic rows per octave, so a
// dragged note snaps to the nearest degree of the lane's scale. You cannot drag
// a note out of the mode it is in, which is the whole premise made tangible.

'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  /** Writes one step. Pass null to clear it. */
  onSetStep?: (index: number, slot: StepSlot) => void;
  /** Polled for the playing row within this pattern; -1 when it is not playing. */
  readRow?: () => number;
  playing?: boolean;
}

const KEY_WIDTH = 30;
const OCTAVE = 12;
const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);
/** Pointer travel before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 3;

interface Drag {
  /** Where the note started, so the original slot can be cleared on drop. */
  fromStep: number;
  step: number;
  degree: number;
  moved: boolean;
  /** A press that began on empty space creates rather than moves. */
  creating: boolean;
}

export default function PianoRoll({
  steps, scale, stepsPerBeat, gate, height = 190, onSetStep, readRow, playing = false,
}: Props) {
  const theme = useTheme();
  const areaRef = useRef<HTMLDivElement | null>(null);
  const playheadRef = useRef<HTMLDivElement | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const editable = Boolean(onSetStep);

  const model = useMemo(() => {
    const indices = steps
      .map((slot) => (slot ? scale.indexAt(slot.degree) : null))
      .filter((n): n is number => n !== null);

    // An empty lane still needs a canvas to draw a note onto, so fall back to
    // an octave either side of the key rather than rendering nothing.
    const lowest = indices.length > 0 ? Math.min(...indices) : scale.root.index;
    const highest = indices.length > 0 ? Math.max(...indices) : scale.root.index + OCTAVE;
    const centre = (lowest + highest) / 2;
    const span = Math.max(highest - lowest + 4, OCTAVE * 2);
    const from = Math.floor((centre - span / 2) / OCTAVE) * OCTAVE;
    const to = Math.ceil((centre + span / 2) / OCTAVE) * OCTAVE;
    return { from, rows: to - from };
  }, [steps, scale]);

  const { from, rows } = model;
  const rowHeight = Math.max(4, Math.min(11, height / rows));
  const gridHeight = rows * rowHeight;
  const stepPercent = 100 / Math.max(1, steps.length);

  // 60Hz playhead, moved by transform rather than React state — the roll would
  // otherwise re-render every frame while you are trying to drag a note on it.
  useEffect(() => {
    if (!playing || !readRow) return;
    // Captured so the cleanup hides the same bar the loop was moving.
    const bar = playheadRef.current;
    let frame = 0;
    let painted = -1;
    const paint = () => {
      const row = readRow();
      if (row !== painted) {
        if (bar) {
          bar.style.opacity = row >= 0 ? '1' : '0';
          if (row >= 0) bar.style.transform = `translateX(${row * stepPercent}%)`;
        }
        painted = row;
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(frame);
      if (bar) bar.style.opacity = '0';
    };
  }, [playing, readRow, stepPercent]);

  /** Pointer position to a step column and a scale degree. */
  const locate = useCallback((clientX: number, clientY: number) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const step = Math.max(0, Math.min(steps.length - 1,
      Math.floor(((clientX - rect.left) / rect.width) * steps.length)));
    const row = Math.max(0, Math.min(rows - 1,
      Math.floor((clientY - rect.top) / rowHeight)));
    // Row 0 is the top, so pitch descends as the row index grows.
    const index = from + rows - 1 - row;
    return { step, degree: scale.degreeOf(index) };
  }, [steps.length, rows, rowHeight, from, scale]);

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    if (!editable) return;
    const at = locate(event.clientX, event.clientY);
    if (!at) return;
    // Capture keeps a drag alive when the pointer leaves the roll, but it
    // throws if the id is not an active pointer; losing capture is survivable,
    // losing the edit is not.
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      // Carry on without capture.
    }
    originRef.current = { x: event.clientX, y: event.clientY };
    setDrag({
      fromStep: at.step,
      step: at.step,
      degree: steps[at.step]?.degree ?? at.degree,
      moved: false,
      creating: steps[at.step] === null || steps[at.step] === undefined,
    });
  }, [editable, locate, steps]);

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!drag) return;
    const origin = originRef.current;
    const travelled = origin
      ? Math.abs(event.clientX - origin.x) + Math.abs(event.clientY - origin.y)
      : 0;
    const at = locate(event.clientX, event.clientY);
    if (!at) return;
    setDrag((current) => (current ? {
      ...current,
      step: at.step,
      degree: at.degree,
      moved: current.moved || travelled > DRAG_THRESHOLD,
    } : current));
  }, [drag, locate]);

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    const origin = originRef.current;
    const dragged = drag;
    setDrag(null);
    originRef.current = null;
    if (!dragged || !onSetStep) return;

    // Decide from where the pointer actually came up rather than from the last
    // move we happened to receive. A coarse pointer may deliver few move events
    // — or none — and a release far from the press is a drag either way.
    const at = locate(event.clientX, event.clientY);
    const travelled = origin
      ? Math.abs(event.clientX - origin.x) + Math.abs(event.clientY - origin.y)
      : 0;
    const current: Drag = {
      ...dragged,
      step: at ? at.step : dragged.step,
      degree: at ? at.degree : dragged.degree,
      moved: dragged.moved || travelled > DRAG_THRESHOLD,
    };

    if (!current.moved) {
      // A press that did not travel: create on empty space, delete on a note.
      if (current.creating) onSetStep(current.step, { degree: current.degree });
      else onSetStep(current.fromStep, null);
      return;
    }

    // A lane holds one note per step, so a move overwrites whatever it lands on.
    if (!current.creating && current.step !== current.fromStep) {
      onSetStep(current.fromStep, null);
    }
    onSetStep(current.step, { degree: current.degree });
  }, [drag, onSetStep, locate]);

  const line = theme.palette.divider;
  const white = theme.palette.mode === 'dark' ? '#2a2a2a' : '#fafafa';
  const black = theme.palette.mode === 'dark' ? '#141414' : '#33333a';

  const rendered = steps
    .map((slot, i) => (slot ? { step: i, degree: slot.degree } : null))
    .filter((n): n is { step: number; degree: number } => n !== null)
    // The dragged note is drawn from the drag state instead, so it does not
    // appear twice while in flight.
    .filter((n) => !(drag && drag.moved && !drag.creating && n.step === drag.fromStep));

  const noteAt = (step: number, degree: number, ghost: boolean) => {
    const index = scale.indexAt(degree);
    const row = from + rows - 1 - index;
    if (row < 0 || row >= rows) return null;
    return (
      <Box
        key={ghost ? 'drag' : `note-${step}`}
        title={`step ${step} · degree ${degree} · ${new Note(index).shortName}`}
        sx={{
          position: 'absolute',
          top: row * rowHeight + 0.5,
          height: Math.max(3, rowHeight - 1.5),
          left: `${step * stepPercent}%`,
          width: `${Math.max(stepPercent * gate, stepPercent * 0.6)}%`,
          backgroundColor: 'primary.main',
          borderRadius: 0.5,
          opacity: ghost ? 1 : 0.9,
          boxShadow: ghost ? 3 : 'none',
          pointerEvents: 'none',
        }}
      />
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
        <Box sx={{ width: KEY_WIDTH, flexShrink: 0, position: 'relative', height: gridHeight }}>
          {Array.from({ length: rows }, (_, r) => {
            const index = from + rows - 1 - r;
            const pitchClass = ((index % OCTAVE) + OCTAVE) % OCTAVE;
            return (
              <Box
                key={r}
                sx={{
                  position: 'absolute', top: r * rowHeight, left: 0, right: 0, height: rowHeight,
                  backgroundColor: BLACK_KEYS.has(pitchClass) ? black : white,
                  borderBottom: '1px solid', borderColor: line,
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 0.4,
                  fontSize: 7.5, lineHeight: 1, color: theme.palette.text.secondary,
                }}
              >
                {pitchClass === 0 ? new Note(index).shortName : ''}
              </Box>
            );
          })}
        </Box>

        <Box
          ref={areaRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          sx={{
            position: 'relative', flex: 1, height: gridHeight,
            backgroundColor: 'background.default',
            cursor: editable ? (drag ? 'grabbing' : 'crosshair') : 'default',
            touchAction: 'none',
          }}
        >
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
                  pointerEvents: 'none',
                }}
              />
            );
          })}

          {Array.from({ length: Math.ceil(steps.length / stepsPerBeat) }, (_, b) => (
            <Box
              key={`beat-${b}`}
              sx={{
                position: 'absolute', top: 0, bottom: 0,
                left: `${b * stepsPerBeat * stepPercent}%`,
                borderLeft: '1px solid', borderColor: line,
                opacity: b % 4 === 0 ? 0.9 : 0.4,
                pointerEvents: 'none',
              }}
            />
          ))}

          {rendered.map((n) => noteAt(n.step, n.degree, false))}
          {drag && drag.moved && noteAt(drag.step, drag.degree, true)}

          <Box
            ref={playheadRef}
            sx={{
              position: 'absolute', top: 0, bottom: 0, left: 0,
              width: `${stepPercent}%`,
              backgroundColor: 'primary.main',
              opacity: 0,
              mixBlendMode: theme.palette.mode === 'dark' ? 'screen' : 'multiply',
              pointerEvents: 'none',
            }}
          />
        </Box>
      </Box>

      <Typography variant="caption" sx={{ opacity: 0.55, display: 'block', mt: 0.75 }}>
        {editable
          ? 'Click empty space to add a note, click a note to remove it, drag to move one. Notes snap to the lane’s scale, and a lane holds one note per step, so a move overwrites what it lands on.'
          : 'Note length follows the track’s gate, so notes that overrun their step — and so need the polyphony to hold them — overlap here.'}
      </Typography>
    </Box>
  );
}
