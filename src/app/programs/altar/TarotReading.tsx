"use client";
import { useState } from 'react';
import { Box } from '@mui/material';
import { enrichedCards } from './tarot-data';
import { SPREADS, type DrawnCard, type SpreadOption, type SpreadPosition } from './tarot-constants';
import SpreadControls from './SpreadControls';
import { type TarotReadingRecord } from './ReadingEntry';
import { createDrawRng, drawFrom } from './seeded-rng';

export default function TarotControls({ message, systemSelector, extraActions, onDraw }: {
  message: string;
  systemSelector?: React.ReactNode;
  extraActions?: React.ReactNode;
  onDraw: (data: Omit<TarotReadingRecord, 'id' | 'kind'>) => void;
}) {
  const [selectedSpread, setSelectedSpread] = useState<SpreadOption>(SPREADS[0]);
  const [customCount, setCustomCount] = useState(1);
  const [customPositionText, setCustomPositionText] = useState('');
  const [allowReversals, setAllowReversals] = useState(false);

  const draw = () => {
    const count = selectedSpread.count ?? customCount;
    const rng = createDrawRng(message, `Tarot|${selectedSpread.name}|${count}`);
    const newCards: DrawnCard[] = drawFrom(enrichedCards, count, rng, allowReversals)
      .map(({ item, isReversed }) => ({ ...item, isReversed }));
    const customPositionLines = customPositionText.split('\n').filter(l => l.trim().length > 0);
    const displayPositions: SpreadPosition[] | undefined = selectedSpread.count === null
      ? customPositionLines.map(l => { const [name, ...rest] = l.trim().split(' - '); return { name: name.trim(), description: rest.join(' - ').trim() }; })
      : selectedSpread.positions;
    onDraw({ cards: newCards, spread: selectedSpread, positions: displayPositions, hasReversals: allowReversals });
  };

  return (
    <Box sx={{ width: '100%' }}>
      <SpreadControls
          selectedSpread={selectedSpread}
          onSpreadChange={setSelectedSpread}
          customCount={customCount}
          onCustomCountChange={setCustomCount}
          customPositionText={customPositionText}
          onCustomPositionTextChange={setCustomPositionText}
          allowReversals={allowReversals}
          onAllowReversalsChange={setAllowReversals}
          drawnCards={[]}
          isClearing={false}
          onDraw={draw}
          onClear={() => {}}
          systemSelector={systemSelector}
          extraActions={extraActions}
        />
    </Box>
  );
}
