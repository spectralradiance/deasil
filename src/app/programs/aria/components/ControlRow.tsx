// Small labelled control wrappers shared by every panel.
//
// Each field can carry an icon and a one-line explanation. The icon is what
// makes a dense row scannable; the tooltip is where the meaning lives, so the
// label itself can stay a single word.

'use client';
import React from 'react';
import { Box, MenuItem, Slider, TextField, Tooltip, Typography } from '@mui/material';

interface Labelled {
  label: string;
  /** Rendered before the label. */
  icon?: React.ReactNode;
  /** One line explaining what the control does. */
  help?: string;
}

export function Field({ label, icon, help, value, children }: Labelled & {
  value?: string;
  children: React.ReactNode;
}) {
  const heading = (
    <Typography
      variant="caption"
      component="div"
      sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 1, opacity: 0.7, mb: 0.25,
        cursor: help ? 'help' : 'default',
        '& svg': { fontSize: 14, opacity: 0.8 },
      }}
    >
      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
        {icon}
        <Box component="span" sx={{ whiteSpace: 'nowrap' }}>{label}</Box>
      </Box>
      {value !== undefined && (
        <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {value}
        </Box>
      )}
    </Typography>
  );

  return (
    <Box sx={{ minWidth: 120 }}>
      {help ? <Tooltip title={help} placement="top-start">{heading}</Tooltip> : heading}
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
  label, icon, help, value, min, max, step, format, onChange, width = 150,
}: Labelled & {
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  width?: number;
}) {
  return (
    <Field label={label} icon={icon} help={help} value={format ? format(value) : String(value)}>
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
  label, icon, help, value, options, onChange, width = 150,
}: Labelled & {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  width?: number;
}) {
  return (
    <Field label={label} icon={icon} help={help}>
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

/** A switch that carries the same icon-and-tooltip treatment as the fields. */
export function ToggleField({ label, icon, help, checked, onChange }: Labelled & {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Field label={label} icon={icon} help={help}>
      <Box
        component="label"
        sx={{ display: 'flex', alignItems: 'center', height: 32, cursor: 'pointer' }}
      >
        <Box
          component="input"
          type="checkbox"
          checked={checked}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
          sx={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
        />
        <Box
          sx={{
            width: 34, height: 18, borderRadius: 9, position: 'relative',
            backgroundColor: checked ? 'primary.main' : 'action.disabledBackground',
            transition: 'background-color 150ms',
          }}
        >
          <Box
            sx={{
              position: 'absolute', top: 2, left: checked ? 18 : 2,
              width: 14, height: 14, borderRadius: '50%',
              backgroundColor: checked ? 'primary.contrastText' : 'text.secondary',
              transition: 'left 150ms',
            }}
          />
        </Box>
      </Box>
    </Field>
  );
}
