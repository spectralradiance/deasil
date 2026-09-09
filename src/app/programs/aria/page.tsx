// Aria — a generative music tracker. Phase 3: a multi-track pattern grid.
// The audio engine lives in audio/ and never touches React; this page only
// reads and writes the song, and pushes it into the session.

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Divider, Paper, Stack, Typography } from '@mui/material';
import { AriaSession } from './audio/AriaSession';
import { DEFAULT_INSTRUMENT } from './audio/InstrumentParams';
import { Scale, type ScaleName } from './lib/scale';
import { generateArpeggio, generatePhrase, randomSeed } from './lib/generate';
import {
  addTrack, clearTrack, createSong, fillTrack, removeTrack, rotateTrack,
  setStep as setSongStep, setStepCount, transposeTrack, updateTrack, type Song,
  type StepSlot,
} from './lib/song';
import { loadSong, saveSong } from './lib/serialize';
import TransportBar from './components/TransportBar';
import TrackHeaders from './components/TrackHeaders';
import TrackPanel from './components/TrackPanel';
import PatternGrid, { type Cursor } from './components/PatternGrid';
import GeneratorPanel, { type GeneratorSettings } from './components/GeneratorPanel';
import InstrumentPanel from './components/InstrumentPanel';

const INITIAL_GENERATOR: GeneratorSettings = {
  kind: 'walk',
  scaleName: 'dorian',
  root: 'C3',
  low: -5,
  high: 7,
  restDensity: 0.25,
  stepwise: 0.7,
  seed: 20260909,
};

function Section({ title, action, children }: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="overline" sx={{ opacity: 0.6, letterSpacing: '0.12em' }}>
          {title}
        </Typography>
        {action}
      </Box>
      {children}
    </Paper>
  );
}

export default function AriaPage() {
  // Constructed once; it builds no AudioContext, so this is safe before any
  // user gesture.
  const [session] = useState(() => new AriaSession());

  const [song, setSong] = useState<Song>(createSong);
  const [playing, setPlaying] = useState(false);
  const [follow, setFollow] = useState(true);
  const [cursor, setCursor] = useState<Cursor>({ track: 0, step: 0 });
  const [octaveOffset, setOctaveOffset] = useState(0);
  const [gen, setGen] = useState<GeneratorSettings>(INITIAL_GENERATOR);
  const [loaded, setLoaded] = useState(false);

  // Restore the autosave after mount: localStorage is not available during the
  // server render, and reading it in an effect keeps hydration consistent.
  useEffect(() => {
    const stored = loadSong();
    if (stored) {
      setSong(stored);
      setGen((current) => ({ ...current, root: stored.key, scaleName: stored.scaleName }));
    }
    setLoaded(true);
  }, []);

  // Autosave, debounced so dragging a slider does not write on every frame.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveSong(song), 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [song, loaded]);

  useEffect(() => () => session.dispose(), [session]);

  // A bad key should not throw mid-render or silence the loop, so fall back to
  // the last good scale and let the field show the error.
  const { scale, rootError } = useMemo(() => {
    try {
      return { scale: new Scale(song.key, song.scaleName), rootError: false };
    } catch {
      return { scale: new Scale('C3', song.scaleName), rootError: true };
    }
  }, [song.key, song.scaleName]);

  // The one channel into the engine. Cheap on every render; it only touches Web
  // Audio when transport values or the track set actually change.
  useEffect(() => { session.setSong(song, scale); }, [session, song, scale]);

  const selectedTrack = song.tracks[Math.min(cursor.track, song.tracks.length - 1)];

  const handlePlay = useCallback(async () => {
    await session.start();
    setPlaying(true);
  }, [session]);

  const handleStop = useCallback(() => {
    session.stop();
    setPlaying(false);
  }, [session]);

  const togglePlay = useCallback(() => {
    if (playing) handleStop();
    else void handlePlay();
  }, [playing, handlePlay, handleStop]);

  const readStep = useCallback(() => session.getPlayingStep(), [session]);

  const handleSetStep = useCallback((trackIndex: number, stepIndex: number, step: StepSlot) => {
    setSong((current) => {
      const track = current.tracks[trackIndex];
      return track ? setSongStep(current, track.id, stepIndex, step) : current;
    });
  }, []);

  const buildPhrase = useCallback(() => {
    if (gen.kind === 'arpeggio') {
      return generateArpeggio(0, song.stepCount, [0, 2, 4], 2, scale.size);
    }
    return generatePhrase({
      length: song.stepCount,
      low: gen.low,
      high: gen.high,
      restDensity: gen.restDensity,
      stepwise: gen.stepwise,
      seed: gen.seed,
    });
  }, [gen, song.stepCount, scale.size]);

  const fillSelected = useCallback(() => {
    if (!selectedTrack) return;
    setSong((current) => fillTrack(current, selectedTrack.id, buildPhrase()));
  }, [selectedTrack, buildPhrase]);

  const reseedAndFill = useCallback(() => {
    const seed = randomSeed();
    setGen((current) => ({ ...current, seed }));
    if (!selectedTrack) return;
    const phrase = gen.kind === 'arpeggio'
      ? generateArpeggio(0, song.stepCount, [0, 2, 4], 2, scale.size)
      : generatePhrase({
          length: song.stepCount,
          low: gen.low,
          high: gen.high,
          restDensity: gen.restDensity,
          stepwise: gen.stepwise,
          seed,
        });
    setSong((current) => fillTrack(current, selectedTrack.id, phrase));
  }, [gen, selectedTrack, song.stepCount, scale.size]);

  // Key and mode belong to the song, so the generator panel edits it directly.
  const handleGenerator = useCallback((next: GeneratorSettings) => {
    setGen(next);
    setSong((current) =>
      current.key === next.root && current.scaleName === next.scaleName
        ? current
        : { ...current, key: next.root, scaleName: next.scaleName as ScaleName },
    );
  }, []);

  const instrumentId = selectedTrack?.instrumentId ?? '';
  const instrumentParams = song.instruments[instrumentId] ?? DEFAULT_INSTRUMENT;

  return (
    <Box sx={{ maxWidth: 980, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
      <Typography variant="h4" sx={{ mb: 0.5 }}>Aria</Typography>
      <Typography variant="body2" sx={{ opacity: 0.65, mb: 3 }}>
        A generative tracker. Patterns are written in scale degrees and played by
        synths you build yourself — so changing the key, the mode or a patch
        reshapes what is already looping, without stopping it.
      </Typography>

      <Stack spacing={2.5}>
        <Section title="Transport">
          <TransportBar
            session={session}
            playing={playing}
            onPlay={handlePlay}
            onStop={handleStop}
            bpm={song.bpm}
            onBpm={(bpm) => setSong((c) => ({ ...c, bpm }))}
            steps={song.stepCount}
            onSteps={(steps) => setSong((c) => setStepCount(c, steps))}
            follow={follow}
            onFollow={setFollow}
          />
        </Section>

        <Section
          title="Pattern"
          action={
            <Typography variant="caption" sx={{ opacity: 0.55 }}>
              octave {octaveOffset >= 0 ? `+${octaveOffset}` : octaveOffset} · [ and ] to shift
            </Typography>
          }
        >
          <TrackHeaders
            song={song}
            selected={cursor.track}
            onSelect={(track) => setCursor((c) => ({ ...c, track }))}
            onToggleMute={(id) =>
              setSong((c) => updateTrack(c, id, { mute: !c.tracks.find((t) => t.id === id)?.mute }))}
            onToggleSolo={(id) =>
              setSong((c) => updateTrack(c, id, { solo: !c.tracks.find((t) => t.id === id)?.solo }))}
            onAddTrack={() => setSong(addTrack)}
          />
          <PatternGrid
            song={song}
            scale={scale}
            cursor={cursor}
            onCursor={setCursor}
            onSetStep={handleSetStep}
            onTogglePlay={togglePlay}
            readStep={readStep}
            playing={playing}
            follow={follow}
            octaveOffset={octaveOffset}
            onOctaveOffset={setOctaveOffset}
          />
          <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mt: 1.5 }}>
            Click the grid, then type. <strong>z x c v b n m ,</strong> are scale
            degrees 0–7 and <strong>q w e r t y u i</strong> continue an octave
            above; digits enter a degree directly. Arrows move, Tab changes
            track, Delete clears, <strong>+</strong> and <strong>−</strong> nudge
            the note under the cursor, Space plays.
          </Typography>
        </Section>

        {selectedTrack && (
          <Section title={`Track — ${selectedTrack.name}`}>
            <TrackPanel
              song={song}
              track={selectedTrack}
              onPatch={(patch) => setSong((c) => updateTrack(c, selectedTrack.id, patch))}
              onFill={fillSelected}
              onClear={() => setSong((c) => clearTrack(c, selectedTrack.id))}
              onRotate={(by) => setSong((c) => rotateTrack(c, selectedTrack.id, by))}
              onTranspose={(by) => setSong((c) => transposeTrack(c, selectedTrack.id, by))}
              onRemove={() => setSong((c) => removeTrack(c, selectedTrack.id))}
              canRemove={song.tracks.length > 1}
            />
          </Section>
        )}

        <Section title="Generator">
          <Stack spacing={2.5}>
            <GeneratorPanel
              settings={gen}
              onChange={handleGenerator}
              onReseed={reseedAndFill}
              rootError={rootError}
            />
            <Divider />
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              Key and mode belong to the song: every track re-voices at once,
              because steps store degrees rather than pitches. <strong>Reseed</strong>{' '}
              rolls a new phrase into the selected track.
            </Typography>
          </Stack>
        </Section>

        <Section title={`Instrument — ${instrumentId}`}>
          <InstrumentPanel
            params={instrumentParams}
            onChange={(params) =>
              setSong((c) => ({ ...c, instruments: { ...c.instruments, [instrumentId]: params } }))}
          />
        </Section>
      </Stack>

      <Typography variant="caption" sx={{ display: 'block', opacity: 0.5, mt: 3 }}>
        Phase 3 of{' '}
        <Box component="span" sx={{ fontStyle: 'italic' }}>docs/aria-plan.md</Box>
        {' '}— next comes the generator panel per track, then the node-graph
        instrument editor. The song autosaves to this browser.
      </Typography>
    </Box>
  );
}
