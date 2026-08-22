'use client';
import { useState } from 'react';
import {
  Box, Button, Checkbox, FormControl, FormControlLabel,
  InputLabel, MenuItem, Select, Typography,
} from '@mui/material';
import { type DivinationToken, type DrawSpread, type DrawnToken } from './ReadingEntry';

interface Props {
  tokens: DivinationToken[];
  spreads: DrawSpread[];
  canReverse?: boolean;
  systemSelector?: React.ReactNode;
  extraActions?: React.ReactNode;
  browseOpen: boolean;
  onBrowse: () => void;
  onDraw: (tokens: DrawnToken[], spread: DrawSpread) => void;
}

export default function DivinationControls({ tokens, spreads, canReverse = false, systemSelector, extraActions, browseOpen, onBrowse, onDraw }: Props) {
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
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Typography variant="h4">Altar</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {systemSelector}

        <FormControl sx={{ minWidth: 180 }} disabled={browseOpen}>
          <InputLabel>Spread</InputLabel>
          <Select value={selectedSpread.name} label="Spread"
            onChange={e => setSelectedSpread(spreads.find(s => s.name === e.target.value)!)}
          >
            {spreads.map(s => <MenuItem key={s.name} value={s.name}>{s.name} ({s.count})</MenuItem>)}
          </Select>
        </FormControl>

        {canReverse && (
          <FormControlLabel
            control={<Checkbox checked={allowReversals} onChange={e => setAllowReversals(e.target.checked)} disabled={browseOpen} />}
            label="Reversals"
          />
        )}

        <Button variant="outlined" onClick={draw} disabled={browseOpen}>Draw</Button>
        <Button variant="outlined" onClick={onBrowse} aria-pressed={browseOpen}>Browse</Button>
        {extraActions}
        </Box>
      </Box>
    </Box>
  );
}
