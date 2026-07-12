"use client";
import {
  Box, Button, Checkbox, FormControl, FormControlLabel,
  InputLabel, MenuItem, Select, TextField, Typography,
} from '@mui/material';
import { enrichedCards } from './tarot-data';
import NumberField from '../../components/NumberField';
import { SPREADS, type DrawnCard, type SpreadOption } from './tarot-constants';

interface SpreadControlsProps {
  selectedSpread: SpreadOption;
  onSpreadChange: (spread: SpreadOption) => void;
  customCount: number;
  onCustomCountChange: (count: number) => void;
  /** Raw text from the custom positions textarea (one "Name - Description" per line) */
  customPositionText: string;
  onCustomPositionTextChange: (text: string) => void;
  allowReversals: boolean;
  onAllowReversalsChange: (allow: boolean) => void;
  /** Drawn cards array — used to lock controls while a reading is displayed */
  drawnCards: DrawnCard[];
  /** True while the clear fade-out animation is in progress */
  isClearing: boolean;
  onDraw: () => void;
  onClear: () => void;
}

/**
 * Top-bar controls for configuring and triggering a tarot reading:
 * - Spread type selector
 * - Custom card-count spinner (Custom spread only)
 * - Reversals toggle
 * - Draw / Clear action button
 * - Custom positions textarea (Custom spread only, rendered below the bar)
 *
 * All controls are locked (disabled) while cards are displayed or the clear
 * animation is running, so the configuration cannot change mid-reading.
 */
export default function SpreadControls({
  selectedSpread,
  onSpreadChange,
  customCount,
  onCustomCountChange,
  customPositionText,
  onCustomPositionTextChange,
  allowReversals,
  onAllowReversalsChange,
  drawnCards,
  isClearing,
  onDraw,
  onClear,
}: SpreadControlsProps) {
  // Controls are locked once cards are on the table or during the clear animation
  const locked = drawnCards.length > 0 || isClearing;

  return (
    <>
      {/* ── Main controls bar ────────────────────────────────────────────── */}
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h4">Altar</Typography>

        {/* Spread type selector */}
        <FormControl sx={{ minWidth: 220 }} disabled={locked}>
          <InputLabel>Spread</InputLabel>
          <Select
            value={selectedSpread.name}
            label="Spread"
            onChange={(e) => {
              const spread = SPREADS.find(s => s.name === e.target.value)!;
              onSpreadChange(spread);
            }}
          >
            {SPREADS.map(s => (
              <MenuItem key={s.name} value={s.name}>{s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Custom card-count spinner — only visible for the "Custom" spread */}
        {selectedSpread.count === null && (
          <NumberField
            label="Cards"
            value={customCount}
            onValueChange={(val) => onCustomCountChange(val ?? 1)}
            min={1}
            max={enrichedCards.length}
            sx={{ width: 175 }}
            disabled={locked}
          />
        )}

        {/* Reversals toggle */}
        <FormControlLabel
          control={
            <Checkbox
              checked={allowReversals}
              onChange={(e) => onAllowReversalsChange(e.target.checked)}
              disabled={locked}
            />
          }
          label="Reversals"
        />

        {/* Draw / Clear — mutually exclusive based on whether cards are showing */}
        {drawnCards.length > 0
          ? <Button variant="outlined" onClick={onClear} disabled={isClearing}>Clear</Button>
          : <Button variant="contained" onClick={onDraw} disabled={isClearing}>Draw</Button>
        }
      </Box>

      {/* ── Custom positions textarea ─────────────────────────────────────── */}
      {/* One line per position in the format: "Position Name - Optional description" */}
      {selectedSpread.count === null && (
        <TextField
          label="Positions"
          multiline
          rows={Math.min(Math.max(customCount, 3), 10)}
          value={customPositionText}
          onChange={(e) => onCustomPositionTextChange(e.target.value)}
          placeholder={`Position 1 - Description\nPosition 2 - Description\n...`}
          disabled={locked}
          sx={{ width: 400, maxWidth: '100%', mt: 2 }}
        />
      )}
    </>
  );
}
