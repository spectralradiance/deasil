'use client';
import { Box } from '@mui/material';
import CardBrowser from './CardBrowser';
import SymbolBrowser, { type SymbolGroup } from './SymbolBrowser';

interface Props {
  tab: number;
  runeGroups: SymbolGroup[];
  oghamGroups: SymbolGroup[];
}

export default function OracleBrowser({ tab, runeGroups, oghamGroups }: Props) {
  return (
    <Box sx={{ width: '100%' }}>
      {tab === 0 && <CardBrowser />}
      {tab === 1 && <SymbolBrowser groups={runeGroups} />}
      {tab === 2 && <SymbolBrowser groups={oghamGroups} />}
    </Box>
  );
}
