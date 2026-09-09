// Aria — a generative music tracker. Phase 2: one track, a seeded phrase, and a
// subtractive voice. The audio engine lives in audio/ and never touches React;
// this page only reads and writes its state.

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Divider, Paper, Stack, Typography } from '@mui/material';
import { AriaSession } from './audio/AriaSession';
import { DEFAULT_INSTRUMENT, type InstrumentParams } from './audio/InstrumentParams';
import { Scale, type ScaleName } from './lib/scale';
import { generateArpeggio, generatePhrase, randomSeed, type Phrase } from './lib/generate';
import TransportBar from './components/TransportBar';
import PhraseStrip from './components/PhraseStrip';
import GeneratorPanel, { type GeneratorSettings } from './components/GeneratorPanel';
import InstrumentPanel from './components/InstrumentPanel';

const STEPS_PER_BEAT = 4;

const INITIAL_GENERATOR: GeneratorSettings = {
  kind: 'walk',
  scaleName: 'dorian',
  root: 'C3',
  low: -5,
  high: 7,
  restDensity: 0.15,
  stepwise: 0.7,
  seed: 20260909,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Typography
        variant="overline"
        sx={{ display: 'block', opacity: 0.6, letterSpacing: '0.12em', mb: 2 }}
      >
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

export default function AriaPage() {
  // Created once and kept for the life of the page. The constructor builds no
  // AudioContext, so this is safe before any user gesture.
  const [session] = useState(() => new AriaSession());

  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(110);
  const [steps, setSteps] = useState(16);
  const [polyphony, setPolyphony] = useState(8);
  const [gen, setGen] = useState<GeneratorSettings>(INITIAL_GENERATOR);
  const [params, setParams] = useState<InstrumentParams>(DEFAULT_INSTRUMENT);
  const [preset, setPreset] = useState('default');
  const [mutedSteps, setMutedSteps] = useState<ReadonlySet<number>>(new Set());

  useEffect(() => () => session.dispose(), [session]);

  // A bad key should not throw mid-render or silence the loop, so fall back to
  // the last good scale and let the field show the error.
  const { scale, rootError } = useMemo(() => {
    try {
      return { scale: new Scale(gen.root, gen.scaleName as ScaleName), rootError: false };
    } catch {
      return { scale: new Scale('C3', gen.scaleName as ScaleName), rootError: true };
    }
  }, [gen.root, gen.scaleName]);

  const phrase: Phrase = useMemo(() => {
    const generated =
      gen.kind === 'arpeggio'
        ? generateArpeggio(0, steps, [0, 2, 4], 2, scale.size)
        : generatePhrase({
            length: steps,
            low: gen.low,
            high: gen.high,
            restDensity: gen.restDensity,
            stepwise: gen.stepwise,
            seed: gen.seed,
          });
    return generated.map((degree, i) => (mutedSteps.has(i) ? null : degree));
  }, [gen, steps, scale.size, mutedSteps]);

  // Push UI state into the engine. The scheduler reads these at step time, so
  // edits land on the next step without interrupting playback.
  useEffect(() => { session.update({ phrase, scale }); }, [session, phrase, scale]);
  useEffect(() => { session.update({ params }); }, [session, params]);
  useEffect(() => { session.setBpm(bpm); }, [session, bpm]);
  useEffect(() => { session.setStepCount(steps); }, [session, steps]);
  useEffect(() => { session.setPolyphony(polyphony); }, [session, polyphony]);

  const handlePlay = useCallback(async () => {
    await session.start();
    setPlaying(true);
  }, [session]);

  const handleStop = useCallback(() => {
    session.stop();
    setPlaying(false);
  }, [session]);

  const readStep = useCallback(() => session.getPlayingStep(), [session]);

  const toggleStep = useCallback((index: number) => {
    setMutedSteps((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const reseed = useCallback(() => {
    setMutedSteps(new Set());
    setGen((current) => ({ ...current, seed: randomSeed() }));
  }, []);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
      <Typography variant="h4" sx={{ mb: 0.5 }}>Aria</Typography>
      <Typography variant="body2" sx={{ opacity: 0.65, mb: 3 }}>
        A generative tracker. Phrases are written in scale degrees and played by
        a synth you build yourself — so changing the key, the mode or the patch
        reshapes what is already looping, without stopping it.
      </Typography>

      <Stack spacing={2.5}>
        <Section title="Transport">
          <TransportBar
            session={session}
            playing={playing}
            onPlay={handlePlay}
            onStop={handleStop}
            bpm={bpm}
            onBpm={setBpm}
            steps={steps}
            onSteps={setSteps}
            polyphony={polyphony}
            onPolyphony={setPolyphony}
          />
        </Section>

        <Section title="Phrase">
          <Stack spacing={2.5}>
            <PhraseStrip
              phrase={phrase}
              scale={scale}
              stepsPerBeat={STEPS_PER_BEAT}
              readStep={readStep}
              playing={playing}
              onToggleStep={toggleStep}
            />
            <Divider />
            <GeneratorPanel
              settings={gen}
              onChange={setGen}
              onReseed={reseed}
              rootError={rootError}
            />
          </Stack>
        </Section>

        <Section title="Instrument">
          <InstrumentPanel
            params={params}
            onChange={setParams}
            preset={preset}
            onPreset={setPreset}
          />
        </Section>
      </Stack>

      <Typography variant="caption" sx={{ display: 'block', opacity: 0.5, mt: 3 }}>
        Phase 2 of {''}
        <Box component="span" sx={{ fontStyle: 'italic' }}>docs/aria-plan.md</Box>
        {''} — next comes the multi-track pattern grid, then the node-graph
        instrument editor.
      </Typography>
    </Box>
  );
}
