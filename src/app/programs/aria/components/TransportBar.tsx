// Play/stop, tempo, loop length, follow mode, and the live voice readout.

'use client';
import React, { useEffect, useState } from 'react';
import { Box, Button, Chip, Stack, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SpeedIcon from '@mui/icons-material/Speed';
import StraightenIcon from '@mui/icons-material/Straighten';
import LoopIcon from '@mui/icons-material/Loop';
import VerticalAlignCenterIcon from '@mui/icons-material/VerticalAlignCenter';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import { Row, SliderField, ToggleField } from './ControlRow';
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
  loopPattern: boolean;
  onLoopPattern: (loop: boolean) => void;
  patternName: string;
}

export default function TransportBar({
  session, playing, onPlay, onStop, bpm, onBpm, steps, onSteps, follow, onFollow,
  loopPattern, onLoopPattern, patternName,
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
        icon={<SpeedIcon />}
        help="Beats per minute. One step is a sixteenth note, so a step lasts 15 / bpm seconds."
        value={bpm}
        min={40}
        max={220}
        step={1}
        format={(v) => `${v} bpm`}
        onChange={onBpm}
      />
      <SliderField
        label={`pattern ${patternName}`}
        icon={<StraightenIcon />}
        help="How many steps this pattern lasts. Growing it pads with rests; shrinking keeps what fits. Patterns may differ in length."
        value={steps}
        min={4}
        max={64}
        step={4}
        format={(v) => `${v} steps`}
        onChange={onSteps}
      />

      <ToggleField
        label="loop"
        icon={<LoopIcon />}
        help={`Off: play the arrangement, every pattern in order. On: cycle pattern ${patternName} alone, for editing it against itself.`}
        checked={loopPattern}
        onChange={onLoopPattern}
      />

      <ToggleField
        label="follow"
        icon={<VerticalAlignCenterIcon />}
        help="Keep the playing row centred in the grid. Turn it off to edit somewhere else while the loop runs."
        checked={follow}
        onChange={onFollow}
      />

      <Stack direction="row" spacing={1} sx={{ pb: 0.5 }}>
        <Tooltip title="Notes sounding right now across every track, against the summed polyphony caps. A note holds its voice until the release finishes.">
          <Chip
            size="small"
            variant="outlined"
            icon={<GraphicEqIcon />}
            label={`${load.active} / ${load.capacity || '—'} voices`}
          />
        </Tooltip>
        {load.stolen > 0 && (
          <Tooltip title="Notes that arrived with every voice busy and cut an older one short. Raise that track's polyphony, or shorten its gate.">
            <Chip
              size="small"
              variant="outlined"
              color="warning"
              icon={<ContentCutIcon />}
              label={`${load.stolen} stolen`}
            />
          </Tooltip>
        )}
      </Stack>
    </Row>
  );
}
