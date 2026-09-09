// Scale, key, and the seeded generator settings that fill the phrase.

'use client';
import React from 'react';
import { Button, Stack, TextField, Typography } from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import { Field, Row, SelectField, SliderField } from './ControlRow';
import { SCALE_NAMES, type ScaleName } from '../lib/scale';

export type GeneratorKind = 'walk' | 'arpeggio';

export interface GeneratorSettings {
  kind: GeneratorKind;
  scaleName: ScaleName;
  root: string;
  low: number;
  high: number;
  restDensity: number;
  stepwise: number;
  seed: number;
}

interface Props {
  settings: GeneratorSettings;
  onChange: (settings: GeneratorSettings) => void;
  onReseed: () => void;
  rootError: boolean;
}

export default function GeneratorPanel({ settings, onChange, onReseed, rootError }: Props) {
  const set = (patch: Partial<GeneratorSettings>) => onChange({ ...settings, ...patch });
  const walk = settings.kind === 'walk';

  return (
    <Stack spacing={2.5}>
      <Row>
        <SelectField
          label="generator"
          value={settings.kind}
          options={['walk', 'arpeggio'] as const}
          onChange={(kind) => set({ kind })}
          width={130}
        />
        <SelectField
          label="scale"
          value={settings.scaleName}
          options={SCALE_NAMES}
          onChange={(scaleName) => set({ scaleName })}
          width={170}
        />
        <Field label="key">
          <TextField
            size="small"
            value={settings.root}
            error={rootError}
            helperText={rootError ? 'e.g. C3, F#2' : undefined}
            onChange={(e) => set({ root: e.target.value })}
            sx={{ width: 90 }}
          />
        </Field>
        <Field label="&nbsp;">
          <Button variant="outlined" size="small" startIcon={<CasinoIcon />} onClick={onReseed}>
            reseed
          </Button>
        </Field>
      </Row>

      {walk && (
        <Row>
          <SliderField
            label="lowest degree"
            value={settings.low}
            min={-14}
            max={0}
            step={1}
            onChange={(low) => set({ low })}
          />
          <SliderField
            label="highest degree"
            value={settings.high}
            min={0}
            max={14}
            step={1}
            onChange={(high) => set({ high })}
          />
          <SliderField
            label="rest density"
            value={settings.restDensity}
            min={0}
            max={0.7}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(restDensity) => set({ restDensity })}
          />
          <SliderField
            label="stepwise"
            value={settings.stepwise}
            min={0}
            max={1}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(stepwise) => set({ stepwise })}
          />
        </Row>
      )}

      <Typography variant="caption" sx={{ opacity: 0.6 }}>
        {walk ? (
          <>
            Seed <code>{settings.seed}</code> — the same seed and settings always
            give the same phrase. <strong>Stepwise</strong> at 0 picks each degree
            independently; at 1 every note is a step or a third from the last,
            which is most of the difference between random and intended.
          </>
        ) : (
          <>A triad arpeggio over two octaves of the current scale.</>
        )}
      </Typography>
    </Stack>
  );
}
