'use client';
import { useState } from 'react';
import {
  Box, Button, Checkbox, FormControl, FormControlLabel,
  InputLabel, MenuItem, Select,
} from '@mui/material';
import { type DivinationToken, type DrawSpread, type DrawnToken } from './ReadingEntry';
import { createDrawRng, drawFrom } from './seeded-rng';

interface Props {
  /** Names the oracle in the draw seed, e.g. "Runes". */
  label: string;
  message: string;
  tokens: DivinationToken[];
  spreads: DrawSpread[];
  canReverse?: boolean;
  systemSelector?: React.ReactNode;
  extraActions?: React.ReactNode;
  onDraw: (tokens: DrawnToken[], spread: DrawSpread) => void;
}

export default function DivinationControls({ label, message, tokens, spreads, canReverse = false, systemSelector, extraActions, onDraw }: Props) {
  const [selectedSpread, setSelectedSpread] = useState(spreads[0]);
  const [allowReversals, setAllowReversals] = useState(false);

  const draw = () => {
    const rng = createDrawRng(message, `${label}|${selectedSpread.name}`);
    const result: DrawnToken[] = drawFrom(tokens, selectedSpread.count, rng, canReverse && allowReversals)
      .map(({ item, isReversed }) => ({ ...item, isReversed }));
    onDraw(result, { ...selectedSpread });
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flexWrap: 'wrap', gap: 2 }}>
      {systemSelector}

      <FormControl sx={{ minWidth: 180 }}>
        <InputLabel>Spread</InputLabel>
        <Select value={selectedSpread.name} label="Spread"
          onChange={e => setSelectedSpread(spreads.find(s => s.name === e.target.value)!)}
        >
          {spreads.map(s => <MenuItem key={s.name} value={s.name}>{s.name} ({s.count})</MenuItem>)}
        </Select>
      </FormControl>

      {canReverse && (
        <FormControlLabel
          control={<Checkbox checked={allowReversals} onChange={e => setAllowReversals(e.target.checked)} />}
          label="Reversals"
        />
      )}

      <Button variant="outlined" onClick={draw}>Draw</Button>
      {extraActions}
    </Box>
  );
}
