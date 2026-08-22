'use client';
import { useEffect, useRef, useState } from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, Tab, Tabs, Typography } from '@mui/material';
import TarotControls from './TarotReading';
import DivinationControls from './DivinationReading';
import OracleBrowser from './OracleBrowser';
import { ReadingEntry, type AnyReading, type DivinationToken, type DrawSpread, type TokenState } from './ReadingEntry';
import CardModal from './CardModal';
import { RUNES, RUNE_AETTS } from './rune-data';
import { OGHAM, OGHAM_AICMI } from './ogham-data';
import type { SymbolGroup } from './SymbolBrowser';
import type { DrawnCard } from './tarot-constants';
import { motion } from 'framer-motion';
import { readReadingsFromUrl, writeReadingsToUrl } from './reading-url';

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
  const [readings, setReadings] = useState<AnyReading[]>([]);
  const [modalCard, setModalCard] = useState<DrawnCard | null>(null);
  const [modalIsReversed, setModalIsReversed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseTab, setBrowseTab] = useState(0);
  const nextId = useRef(0);

  useEffect(() => {
    const restored = readReadingsFromUrl();
    if (!restored.length) return;
    setReadings(restored);
    nextId.current = restored.length;
  }, []);

  const handleSave = () => {
    writeReadingsToUrl(readings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const extraActions = (
    <>
      <Button variant="outlined" onClick={() => { setReadings([]); writeReadingsToUrl([]); }} disabled={readings.length === 0}>
        Clear
      </Button>
      <Button variant="outlined" onClick={handleSave} disabled={readings.length === 0}>
        {saved ? 'Saved' : 'Save'}
      </Button>
    </>
  );

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
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 3, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Typography variant="h4">Altar</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setBrowseOpen(false)}
              aria-pressed={!browseOpen}
              sx={!browseOpen ? { bgcolor: 'action.selected' } : undefined}
            >
              Reading
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                if (!browseOpen) setBrowseTab(system);
                setBrowseOpen(true);
              }}
              aria-pressed={browseOpen}
              sx={browseOpen ? { bgcolor: 'action.selected' } : undefined}
            >
              Browse
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: browseOpen ? 'none' : 'block', width: '100%', mb: 2 }}>
          {system === 0 && (
            <TarotControls
              systemSelector={systemSelect}
              extraActions={extraActions}
              onDraw={data => setReadings(prev => [{ kind: 'tarot', id: nextId.current++, ...data }, ...prev])}
            />
          )}
          {system === 1 && (
            <DivinationControls
              tokens={RUNE_TOKENS} spreads={RUNE_SPREADS} canReverse
              systemSelector={systemSelect} extraActions={extraActions}
              onDraw={(tokens, spread) => setReadings(prev => [{ kind: 'tokens', id: nextId.current++, label: 'Runes', tokens, spread, states: new Map() }, ...prev])}
            />
          )}
          {system === 2 && (
            <DivinationControls
              tokens={OGHAM_TOKENS} spreads={OGHAM_SPREADS} canReverse
              systemSelector={systemSelect} extraActions={extraActions}
              onDraw={(tokens, spread) => setReadings(prev => [{ kind: 'tokens', id: nextId.current++, label: 'Ogham', tokens, spread, states: new Map() }, ...prev])}
            />
          )}
        </Box>

        {browseOpen && (
          <Tabs
            value={browseTab}
            onChange={(_, value: number) => setBrowseTab(value)}
            centered
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Tarot" />
            <Tab label="Runes" />
            <Tab label="Ogham" />
          </Tabs>
        )}

        {browseOpen && (
          <OracleBrowser
            tab={browseTab}
            runeGroups={RUNE_GROUPS}
            oghamGroups={OGHAM_GROUPS}
          />
        )}

        <Box sx={{ display: browseOpen ? 'none' : 'flex', flexDirection: 'column', gap: 4, width: '100%', mt: 2 }}>
          {readings.map((reading, idx) => (
            <motion.div
              key={reading.id}
              layout
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              style={{ width: '100%' }}
            >
              <ReadingEntry
                reading={reading}
                isFirst={idx === 0}
                isLast={idx === readings.length - 1}
                onMoveUp={() => setReadings(prev => { const a = [...prev]; [a[idx], a[idx - 1]] = [a[idx - 1], a[idx]]; return a; })}
                onMoveDown={() => setReadings(prev => { const a = [...prev]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a; })}
                onRemove={() => setReadings(prev => prev.filter(r => r.id !== reading.id))}
                onReveal={i => setReadings(prev => prev.map(r => r.id !== reading.id || r.kind !== 'tokens' ? r : { ...r, states: new Map(r.states).set(i, { revealed: true, infoOpen: false }) }))}
                onToggleInfo={i => setReadings(prev => prev.map(r => {
                  if (r.id !== reading.id || r.kind !== 'tokens') return r;
                  const s = r.states.get(i) ?? { revealed: false, infoOpen: false };
                  return { ...r, states: new Map(r.states).set(i, { ...s, infoOpen: !s.infoOpen }) };
                }))}
                onRevealAll={() => setReadings(prev => prev.map(r => {
                  if (r.id !== reading.id || r.kind !== 'tokens') return r;
                  const next = new Map<number, TokenState>();
                  r.tokens.forEach((_, i) => next.set(i, { revealed: true, infoOpen: true }));
                  return { ...r, states: next };
                }))}
                onOpenModal={(card, isReversed) => { setModalCard(card); setModalIsReversed(isReversed); }}
              />
            </motion.div>
          ))}
        </Box>

      {modalCard && (
        <CardModal
          modalCard={modalCard}
          modalIsReversed={modalIsReversed}
          onClose={() => setModalCard(null)}
        />
      )}
    </Box>
  );
}

