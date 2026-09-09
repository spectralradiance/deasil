// Waveform, filter and envelope controls for the phase-2 subtractive voice.
// Phase 5 replaces this panel with the node-graph editor.

'use client';
import React from 'react';
import { Box, Stack } from '@mui/material';
import { Row, SelectField, SliderField } from './ControlRow';
import { PRESETS, PRESET_NAMES, type InstrumentParams } from '../audio/InstrumentParams';

const WAVEFORMS = ['sine', 'triangle', 'square', 'sawtooth'] as const;
const FILTER_TYPES = ['lowpass', 'highpass', 'bandpass', 'notch'] as const;

interface Props {
  params: InstrumentParams;
  onChange: (params: InstrumentParams) => void;
  preset: string;
  onPreset: (name: string) => void;
}

export default function InstrumentPanel({ params, onChange, preset, onPreset }: Props) {
  const set = (patch: Partial<InstrumentParams>) => onChange({ ...params, ...patch });
  const setFilter = (patch: Partial<InstrumentParams['filter']>) =>
    onChange({ ...params, filter: { ...params.filter, ...patch } });
  const setAmp = (patch: Partial<InstrumentParams['amp']>) =>
    onChange({ ...params, amp: { ...params.amp, ...patch } });

  const seconds = (v: number) => `${v.toFixed(3)} s`;
  const hertz = (v: number) => `${Math.round(v)} Hz`;

  return (
    <Stack spacing={2.5}>
      <Row>
        <SelectField
          label="preset"
          value={preset}
          options={PRESET_NAMES}
          onChange={(name) => {
            onPreset(name);
            onChange(PRESETS[name]);
          }}
          width={130}
        />
        <SelectField
          label="waveform"
          value={params.waveform as (typeof WAVEFORMS)[number]}
          options={WAVEFORMS}
          onChange={(waveform) => set({ waveform })}
          width={130}
        />
        <SliderField
          label="detune spread"
          value={params.spread}
          min={0}
          max={40}
          step={1}
          format={(v) => `${v} ¢`}
          onChange={(spread) => set({ spread })}
        />
        <SliderField
          label="gain"
          value={params.gain}
          min={0}
          max={1}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(gain) => set({ gain })}
        />
      </Row>

      <Row>
        <SelectField
          label="filter"
          value={params.filter.type as (typeof FILTER_TYPES)[number]}
          options={FILTER_TYPES}
          onChange={(type) => setFilter({ type })}
          width={130}
        />
        <SliderField
          label="cutoff"
          value={params.filter.cutoff}
          min={80}
          max={8000}
          step={20}
          format={hertz}
          onChange={(cutoff) => setFilter({ cutoff })}
        />
        <SliderField
          label="resonance"
          value={params.filter.q}
          min={0.1}
          max={20}
          step={0.1}
          format={(v) => v.toFixed(1)}
          onChange={(q) => setFilter({ q })}
        />
        <SliderField
          label="filter envelope"
          value={params.filter.envelopeAmount}
          min={0}
          max={6000}
          step={50}
          format={hertz}
          onChange={(envelopeAmount) => setFilter({ envelopeAmount })}
        />
      </Row>

      <Row>
        <SliderField
          label="attack"
          value={params.amp.attack}
          min={0.001}
          max={1}
          step={0.001}
          format={seconds}
          onChange={(attack) => setAmp({ attack })}
        />
        <SliderField
          label="decay"
          value={params.amp.decay}
          min={0.005}
          max={1.5}
          step={0.005}
          format={seconds}
          onChange={(decay) => setAmp({ decay })}
        />
        <SliderField
          label="sustain"
          value={params.amp.sustain}
          min={0}
          max={1}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(sustain) => setAmp({ sustain })}
        />
        <SliderField
          label="release"
          value={params.amp.release}
          min={0.005}
          max={2}
          step={0.005}
          format={seconds}
          onChange={(release) => setAmp({ release })}
        />
      </Row>
      <Box />
    </Stack>
  );
}
