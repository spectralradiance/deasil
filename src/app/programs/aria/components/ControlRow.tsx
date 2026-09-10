// Small labelled control wrappers shared by the generator and instrument panels.

'use client';
import React from 'react';
import { Box, MenuItem, Slider, TextField, Typography } from '@mui/material';

export function Field({ label, value, children }: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ minWidth: 120 }}>
      <Typography
        variant="caption"
        sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, opacity: 0.65, mb: 0.25 }}
      >
        <span>{label}</span>
        {value !== undefined && (
          <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Box>
        )}
      </Typography>
      {children}
    </Box>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, alignItems: 'flex-end' }}>
      {children}
    </Box>
  );
}

export function SliderField({
  label, value, min, max, step, format, onChange, width = 150,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  width?: number;
}) {
  return (
    <Field label={label} value={format ? format(value) : String(value)}>
      <Slider
        size="small"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(_, v) => onChange(v as number)}
        sx={{ width, display: 'block' }}
      />
    </Field>
  );
}

export function SelectField<T extends string>({
  label, value, options, onChange, width = 150,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  width?: number;
}) {
  return (
    <Field label={label}>
      <TextField
        select
        size="small"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        sx={{ width }}
      >
        {options.map((option) => (
          <MenuItem key={option} value={option} sx={{ fontSize: 14 }}>
            {option.replace(/_/g, ' ')}
          </MenuItem>
        ))}
      </TextField>
    </Field>
  );
}
