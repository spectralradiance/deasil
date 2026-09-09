// Per-track generation. Every control here is playable: while `live` is on,
// moving one re-derives the track against the running loop.

'use client';
import React from 'react';
import { Box, Button, Chip, FormControlLabel, Stack, Switch, Tooltip, Typography } from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import LockIcon from '@mui/icons-material/Lock';
import { Field, Row, SelectField, SliderField } from './ControlRow';
import type { TrackGenerator } from '../lib/song';
import type { PitchKind, RhythmKind } from '../lib/generate';
import { euclideanRhythm } from '../lib/generate';

const PITCH_KINDS: PitchKind[] = ['walk', 'arpeggio', 'drone'];
const RHYTHM_KINDS: RhythmKind[] = ['every', 'euclidean', 'random'];

interface Props {
  generator: TrackGenerator;
  stepCount: number;
  stepsPerBeat: number;
  onChange: (patch: Partial<TrackGenerator>) => void;
  onReseed: () => void;
  onKeep: () => void;
  onGenerateOnce: () => void;
}

/** A compact read-only picture of the rhythm mask, so it can be read at a glance. */
function RhythmPreview({ generator, stepCount, stepsPerBeat }: {
  generator: TrackGenerator;
  stepCount: number;
  stepsPerBeat: number;
}) {
  if (generator.rhythm !== 'euclidean') return null;
  const mask = euclideanRhythm(generator.pulses, stepCount, generator.rotation);
  return (
    <Box sx={{ display: 'flex', gap: '2px', flexWrap: 'wrap', mt: 0.5 }}>
      {mask.map((on, i) => (
        <Box
          key={i}
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            border: '1px solid',
            borderColor: i % stepsPerBeat === 0 ? 'text.secondary' : 'divider',
            backgroundColor: on ? 'primary.main' : 'transparent',
          }}
        />
      ))}
    </Box>
  );
}

export default function TrackGeneratorPanel({
  generator, stepCount, stepsPerBeat, onChange, onReseed, onKeep, onGenerateOnce,
}: Props) {
  const { live } = generator;

  return (
    <Stack spacing={2.5}>
      <Row>
        <Field label="generate">
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="While live, the track is re-derived from these settings — move a slider against the running loop and hear it change.">
              <FormControlLabel
                sx={{ m: 0 }}
                control={<Switch size="small" checked={live} onChange={(e) => onChange({ live: e.target.checked })} />}
                label={<Box sx={{ fontSize: 13 }}>live</Box>}
              />
            </Tooltip>
            <Tooltip title="Roll a new seed">
              <Button size="small" variant="outlined" startIcon={<CasinoIcon />} onClick={onReseed}>
                reseed
              </Button>
            </Tooltip>
            {live ? (
              <Tooltip title="Stop generating and keep these notes as ordinary editable steps">
                <Button size="small" variant="outlined" startIcon={<LockIcon />} onClick={onKeep}>
                  keep
                </Button>
              </Tooltip>
            ) : (
              <Tooltip title="Write one roll into the track without turning live on">
                <Button size="small" variant="outlined" onClick={onGenerateOnce}>
                  generate once
                </Button>
              </Tooltip>
            )}
            {live && <Chip size="small" color="primary" variant="outlined" label={`seed ${generator.seed}`} />}
          </Stack>
        </Field>
      </Row>

      <Row>
        <SelectField
          label="pitch"
          value={generator.pitch}
          options={PITCH_KINDS}
          onChange={(pitch) => onChange({ pitch })}
          width={120}
        />
        <SliderField
          label={generator.pitch === 'drone' ? 'degree' : 'lowest degree'}
          value={generator.low}
          min={-14}
          max={14}
          step={1}
          onChange={(low) => onChange({ low })}
          width={130}
        />
        {generator.pitch === 'walk' && (
          <>
            <SliderField
              label="highest degree"
              value={generator.high}
              min={-14}
              max={14}
              step={1}
              onChange={(high) => onChange({ high })}
              width={130}
            />
            <SliderField
              label="stepwise"
              value={generator.stepwise}
              min={0}
              max={1}
              step={0.05}
              format={(v) => v.toFixed(2)}
              onChange={(stepwise) => onChange({ stepwise })}
              width={130}
            />
          </>
        )}
      </Row>

      <Row>
        <SelectField
          label="rhythm"
          value={generator.rhythm}
          options={RHYTHM_KINDS}
          onChange={(rhythm) => onChange({ rhythm })}
          width={120}
        />
        {generator.rhythm === 'euclidean' && (
          <>
            <SliderField
              label="pulses"
              value={Math.min(generator.pulses, stepCount)}
              min={0}
              max={stepCount}
              step={1}
              format={(v) => `${v} / ${stepCount}`}
              onChange={(pulses) => onChange({ pulses })}
              width={140}
            />
            <SliderField
              label="rotate"
              value={generator.rotation}
              min={0}
              max={Math.max(1, stepCount - 1)}
              step={1}
              onChange={(rotation) => onChange({ rotation })}
              width={120}
            />
          </>
        )}
        {generator.rhythm === 'random' && (
          <SliderField
            label="density"
            value={generator.density}
            min={0}
            max={1}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(density) => onChange({ density })}
            width={140}
          />
        )}
      </Row>

      <RhythmPreview generator={generator} stepCount={stepCount} stepsPerBeat={stepsPerBeat} />

      <Typography variant="caption" sx={{ opacity: 0.6 }}>
        Rhythm and pitch are generated separately: the rhythm decides <em>when</em>{' '}
        a note happens, the pitch generator decides <em>what</em> it is. So
        changing the groove leaves the melody alone, and vice versa.{' '}
        <strong>Euclidean</strong> spreads its pulses as evenly as the step count
        allows — 3 of 8 is the tresillo, 4 of 16 is four to the floor.
      </Typography>
    </Stack>
  );
}
