'use client';
import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import TarotReading from './TarotReading';
import DivinationReading, { type DivinationToken, type DrawSpread } from './DivinationReading';
import { RUNES } from './rune-data';
import { OGHAM } from './ogham-data';

const RUNE_TOKENS: DivinationToken[] = RUNES.map(r => ({
  id: r.name, symbol: r.symbol, name: r.name,
  secondary: r.phoneme, keywords: r.keywords,
  upright: r.upright, reversed: r.reversed || undefined,
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

const OGHAM_SPREADS: DrawSpread[] = [
  { name: 'Single Few',     count: 1 },
  { name: 'Three Branches', count: 3, positions: ['Root', 'Trunk', 'Crown'] },
  { name: 'Five Directions', count: 5, positions: ['East', 'South', 'West', 'North', 'Centre'] },
];

export default function AltarPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'center' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Tarot" />
          <Tab label="Runes" />
          <Tab label="Ogham" />
        </Tabs>
      </Box>
      {tab === 0 && <TarotReading />}
      {tab === 1 && <DivinationReading label="Runes" tokens={RUNE_TOKENS} spreads={RUNE_SPREADS} canReverse />}
      {tab === 2 && <DivinationReading label="Ogham" tokens={OGHAM_TOKENS} spreads={OGHAM_SPREADS} />}
    </Box>
  );
}

