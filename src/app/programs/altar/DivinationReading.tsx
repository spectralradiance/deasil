'use client';
import { useState } from 'react';
import {
  Box, Button, Checkbox, FormControl, FormControlLabel,
  InputLabel, MenuItem, Select,
} from '@mui/material';
import { type DivinationToken, type DrawSpread, type DrawnToken } from './ReadingEntry';

interface Props {
  tokens: DivinationToken[];
  spreads: DrawSpread[];
  canReverse?: boolean;
  systemSelector?: React.ReactNode;
  extraActions?: React.ReactNode;
  onDraw: (tokens: DrawnToken[], spread: DrawSpread) => void;
}

export default function DivinationControls({ tokens, spreads, canReverse = false, systemSelector, extraActions, onDraw }: Props) {
  const [selectedSpread, setSelectedSpread] = useState(spreads[0]);
  const [allowReversals, setAllowReversals] = useState(false);

  const draw = () => {
    const pool = [...tokens];
    const result: DrawnToken[] = [];
    for (let i = 0; i < selectedSpread.count; i++) {
      if (!pool.length) break;
      const idx = Math.floor(Math.random() * pool.length);
      const t = pool.splice(idx, 1)[0];
      result.push({ ...t, isReversed: canReverse && allowReversals && Math.random() < 0.5 });
    }
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
