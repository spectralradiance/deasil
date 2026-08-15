'use client';
import { useState } from 'react';
import {
  Box, Checkbox, FormControl, FormControlLabel,
  InputLabel, MenuItem, Select, Typography,
} from '@mui/material';
import SymbolBrowser, { type SymbolGroup } from './SymbolBrowser';
import { type DivinationToken, type DrawSpread, type DrawnToken } from './ReadingEntry';

interface Props {
  tokens: DivinationToken[];
  spreads: DrawSpread[];
  canReverse?: boolean;
  systemSelector?: React.ReactNode;
  browseGroups?: SymbolGroup[];
  onDraw: (tokens: DrawnToken[], spread: DrawSpread) => void;
}

export default function DivinationControls({ tokens, spreads, canReverse = false, systemSelector, browseGroups, onDraw }: Props) {
  const [browseOpen, setBrowseOpen] = useState(false);
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', justifyContent: 'center', mb: 2 }}>
        <Typography variant="h4">Altar</Typography>
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

        <Box component="button" onClick={() => { setBrowseOpen(false); draw(); }}
          sx={{ px: 2, py: 0.75, borderRadius: 1, border: '1px solid', borderColor: 'primary.main', bgcolor: 'transparent', color: 'primary.main', cursor: 'pointer', '&:hover': { color: 'primary.light', borderColor: 'primary.light' } }}>
          Draw
        </Box>
        {browseGroups && (
          <Box component="button" onClick={() => setBrowseOpen(b => !b)}
            sx={{ px: 2, py: 0.75, borderRadius: 1, border: 'none', bgcolor: 'transparent', color: browseOpen ? 'primary.main' : 'inherit', cursor: 'pointer', '&:hover': { color: 'primary.light' } }}>
            Browse
          </Box>
        )}
      </Box>
      {browseOpen && browseGroups && <SymbolBrowser groups={browseGroups} />}
    </Box>
  );
}
