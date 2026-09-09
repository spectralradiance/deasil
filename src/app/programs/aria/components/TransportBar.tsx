// Play/stop, tempo, loop length, follow mode, and the live voice readout.

'use client';
import React, { useEffect, useState } from 'react';
import { Box, Button, Chip, FormControlLabel, Stack, Switch, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { Row, SliderField } from './ControlRow';
import type { AriaSession } from '../audio/AriaSession';

interface Props {
  session: AriaSession;
  playing: boolean;
  onPlay: () => void;
  onStop: () => void;
  bpm: number;
  onBpm: (bpm: number) => void;
  steps: number;
  onSteps: (steps: number) => void;
  follow: boolean;
  onFollow: (follow: boolean) => void;
}

export default function TransportBar({
  session, playing, onPlay, onStop, bpm, onBpm, steps, onSteps, follow, onFollow,
}: Props) {
  const [load, setLoad] = useState({ active: 0, capacity: 0, stolen: 0 });

  // A readout, not a playhead: a few times a second is plenty, and it keeps the
  // 60Hz frame budget for the grid.
  useEffect(() => {
    if (!playing) {
      setLoad((current) => ({ ...current, active: 0 }));
      return;
    }
    const id = setInterval(() => setLoad(session.voiceLoad()), 150);
    return () => clearInterval(id);
  }, [playing, session]);

  return (
    <Row>
      <Box>
        {playing ? (
          <Button variant="contained" startIcon={<StopIcon />} onClick={onStop} sx={{ minWidth: 116 }}>
            stop
          </Button>
        ) : (
          <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={onPlay} sx={{ minWidth: 116 }}>
            play
          </Button>
        )}
      </Box>

      <SliderField
        label="tempo"
        value={bpm}
        min={40}
        max={220}
        step={1}
        format={(v) => `${v} bpm`}
        onChange={onBpm}
      />
      <SliderField
        label="loop length"
        value={steps}
        min={4}
        max={64}
        step={4}
        format={(v) => `${v} steps`}
        onChange={onSteps}
      />

      <Tooltip title="Keep the playing row centred. Turn it off to edit somewhere else while the loop runs.">
        <FormControlLabel
          sx={{ mb: 0.25 }}
          control={<Switch size="small" checked={follow} onChange={(e) => onFollow(e.target.checked)} />}
          label={<Box sx={{ fontSize: 13 }}>follow</Box>}
        />
      </Tooltip>

      <Stack direction="row" spacing={1} sx={{ pb: 0.5 }}>
        <Tooltip title="Voices sounding across every track, against the summed polyphony caps">
          <Chip size="small" variant="outlined" label={`${load.active} / ${load.capacity || '—'} voices`} />
        </Tooltip>
        {load.stolen > 0 && (
          <Tooltip title="Notes that had to steal a voice. Raise a track's polyphony, or shorten its gate.">
            <Chip size="small" variant="outlined" color="warning" label={`${load.stolen} stolen`} />
          </Tooltip>
        )}
      </Stack>
    </Row>
  );
}
