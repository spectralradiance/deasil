// Settings and edit actions for the selected track.

'use client';
import React from 'react';
import { Box, Button, IconButton, Stack, TextField, Tooltip } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ClearIcon from '@mui/icons-material/Clear';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import LabelIcon from '@mui/icons-material/Label';
import PianoIcon from '@mui/icons-material/Piano';
import TimelapseIcon from '@mui/icons-material/Timelapse';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import LayersIcon from '@mui/icons-material/Layers';
import EditIcon from '@mui/icons-material/Edit';
import { Field, Row, SelectField, SliderField } from './ControlRow';
import type { Song, Track } from '../lib/song';

interface Props {
  song: Song;
  track: Track;
  onPatch: (patch: Partial<Track>) => void;
  onClear: () => void;
  onRotate: (by: number) => void;
  onTranspose: (by: number) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export default function TrackPanel({
  song, track, onPatch, onClear, onRotate, onTranspose, onRemove, canRemove,
}: Props) {
  const instrumentIds = Object.keys(song.instruments);

  return (
    <Stack spacing={2.5}>
      <Row>
        <Field label="name" icon={<LabelIcon />} help="What this channel is called, in the grid header and the track list.">
          <TextField
            size="small"
            value={track.name}
            onChange={(e) => onPatch({ name: e.target.value })}
            sx={{ width: 130 }}
          />
        </Field>
        <SelectField
          label="instrument"
          icon={<PianoIcon />}
          help="Which patch this channel plays through. Several channels may share one patch; each still gets its own voices."
          value={track.instrumentId}
          options={instrumentIds}
          onChange={(instrumentId) => onPatch({ instrumentId })}
          width={130}
        />
        <SliderField
          label="gate"
          icon={<TimelapseIcon />}
          help="Note length as a multiple of one step. Above 1 notes overrun into the next step and overlap, which is what uses up polyphony."
          value={track.gate}
          min={0.05}
          max={4}
          step={0.05}
          format={(v) => `${v.toFixed(2)}×`}
          onChange={(gate) => onPatch({ gate })}
          width={120}
        />
        <SliderField
          label="level"
          icon={<VolumeUpIcon />}
          help="This channel's volume going into the master bus."
          value={track.level}
          min={0}
          max={1}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(level) => onPatch({ level })}
          width={120}
        />
        <SliderField
          label="polyphony"
          icon={<LayersIcon />}
          help="How many notes this channel can sound at once. A note arriving when all are busy steals the oldest."
          value={track.polyphony}
          min={1}
          max={16}
          step={1}
          format={(v) => `${v}`}
          onChange={(polyphony) => onPatch({ polyphony })}
          width={110}
        />
      </Row>

      <Row>
        <Field label="edit" icon={<EditIcon />} help="Edits the selected track's notes in the pattern you are viewing — not in every pattern.">
          <Stack direction="row" spacing={1} alignItems="center">
            <Button size="small" variant="outlined" startIcon={<ClearIcon />} onClick={onClear}>
              clear
            </Button>
            <Tooltip title="Shift the track one step earlier">
              <IconButton size="small" onClick={() => onRotate(-1)}><RotateLeftIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Tooltip title="Shift the track one step later">
              <IconButton size="small" onClick={() => onRotate(1)}><RotateRightIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Tooltip title="Down one scale degree">
              <Button size="small" variant="text" onClick={() => onTranspose(-1)} sx={{ minWidth: 32 }}>−1</Button>
            </Tooltip>
            <Tooltip title="Up one scale degree">
              <Button size="small" variant="text" onClick={() => onTranspose(1)} sx={{ minWidth: 32 }}>+1</Button>
            </Tooltip>
            <Box sx={{ flex: 1 }} />
            {canRemove && (
              <Tooltip title="Remove this track">
                <IconButton size="small" color="error" onClick={onRemove}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Field>
      </Row>
    </Stack>
  );
}
