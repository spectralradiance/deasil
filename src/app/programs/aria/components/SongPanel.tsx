// Key and mode. These belong to the song, not to a track: every pattern stores
// degrees, so changing either re-voices the whole arrangement at once.

'use client';
import React from 'react';
import { Stack, TextField, Typography } from '@mui/material';
import PianoIcon from '@mui/icons-material/Piano';
import TuneIcon from '@mui/icons-material/Tune';
import { Field, Row, SelectField } from './ControlRow';
import { SCALE_NAMES, type ScaleName } from '../lib/scale';

interface Props {
  songKey: string;
  scaleName: ScaleName;
  onKey: (key: string) => void;
  onScale: (scaleName: ScaleName) => void;
  keyError: boolean;
}

export default function SongPanel({ songKey, scaleName, onKey, onScale, keyError }: Props) {
  return (
    <Stack spacing={1.5}>
      <Row>
        <Field
          label="key"
          icon={<PianoIcon />}
          help="The root note every degree is measured from, e.g. C3 or F#2. Degree 0 is this note."
        >
          <TextField
            size="small"
            value={songKey}
            error={keyError}
            helperText={keyError ? 'e.g. C3, F#2' : undefined}
            onChange={(e) => onKey(e.target.value)}
            sx={{ width: 100 }}
          />
        </Field>
        <SelectField
          label="mode"
          icon={<TuneIcon />}
          help="Which scale the degrees are read through. Changing it re-voices every pattern at once — nothing is transposed, because nothing stored a pitch."
          value={scaleName}
          options={SCALE_NAMES}
          onChange={onScale}
          width={190}
        />
      </Row>
      <Typography variant="caption" sx={{ opacity: 0.6 }}>
        Try switching the mode while the loop runs — nothing is transposed,
        because nothing stored a pitch to transpose.
      </Typography>
    </Stack>
  );
}
