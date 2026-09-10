// Aria — a generative music tracker. Phase 5: the node-graph instrument.
// The audio engine lives in audio/ and never touches React; this page only
// reads and writes the song, and pushes it into the session.

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Chip, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { AriaSession } from './audio/AriaSession';
import type { InstrumentGraph } from './audio/graph';
import { GRAPH_PRESET_NAMES, presetGraph } from './audio/graph-presets';
import { Scale, type ScaleName } from './lib/scale';
import {
  addTrack, clearTrack, createSong, keepTrack, regenerateLiveTracks, regenerateTrack,
  removeTrack, reseedTrack, rotateTrack, setGenerator, setStep as setSongStep,
  setStepCount, transposeTrack, updateTrack,
  type Song, type StepSlot, type TrackGenerator,
} from './lib/song';
import { loadSong, saveSong } from './lib/serialize';
import TransportBar from './components/TransportBar';
import TrackHeaders from './components/TrackHeaders';
import TrackPanel from './components/TrackPanel';
import TrackGeneratorPanel from './components/TrackGeneratorPanel';
import PatternGrid, { type Cursor } from './components/PatternGrid';
import SongPanel from './components/SongPanel';
import GraphEditor from './components/instrument/GraphEditor';
import NodeInspector from './components/instrument/NodeInspector';

function Section({ title, action, children }: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
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
  const [loaded, setLoaded] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Restore the autosave after mount: localStorage is not available during the
  // server render, and reading it in an effect keeps hydration consistent.
  useEffect(() => {
    const stored = loadSong();
    if (stored) setSong(stored);
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
  const { scale, keyError } = useMemo(() => {
    try {
      return { scale: new Scale(song.key, song.scaleName), keyError: false };
    } catch {
      return { scale: new Scale('C3', song.scaleName), keyError: true };
    }
  }, [song.key, song.scaleName]);

  // The one channel into the engine. Cheap on every render; it only touches Web
  // Audio when transport values or the track set actually change.
  useEffect(() => { session.setSong(song, scale); }, [session, song, scale]);

  const selectedIndex = Math.min(cursor.track, song.tracks.length - 1);
  const selectedTrack = song.tracks[selectedIndex];

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

  /**
   * Hand-editing a live track keeps it first. Without that the edit would
   * survive only until the next re-roll, which is a confusing way to lose work.
   */
  const handleSetStep = useCallback((trackIndex: number, stepIndex: number, step: StepSlot) => {
    setSong((current) => {
      const track = current.tracks[trackIndex];
      if (!track) return current;
      const base = track.generator.live ? keepTrack(current, track.id) : current;
      return setSongStep(base, track.id, stepIndex, step);
    });
  }, []);

  const patchGenerator = useCallback((patch: Partial<TrackGenerator>) => {
    if (!selectedTrack) return;
    setSong((current) => setGenerator(current, selectedTrack.id, patch));
  }, [selectedTrack]);

  const handleScale = useCallback((scaleName: ScaleName) => {
    // Live tracks re-derive: an arpeggio in a pentatonic scale is not the same
    // set of degrees as one in a heptatonic scale.
    setSong((current) => regenerateLiveTracks({ ...current, scaleName }));
  }, []);

  const instrumentId = selectedTrack?.instrumentId ?? '';
  const instrumentGraph = song.instruments[instrumentId];
  const liveCount = song.tracks.filter((t) => t.generator.live).length;

  const setInstrumentGraph = useCallback((graph: InstrumentGraph) => {
    setSong((c) => ({ ...c, instruments: { ...c.instruments, [instrumentId]: graph } }));
  }, [instrumentId]);

  // Selecting a different patch should not leave the inspector pointing at a
  // node id that only existed in the previous one.
  useEffect(() => { setSelectedNodeId(null); }, [instrumentId]);

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

        <Section title="Song">
          <SongPanel
            songKey={song.key}
            scaleName={song.scaleName}
            onKey={(key) => setSong((c) => ({ ...c, key }))}
            onScale={handleScale}
            keyError={keyError}
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
            selected={selectedIndex}
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
          <Section
            title={`Generator — ${selectedTrack.name}`}
            action={
              liveCount > 0 ? (
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={`${liveCount} live track${liveCount === 1 ? '' : 's'}`}
                />
              ) : undefined
            }
          >
            <TrackGeneratorPanel
              generator={selectedTrack.generator}
              stepCount={song.stepCount}
              stepsPerBeat={song.stepsPerBeat}
              onChange={patchGenerator}
              onReseed={() => setSong((c) => reseedTrack(c, selectedTrack.id))}
              onKeep={() => setSong((c) => keepTrack(c, selectedTrack.id))}
              onGenerateOnce={() => setSong((c) => regenerateTrack(c, selectedTrack.id))}
            />
          </Section>
        )}

        {selectedTrack && (
          <Section title={`Track — ${selectedTrack.name}`}>
            <TrackPanel
              song={song}
              track={selectedTrack}
              onPatch={(patch) => setSong((c) => updateTrack(c, selectedTrack.id, patch))}
              onClear={() => setSong((c) => clearTrack(c, selectedTrack.id))}
              onRotate={(by) => setSong((c) => rotateTrack(c, selectedTrack.id, by))}
              onTranspose={(by) => setSong((c) => transposeTrack(c, selectedTrack.id, by))}
              onRemove={() => setSong((c) => removeTrack(c, selectedTrack.id))}
              canRemove={song.tracks.length > 1}
            />
          </Section>
        )}

        {instrumentGraph && (
          <Section
            title={`Instrument — ${instrumentId}`}
            action={
              <TextField
                select
                size="small"
                value=""
                onChange={(e) => setInstrumentGraph(presetGraph(e.target.value))}
                sx={{ width: 150 }}
                slotProps={{ select: { displayEmpty: true, renderValue: () => 'load preset…' } }}
              >
                {GRAPH_PRESET_NAMES.map((name) => (
                  <MenuItem key={name} value={name} sx={{ fontSize: 14 }}>{name}</MenuItem>
                ))}
              </TextField>
            }
          >
            <Stack spacing={2.5}>
              <GraphEditor
                graph={instrumentGraph}
                onChange={setInstrumentGraph}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
              <NodeInspector
                graph={instrumentGraph}
                onChange={setInstrumentGraph}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            </Stack>
          </Section>
        )}
      </Stack>

      <Typography variant="caption" sx={{ display: 'block', opacity: 0.5, mt: 3 }}>
        Phase 5 of{' '}
        <Box component="span" sx={{ fontStyle: 'italic' }}>docs/aria-plan.md</Box>
        {' '}— next comes visualization and song arrangement. The song autosaves
        to this browser.
      </Typography>
    </Box>
  );
}
