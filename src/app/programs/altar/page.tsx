'use client';
import { useState } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import TarotReading from './TarotReading';
import DivinationReading, { type DivinationToken, type DrawSpread } from './DivinationReading';
import { RUNES, RUNE_AETTS } from './rune-data';
import { OGHAM, OGHAM_AICMI } from './ogham-data';
import type { SymbolGroup } from './SymbolBrowser';

const RUNE_TOKENS: DivinationToken[] = RUNES.map(r => ({
  id: r.name, symbol: r.symbol, name: r.name,
  secondary: r.phoneme, keywords: r.keywords,
  upright: r.upright, reversed: r.reversed || undefined,
}));

const RUNE_GROUPS: SymbolGroup[] = RUNE_AETTS.map(aett => ({
  name: aett.name,
  tokens: aett.runes.map(r => ({
    id: r.name, symbol: r.symbol, name: r.name,
    secondary: r.phoneme, keywords: r.keywords,
    upright: r.upright, reversed: r.reversed || undefined,
  })),
}));

const RUNE_SPREADS: DrawSpread[] = [
  { name: 'Single',            count: 1 },
  { name: 'Three Nornir',      count: 3, positions: ['Past', 'Present', 'Future'] },
  { name: 'Five-Rune Cross',   count: 5, positions: ['Centre', 'Above', 'Below', 'Before', 'Behind'] },
  { name: 'Runic Compass',     count: 8 },
];

const OGHAM_TOKENS: DivinationToken[] = OGHAM.map(o => ({
  id: o.name, symbol: o.symbol, name: o.name,
  secondary: o.tree, keywords: o.keywords,
  upright: o.meaning,
}));

const OGHAM_GROUPS: SymbolGroup[] = OGHAM_AICMI.map(aicme => ({
  name: aicme.name,
  tokens: aicme.fews.map(o => ({
    id: o.name, symbol: o.symbol, name: o.name,
    secondary: o.tree, keywords: o.keywords,
    upright: o.meaning,
  })),
}));

const OGHAM_SPREADS: DrawSpread[] = [
  { name: 'Single Few',      count: 1 },
  { name: 'Three Branches',  count: 3, positions: ['Root', 'Trunk', 'Crown'] },
  { name: 'Five Directions', count: 5, positions: ['East', 'South', 'West', 'North', 'Centre'] },
];

export default function AltarPage() {
  const [system, setSystem] = useState(0);

  const systemSelect = (
    <FormControl sx={{ minWidth: 130 }}>
      <InputLabel>Oracle</InputLabel>
      <Select value={system} label="Oracle" onChange={e => setSystem(Number(e.target.value))}>
        <MenuItem value={0}>Tarot</MenuItem>
        <MenuItem value={1}>Runes</MenuItem>
        <MenuItem value={2}>Ogham</MenuItem>
      </Select>
    </FormControl>
  );

  return (
    <Box>
      {system === 0 && <TarotReading systemSelector={systemSelect} />}
      {system === 1 && <DivinationReading label="Runes" tokens={RUNE_TOKENS} spreads={RUNE_SPREADS} canReverse systemSelector={systemSelect} browseGroups={RUNE_GROUPS} />}
      {system === 2 && <DivinationReading label="Ogham" tokens={OGHAM_TOKENS} spreads={OGHAM_SPREADS} canReverse systemSelector={systemSelect} browseGroups={OGHAM_GROUPS} />}
    </Box>
  );
}

