// The tracker matrix: rows are steps, columns are tracks. Keyboard-first.

'use client';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Box } from '@mui/material';
import type { Scale } from '../lib/scale';
import type { Song, StepSlot } from '../lib/song';

export interface Cursor {
  track: number;
  step: number;
}

interface Props {
  song: Song;
  scale: Scale;
  cursor: Cursor;
  onCursor: (cursor: Cursor) => void;
  onSetStep: (trackIndex: number, stepIndex: number, step: StepSlot) => void;
  onTogglePlay: () => void;
  /** Polled for the playing step; -1 when stopped. */
  readStep: () => number;
  playing: boolean;
  follow: boolean;
  /** Degrees added to keyboard entry, in whole scale octaves. */
  octaveOffset: number;
  onOctaveOffset: (offset: number) => void;
}

const ROW_HEIGHT = 26;

/**
 * Keyboard note entry, adapted from the tracker convention.
 *
 * A classic tracker maps two rows of keys to chromatic semitones an octave
 * apart. Aria stores scale degrees, so the same two rows map to degrees
 * instead: the lower row walks the scale from the root, the upper row continues
 * an octave above it. That keeps the muscle memory and the shape of the layout
 * while staying in the mode you have chosen.
 */
const LOWER_ROW = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ','];
const UPPER_ROW = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i'];

function degreeForKey(key: string, scaleSize: number): number | null {
  const lower = LOWER_ROW.indexOf(key);
  if (lower !== -1) return lower;
  const upper = UPPER_ROW.indexOf(key);
  if (upper !== -1) return upper + scaleSize;
  return null;
}

interface RowProps {
  rowIndex: number;
  slots: StepSlot[];
  scale: Scale;
  cursorTrack: number;
  isCursorRow: boolean;
  beat: boolean;
  bar: boolean;
}

function rowsEqual(a: RowProps, b: RowProps): boolean {
  if (
    a.rowIndex !== b.rowIndex ||
    a.isCursorRow !== b.isCursorRow ||
    a.beat !== b.beat ||
    a.bar !== b.bar ||
    // The cells name the pitch each degree resolves to, so a change of key or
    // mode has to invalidate every row or the tooltips go stale.
    a.scale !== b.scale ||
    a.slots.length !== b.slots.length
  ) {
    return false;
  }
  // The cursor column only matters for the row the cursor is on.
  if ((a.isCursorRow || b.isCursorRow) && a.cursorTrack !== b.cursorTrack) return false;
  // setStep replaces only the edited slot, so identity comparison is enough.
  for (let i = 0; i < a.slots.length; ++i) if (a.slots[i] !== b.slots[i]) return false;
  return true;
}

const PatternRow = React.memo(function PatternRow({
  rowIndex, slots, scale, cursorTrack, isCursorRow, beat, bar,
}: RowProps) {
  return (
    <Box
      className="aria-row"
      data-step={rowIndex}
      sx={{
        display: 'flex',
        height: `${ROW_HEIGHT}px`,
        alignItems: 'stretch',
        backgroundColor: bar ? 'action.hover' : beat ? 'action.selected' : 'transparent',
      }}
    >
      <Box
        sx={{
          width: 40,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          pr: 1,
          opacity: bar ? 0.9 : 0.4,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: bar ? 600 : 400,
        }}
      >
        {String(rowIndex).padStart(2, '0')}
      </Box>
      {slots.map((slot, trackIndex) => (
        <Box
          key={trackIndex}
          className="aria-cell"
          data-track={trackIndex}
          data-step={rowIndex}
          title={slot ? `degree ${slot.degree} — ${scale.noteAt(slot.degree).shortName}` : ''}
          sx={{
            flex: '1 1 0',
            minWidth: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderLeft: '1px solid',
            borderColor: 'divider',
            outline: isCursorRow && trackIndex === cursorTrack ? '2px solid' : 'none',
            outlineColor: 'primary.main',
            outlineOffset: '-2px',
            opacity: slot ? 1 : 0.25,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {slot ? slot.degree : '··'}
        </Box>
      ))}
    </Box>
  );
}, rowsEqual);

export default function PatternGrid({
  song, scale, cursor, onCursor, onSetStep, onTogglePlay,
  readStep, playing, follow, octaveOffset, onOctaveOffset,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // 60Hz playhead. Never React state: it would re-render the whole grid every
  // frame and put render work between the scheduler and the audio clock.
  useEffect(() => {
    if (!playing) return;
    const body = bodyRef.current;
    const scroller = scrollRef.current;
    let frame = 0;
    let painted = -1;

    const paint = () => {
      const step = readStep();
      if (step !== painted && body) {
        body.children[painted]?.classList.remove('aria-playing');
        const row = body.children[step] as HTMLElement | undefined;
        row?.classList.add('aria-playing');
        if (follow && row && scroller) {
          scroller.scrollTop = row.offsetTop - scroller.clientHeight / 2 + ROW_HEIGHT / 2;
        }
        painted = step;
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);

    return () => {
      cancelAnimationFrame(frame);
      if (painted >= 0) body?.children[painted]?.classList.remove('aria-playing');
    };
  }, [playing, follow, readStep]);

  const moveCursor = useCallback(
    (dTrack: number, dStep: number) => {
      const track = Math.max(0, Math.min(song.tracks.length - 1, cursor.track + dTrack));
      const step = Math.max(0, Math.min(song.stepCount - 1, cursor.step + dStep));
      onCursor({ track, step });
    },
    [cursor, song.tracks.length, song.stepCount, onCursor],
  );

  const writeAndAdvance = useCallback(
    (slot: StepSlot) => {
      onSetStep(cursor.track, cursor.step, slot);
      if (cursor.step < song.stepCount - 1) onCursor({ ...cursor, step: cursor.step + 1 });
    },
    [cursor, song.stepCount, onSetStep, onCursor],
  );

  const handleKey = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key;

      switch (key) {
        case 'ArrowUp': event.preventDefault(); return moveCursor(0, -1);
        case 'ArrowDown': event.preventDefault(); return moveCursor(0, 1);
        case 'ArrowLeft': event.preventDefault(); return moveCursor(-1, 0);
        case 'ArrowRight': event.preventDefault(); return moveCursor(1, 0);
        case 'PageUp': event.preventDefault(); return moveCursor(0, -song.stepsPerBeat * 4);
        case 'PageDown': event.preventDefault(); return moveCursor(0, song.stepsPerBeat * 4);
        case 'Home': event.preventDefault(); return onCursor({ ...cursor, step: 0 });
        case 'End': event.preventDefault(); return onCursor({ ...cursor, step: song.stepCount - 1 });
        case 'Tab':
          event.preventDefault();
          return moveCursor(event.shiftKey ? -1 : 1, 0);
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          return writeAndAdvance(null);
        case ' ':
          event.preventDefault();
          return onTogglePlay();
        case '[':
          event.preventDefault();
          return onOctaveOffset(octaveOffset - 1);
        case ']':
          event.preventDefault();
          return onOctaveOffset(octaveOffset + 1);
        default:
          break;
      }

      // Nudge the note under the cursor rather than replacing it.
      if (key === '+' || key === '=' || key === '-') {
        const current = song.tracks[cursor.track]?.steps[cursor.step];
        if (current) {
          event.preventDefault();
          onSetStep(cursor.track, cursor.step, {
            ...current,
            degree: current.degree + (key === '-' ? -1 : 1),
          });
        }
        return;
      }

      if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        return writeAndAdvance({ degree: Number(key) + octaveOffset * scale.size });
      }

      const degree = degreeForKey(key.toLowerCase(), scale.size);
      if (degree !== null) {
        event.preventDefault();
        writeAndAdvance({ degree: degree + octaveOffset * scale.size });
      }
    },
    [
      cursor, moveCursor, octaveOffset, onCursor, onOctaveOffset, onSetStep,
      onTogglePlay, scale.size, song.stepsPerBeat, song.stepCount, song.tracks, writeAndAdvance,
    ],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      const cell = (event.target as HTMLElement).closest('.aria-cell');
      if (!cell) return;
      const track = Number(cell.getAttribute('data-track'));
      const step = Number(cell.getAttribute('data-step'));
      if (Number.isNaN(track) || Number.isNaN(step)) return;
      onCursor({ track, step });
    },
    [onCursor],
  );

  // Built once per song change and reused by every row, so the memo comparator
  // sees stable slot identities for rows that did not change.
  const rows = useMemo(
    () => Array.from({ length: song.stepCount }, (_, i) => song.tracks.map((t) => t.steps[i] ?? null)),
    [song.stepCount, song.tracks],
  );

  return (
    <Box
      ref={scrollRef}
      tabIndex={0}
      onKeyDown={handleKey}
      onClick={handleClick}
      sx={{
        maxHeight: 420,
        overflowY: 'auto',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: 13,
        outline: 'none',
        '&:focus-visible': { borderColor: 'primary.main' },
        '& .aria-row.aria-playing': { backgroundColor: 'primary.main' },
        '& .aria-row.aria-playing .aria-cell': { color: 'primary.contrastText' },
      }}
    >
      <Box ref={bodyRef}>
        {rows.map((slots, i) => (
          <PatternRow
            key={i}
            rowIndex={i}
            slots={slots}
            scale={scale}
            cursorTrack={cursor.track}
            isCursorRow={i === cursor.step}
            beat={i % song.stepsPerBeat === 0}
            bar={i % (song.stepsPerBeat * 4) === 0}
          />
        ))}
      </Box>
    </Box>
  );
}
