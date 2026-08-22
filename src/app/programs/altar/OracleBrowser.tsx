'use client';
import { Box, Tab, Tabs } from '@mui/material';
import CardBrowser from './CardBrowser';
import SymbolBrowser, { type SymbolGroup } from './SymbolBrowser';

interface Props {
  tab: number;
  onTabChange: (tab: number) => void;
  runeGroups: SymbolGroup[];
  oghamGroups: SymbolGroup[];
}

export default function OracleBrowser({ tab, onTabChange, runeGroups, oghamGroups }: Props) {
  return (
    <Box sx={{ width: '100%' }}>
      <Tabs
        value={tab}
        onChange={(_, value: number) => onTabChange(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Tarot" />
        <Tab label="Runes" />
        <Tab label="Ogham" />
      </Tabs>
      {tab === 0 && <CardBrowser />}
      {tab === 1 && <SymbolBrowser groups={runeGroups} />}
      {tab === 2 && <SymbolBrowser groups={oghamGroups} />}
    </Box>
  );
}
