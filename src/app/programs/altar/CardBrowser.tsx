'use client';
import React, { memo, useState } from 'react';
import Image from 'next/image';
import { Box, Divider, Typography } from '@mui/material';
import { enrichedCards } from './tarot-data';
import type { DrawnCard } from './tarot-constants';
import CardModal from './CardModal';

const ALL_CARDS: DrawnCard[] = enrichedCards.map(c => ({ ...c, isReversed: false }));

// Precompute groups with global stagger indices so the slide-in wave flows across sections
const GROUPS = (() => {
  const defs = [
    { key: 'm', label: 'Major Arcana' },
    { key: 'w', label: 'Wands' },
    { key: 'c', label: 'Cups' },
    { key: 's', label: 'Swords' },
    { key: 'p', label: 'Pentacles' },
  ];
  let offset = 0;
  return defs.map(({ key, label }) => {
    const cards = ALL_CARDS.filter(c => c.img.startsWith(key));
    const start = offset;
    offset += cards.length;
    return { label, cards, start };
  });
})();

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: 'repeat(4, 1fr)', sm: 'repeat(6, 1fr)', md: 'repeat(8, 1fr)' },
  gap: 2,
};

// Memo wrapper keeps each card isolated so only the clicked card re-renders on modal open
const BrowseCard = memo(function BrowseCard({ card, index, onInfoClick }: {
  card: DrawnCard;
  index: number;
  onInfoClick: (c: DrawnCard) => void;
}) {
  return (
    <Box
      onClick={() => onInfoClick(card)}
      sx={{
        cursor: 'pointer',
        opacity: 0,
        animation: 'cardSlideIn 0.35s ease forwards',
        animationDelay: `${Math.min(index * 10, 600)}ms`,
        '@keyframes cardSlideIn': {
          from: { opacity: 0, transform: 'translateY(18px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        transition: 'filter 0.15s',
        '&:hover': { filter: 'brightness(1.15)' },
      }}
    >
      <Box sx={{ position: 'relative', width: '100%', aspectRatio: '4/7', borderRadius: 1, overflow: 'hidden' }}>
        <Image src={`/tarot-images/${card.img}`} alt={card.name} fill sizes="200px"
          style={{ objectFit: 'cover', filter: 'sepia(0.5)' }} />
      </Box>
      <Typography variant="caption" sx={{
        display: 'block', textAlign: 'center', mt: 0.75,
        color: 'text.primary', fontSize: '0.75rem', lineHeight: 1.3,
      }}>
        {card.name}
      </Typography>
    </Box>
  );
});

export default function CardBrowser() {
  const [modalCard, setModalCard] = useState<DrawnCard | null>(null);

  return (
    <>
      {GROUPS.map(({ label, cards, start }, gi) => (
        <Box key={label} sx={{ mt: gi === 0 ? 3 : 5, maxWidth: 960, mx: 'auto', width: '100%' }}>
          {gi > 0 && <Divider sx={{ mb: 3 }} />}
          <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary', fontStyle: 'italic' }}>
            {label}
          </Typography>
          <Box sx={GRID_SX}>
            {cards.map((card, i) => (
              <BrowseCard key={card.name} card={card} index={start + i} onInfoClick={setModalCard} />
            ))}
          </Box>
        </Box>
      ))}
      {modalCard && (
        <CardModal modalCard={modalCard} modalIsReversed={false} onClose={() => setModalCard(null)} />
      )}
    </>
  );
}
