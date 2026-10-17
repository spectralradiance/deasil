// The melody panel: per-lane generation. Every control here is playable:
// while `live` is on,
// moving one re-derives the track against the running loop.

'use client';
import React from 'react';
import { Box, Button, Chip, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import PianoIcon from '@mui/icons-material/Piano';
import TuneIcon from '@mui/icons-material/Tune';
import CasinoIcon from '@mui/icons-material/Casino';
import LockIcon from '@mui/icons-material/Lock';
import BoltIcon from '@mui/icons-material/Bolt';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SouthIcon from '@mui/icons-material/South';
import NorthIcon from '@mui/icons-material/North';
import StairsIcon from '@mui/icons-material/Stairs';
import GridOnIcon from '@mui/icons-material/GridOn';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import BlurOnIcon from '@mui/icons-material/BlurOn';
import TimelapseIcon from '@mui/icons-material/Timelapse';
import LayersIcon from '@mui/icons-material/Layers';
import { Field, Row, SelectField, SliderField, ToggleField } from './ControlRow';
import { seedAffectsPhrase } from '../lib/generate';
import PianoRoll from './PianoRoll';
import { SCALE_NAMES, type Scale, type ScaleName } from '../lib/scale';
import { MAX_GATE, MIN_GATE } from '../lib/song';
import type { Lane, StepSlot, TrackGenerator } from '../lib/song';
import { CHORD_HELP, CHORD_NAMES, chordOffsets, type ChordName } from '../lib/chord';
import type { PitchKind, RhythmKind } from '../lib/generate';
import { euclideanRhythm } from '../lib/generate';

const PITCH_KINDS: PitchKind[] = ['walk', 'arpeggio', 'drone'];
const RHYTHM_KINDS: RhythmKind[] = ['every', 'euclidean', 'random'];

interface Props {
  generator: TrackGenerator;
  stepCount: number;
  stepsPerBeat: number;
  /** The lane's notes, for the piano roll. */
  steps: StepSlot[];
  scale: Scale;
  /** The note length actually in force: the lane's override, or the track's. */
  gate: number;
  /** The track's own gate, offered as the value the lane falls back to. */
  trackGate: number;
  /** Voices the track has, so a chord that will not fit can say so. */
  polyphony: number;
  /** Degrees per octave of the lane's mode, which sizes the chord voicings. */
  scaleSize: number;
  /** The lane's own overrides, each null when it inherits. */
  lane: Lane;
  /** What it inherits when it does. */
  songKey: string;
  songScaleName: ScaleName;
  trackInstrumentId: string;
  instrumentIds: string[];
  onLaneChange: (patch: Partial<Lane>) => void;
  playing: boolean;
  onPlay: () => void;
  onStop: () => void;
  /** Writes one step of this lane, from the piano roll. */
  onSetStep: (index: number, slot: StepSlot) => void;
  /** Polled for the playing row within this pattern; -1 when not playing it. */
  readRow: () => number;
  /** True whenever this pattern is sounding, whatever the scope. */
  patternPlaying: boolean;
  onChange: (patch: Partial<TrackGenerator>) => void;
  onReseed: () => void;
  onKeep: () => void;
  onGenerateOnce: () => void;
}

const INHERIT = '__inherit__';

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

export default function MelodyPanel({
  generator, stepCount, stepsPerBeat, steps, scale, gate, trackGate, polyphony, scaleSize,
  lane, songKey, songScaleName, trackInstrumentId, instrumentIds, onLaneChange,
  playing, onPlay, onStop, onSetStep, readRow, patternPlaying,
  onChange, onReseed, onKeep, onGenerateOnce,
}: Props) {
  const { live } = generator;
  // A drone on a euclidean rhythm consumes no randomness at all, so a new seed
  // would leave every note where it was. Say so rather than offering a button
  // that does nothing.
  const canReseed = seedAffectsPhrase(generator);
  const chord = lane.chord ?? 'none';
  const voicing = chordOffsets(chord, scaleSize);
  // A triad on a monophonic track steals its own notes. Say so rather than
  // letting it sound broken for no visible reason.
  const crowded = voicing.length > polyphony;

  return (
    <Stack spacing={2.5}>
      <Row>
        <ToggleField
          label="live"
          icon={<BoltIcon />}
          help="While live, this lane is re-derived from the settings below: move a slider against the running loop and hear it change. Typing a note turns it off and keeps what is there."
          checked={live}
          onChange={(value) => onChange({ live: value })}
        />
        <Field
          label="actions"
          icon={<CasinoIcon />}
          help="Reseed rolls a new phrase and writes it, whether or not the lane is live. Keep freezes the current notes as ordinary editable steps."
        >
          <Stack direction="row" spacing={1} alignItems="center">
            {/* The span is what carries the tooltip when the button is
                disabled — a disabled button fires no pointer events. */}
            <Tooltip
              title={canReseed
                ? 'Roll a new phrase and write it into the lane'
                : 'A drone on a fixed rhythm uses no randomness, so a new seed would change nothing. Switch the pitch to walk or arpeggio, or the rhythm to random.'}
            >
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CasinoIcon />}
                  onClick={onReseed}
                  disabled={!canReseed}
                >
                  reseed
                </Button>
              </span>
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
            {canReseed && (
              <Tooltip title="The number the phrase derives from. The same seed and settings always give the same phrase.">
                <Chip
                  size="small"
                  color={live ? 'primary' : 'default'}
                  variant="outlined"
                  label={`seed ${generator.seed}`}
                />
              </Tooltip>
            )}
          </Stack>
        </Field>
      </Row>

      <Row>
        <Field
          label="preview"
          icon={playing ? <StopIcon /> : <PlayArrowIcon />}
          help="Loop this pattern with only this track audible, so you can hear what the generator is doing on its own."
        >
          {playing ? (
            <Button size="small" variant="contained" startIcon={<StopIcon />} onClick={onStop}>
              stop
            </Button>
          ) : (
            <Button size="small" variant="contained" startIcon={<PlayArrowIcon />} onClick={onPlay}>
              solo
            </Button>
          )}
        </Field>

        <Field
          label="instrument"
          icon={<PianoIcon />}
          help="Which patch this lane plays through. Patches are shared, so one may back no lanes, one, or many — and a lane may use a different patch from the rest of its track."
        >
          <TextField
            select
            size="small"
            value={lane.instrumentId ?? INHERIT}
            onChange={(e) => onLaneChange({
              instrumentId: e.target.value === INHERIT ? null : e.target.value,
            })}
            sx={{ width: 150 }}
          >
            <MenuItem value={INHERIT} sx={{ fontSize: 14 }}>
              track default ({trackInstrumentId})
            </MenuItem>
            {instrumentIds.map((id) => (
              <MenuItem key={id} value={id} sx={{ fontSize: 14 }}>{id}</MenuItem>
            ))}
          </TextField>
        </Field>

        <Field
          label="key"
          icon={<PianoIcon />}
          help="The root this lane's degrees are measured from. Leave it on the song's key to move with the rest of the arrangement."
        >
          <TextField
            size="small"
            placeholder={songKey}
            value={lane.key ?? ''}
            onChange={(e) => onLaneChange({ key: e.target.value.trim() === '' ? null : e.target.value })}
            sx={{ width: 110 }}
            helperText={lane.key ? 'overriding' : `song: ${songKey}`}
          />
        </Field>

        <Field
          label="mode"
          icon={<TuneIcon />}
          help="The scale this lane's degrees are read through. Leave it inheriting and it re-voices whenever the song's mode changes."
        >
          <TextField
            select
            size="small"
            value={lane.scaleName ?? INHERIT}
            onChange={(e) => onLaneChange({
              scaleName: e.target.value === INHERIT ? null : (e.target.value as ScaleName),
            })}
            sx={{ width: 170 }}
          >
            <MenuItem value={INHERIT} sx={{ fontSize: 14 }}>
              song ({songScaleName.replace(/_/g, ' ')})
            </MenuItem>
            {SCALE_NAMES.map((name) => (
              <MenuItem key={name} value={name} sx={{ fontSize: 14 }}>
                {name.replace(/_/g, ' ')}
              </MenuItem>
            ))}
          </TextField>
        </Field>
      </Row>

      <Row>
        <SelectField
          label="pitch"
          icon={<ShowChartIcon />}
          help="How the notes are chosen. Walk wanders the scale, arpeggio cycles a triad, drone repeats one degree."
          value={generator.pitch}
          options={PITCH_KINDS}
          onChange={(pitch) => onChange({ pitch })}
          width={120}
        />
        <SliderField
          label={generator.pitch === 'drone' ? 'degree' : 'lowest'}
          icon={<SouthIcon />}
          help={generator.pitch === 'drone'
            ? 'The single scale degree to repeat. Degree 0 is the key.'
            : 'The lowest scale degree the walk may reach. Negative degrees sit below the key.'}
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
              label="highest"
              icon={<NorthIcon />}
              help="The highest scale degree the walk may reach. In a seven-note mode, degree 7 is one octave above the key."
              value={generator.high}
              min={-14}
              max={14}
              step={1}
              onChange={(high) => onChange({ high })}
              width={130}
            />
            <SliderField
              label="stepwise"
              icon={<StairsIcon />}
              help="At 0 each degree is picked independently. At 1 every note is a step or a third from the last, which is most of the difference between random and intended."
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
          icon={<GridOnIcon />}
          help="Which steps carry a note. Generated separately from pitch, so changing the groove leaves the melody alone."
          value={generator.rhythm}
          options={RHYTHM_KINDS}
          onChange={(rhythm) => onChange({ rhythm })}
          width={120}
        />
        {generator.rhythm === 'euclidean' && (
          <>
            <SliderField
              label="pulses"
              icon={<RadioButtonCheckedIcon />}
              help="How many notes to spread as evenly as the step count allows. 3 of 8 is the tresillo; 4 of 16 is four to the floor."
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
              icon={<RotateRightIcon />}
              help="Shifts the whole rhythm later in the bar, so it can start somewhere other than the downbeat."
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
            icon={<BlurOnIcon />}
            help="The chance that any given step carries a note."
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

      <Row>
        <SliderField
          label="note length"
          icon={<TimelapseIcon />}
          help="How long each note is held, as a multiple of one step. Above 1 notes overrun into the next step and overlap, which is what uses up the track's polyphony. Setting it here overrides the track's gate for this lane alone."
          value={gate}
          min={MIN_GATE}
          max={MAX_GATE}
          step={0.05}
          format={(v) => `${v.toFixed(2)}\u00d7`}
          onChange={(v) => onLaneChange({ gate: v })}
        />
        <Field
          label="length from"
          icon={<TimelapseIcon />}
          help="Whether this lane sets its own note length or follows the track's gate. Press to hand it back to the track."
          value={lane.gate === null ? 'track' : 'lane'}
        >
          <Tooltip title={lane.gate === null
            ? 'Already following the track'
            : `Drop this lane's own note length and follow the track's ${trackGate.toFixed(2)}\u00d7 again`}
          >
            <span>
              <Button
                size="small"
                variant="outlined"
                disabled={lane.gate === null}
                onClick={() => onLaneChange({ gate: null })}
              >
                {`track ${trackGate.toFixed(2)}\u00d7`}
              </Button>
            </span>
          </Tooltip>
        </Field>
        <SelectField
          label="chord"
          icon={<LayersIcon />}
          help={`How many notes each written degree sounds as. ${CHORD_HELP[chord]} The voicing is read through this lane's scale at play time, so changing the key or the mode re-voices every chord without rewriting a note.`}
          value={chord}
          options={CHORD_NAMES}
          onChange={(value: ChordName) => onLaneChange({ chord: value })}
        />
        {crowded && (
          <Tooltip title="Every note of the chord needs its own voice. Raise the track's polyphony in the track panel, or the chord will cut off its own notes.">
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label={`needs ${voicing.length} voices, track has ${polyphony}`}
            />
          </Tooltip>
        )}
      </Row>

      <RhythmPreview generator={generator} stepCount={stepCount} stepsPerBeat={stepsPerBeat} />

      <Box>
        <Typography variant="caption" sx={{ opacity: 0.65, display: 'block', mb: 0.75 }}>
          notes
        </Typography>
        <PianoRoll
          steps={steps}
          scale={scale}
          stepsPerBeat={stepsPerBeat}
          gate={gate}
          chordOffsets={voicing}
          onSetStep={onSetStep}
          readRow={readRow}
          playing={patternPlaying}
        />
      </Box>

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
