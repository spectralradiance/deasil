// Play/stop, tempo, loop length, polyphony, and the live voice readout.

'use client';
import React, { useEffect, useState } from 'react';
import { Box, Button, Chip, Stack, Tooltip } from '@mui/material';
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
  polyphony: number;
  onPolyphony: (polyphony: number) => void;
}

export default function TransportBar({
  session, playing, onPlay, onStop,
  bpm, onBpm, steps, onSteps, polyphony, onPolyphony,
}: Props) {
  const [voices, setVoices] = useState(0);
  const [stolen, setStolen] = useState(0);

  // Voice count is cheap to read but changes constantly, so poll it a few times
  // a second rather than every frame — it is a readout, not a playhead.
  useEffect(() => {
    if (!playing) {
      setVoices(0);
      return;
    }
    const id = setInterval(() => {
      const stats = session.stats();
      setVoices(stats.activeVoices);
      setStolen(stats.stolenNotes);
    }, 150);
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
      <SliderField
        label="polyphony"
        value={polyphony}
        min={1}
        max={16}
        step={1}
        format={(v) => `${v} voices`}
        onChange={onPolyphony}
        width={120}
      />

      <Stack direction="row" spacing={1} sx={{ pb: 0.5 }}>
        <Tooltip title="Voices sounding right now, against the polyphony cap">
          <Chip size="small" variant="outlined" label={`${voices} / ${polyphony} voices`} />
        </Tooltip>
        {stolen > 0 && (
          <Tooltip title="Notes that had to steal a voice because the cap was reached. Raise polyphony, or shorten the gate.">
            <Chip size="small" variant="outlined" color="warning" label={`${stolen} stolen`} />
          </Tooltip>
        )}
      </Stack>
    </Row>
  );
}
