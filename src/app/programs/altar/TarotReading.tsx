"use client";
import { useState } from 'react';
import tarot from './tarot-images.json';
import Image from 'next/image';
import {
  Button, Checkbox, Collapse, FormControl, FormControlLabel,
  InputLabel, MenuItem, Select, Box, Typography, Grid, Container,
} from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import NumberField from '../../components/NumberField';

interface SpreadPosition {
  name: string;
  description: string;
}

interface SpreadOption {
  name: string;
  count: number | null;
  positions?: SpreadPosition[];
}

const SPREADS: SpreadOption[] = [
  { name: 'Single Card', count: 1, positions: [
    { name: 'The Card', description: 'Your central focus or message' },
  ]},
  { name: 'Two Card', count: 2, positions: [
    { name: 'Situation', description: 'The current state of affairs' },
    { name: 'Advice', description: 'Guidance for how to proceed' },
  ]},
  { name: 'Past · Present · Future', count: 3, positions: [
    { name: 'Past', description: 'What has led you to this moment' },
    { name: 'Present', description: 'Where you stand right now' },
    { name: 'Future', description: 'Where your path is heading' },
  ]},
  { name: 'Four Elements', count: 4, positions: [
    { name: 'Fire', description: 'Passion, action, and will' },
    { name: 'Water', description: 'Emotion, intuition, and feeling' },
    { name: 'Air', description: 'Thought, communication, and clarity' },
    { name: 'Earth', description: 'Practical matters and material concerns' },
  ]},
  { name: 'Five Card Cross', count: 5, positions: [
    { name: 'Present', description: 'Your current situation' },
    { name: 'Challenge', description: 'What crosses or opposes you' },
    { name: 'Past', description: 'Influences from the past' },
    { name: 'Future', description: 'What is coming' },
    { name: 'Outcome', description: 'The likely resolution' },
  ]},
  { name: 'Horseshoe', count: 7, positions: [
    { name: 'Past', description: 'Recent past influences' },
    { name: 'Present', description: 'Your current situation' },
    { name: 'Hidden Influences', description: 'What lies beneath the surface' },
    { name: 'Obstacles', description: 'Challenges to overcome' },
    { name: 'External Influences', description: 'The environment around you' },
    { name: 'Hopes & Fears', description: 'What you wish for and dread' },
    { name: 'Outcome', description: 'The likely result' },
  ]},
  { name: 'Celtic Cross', count: 10, positions: [
    { name: 'Present', description: 'Your current situation' },
    { name: 'Challenge', description: 'What crosses you' },
    { name: 'Distant Past', description: 'The root of the matter' },
    { name: 'Recent Past', description: 'What is passing away' },
    { name: 'Best Outcome', description: 'What you are working toward' },
    { name: 'Near Future', description: 'What is coming next' },
    { name: 'Self', description: 'Your attitude and approach' },
    { name: 'External Influences', description: "Others' perceptions and environment" },
    { name: 'Hopes & Fears', description: 'Your inner hopes and fears' },
    { name: 'Final Outcome', description: 'The likely resolution' },
  ]},
  { name: 'Custom', count: null },
];

interface CardData {
  name: string;
  img: string;
  keywords: string[];
  meanings: {
    light: string[];
    shadow: string[];
  };
}

interface DrawnCard extends CardData {
  isReversed: boolean;
}

interface CardFlipState {
  isFront: boolean;
  contentVisible: boolean;
  axis: 'X' | 'Y';
  phase: 'idle' | 'shrink' | 'grow';
}

const DEFAULT_FLIP: CardFlipState = { isFront: false, contentVisible: false, axis: 'Y', phase: 'idle' };

export default function TarotReading() {
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [selectedSpread, setSelectedSpread] = useState<SpreadOption>(SPREADS[0]);
  const [customCount, setCustomCount] = useState(1);
  const [allowReversals, setAllowReversals] = useState(true);
  const [readingHasReversals, setReadingHasReversals] = useState(true);
  const [flipStates, setFlipStates] = useState<Map<number, CardFlipState>>(new Map());

  const getFlip = (index: number) => flipStates.get(index) ?? DEFAULT_FLIP;

  const drawCards = () => {
    const count = selectedSpread.count ?? customCount;
    const newDrawnCards: DrawnCard[] = [];
    const availableCards = [...tarot.cards];

    for (let i = 0; i < count; i++) {
      if (availableCards.length === 0) break;
      const randomIndex = Math.floor(Math.random() * availableCards.length);
      const card = availableCards.splice(randomIndex, 1)[0] as unknown as CardData;
      const isReversed = allowReversals && Math.random() < 0.5;
      newDrawnCards.push({ ...card, isReversed });
    }
    setReadingHasReversals(allowReversals);
    setFlipStates(new Map());
    setDrawnCards(newDrawnCards);
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.abs((e.clientX - rect.left) / rect.width - 0.5);
    const relY = Math.abs((e.clientY - rect.top) / rect.height - 0.5);
    const axis: 'X' | 'Y' = relX >= relY ? 'Y' : 'X';

    setFlipStates(prev => {
      const state = prev.get(index) ?? DEFAULT_FLIP;
      if (state.phase !== 'idle') return prev;
      if (!state.isFront) {
        return new Map(prev).set(index, { ...state, axis, phase: 'shrink' });
      } else {
        return new Map(prev).set(index, { ...state, contentVisible: !state.contentVisible });
      }
    });
  };

  const handleAnimationEnd = (index: number) => {
    setFlipStates(prev => {
      const state = prev.get(index) ?? DEFAULT_FLIP;
      if (state.phase === 'shrink') {
        return new Map(prev).set(index, { isFront: !state.isFront, contentVisible: false, axis: state.axis, phase: 'grow' });
      }
      if (state.phase === 'grow') {
        return new Map(prev).set(index, { ...state, phase: 'idle' });
      }
      return prev;
    });
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Tarot Reading
        </Typography>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel>Spread Type</InputLabel>
            <Select
              value={selectedSpread.name}
              label="Spread Type"
              onChange={(e) => {
                const spread = SPREADS.find(s => s.name === e.target.value)!;
                setSelectedSpread(spread);
              }}
            >
              {SPREADS.map(s => <MenuItem key={s.name} value={s.name}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
          {selectedSpread.count === null && (
            <NumberField
              label="Number of Cards"
              value={customCount}
              onValueChange={(val) => setCustomCount(val ?? 1)}
              min={1}
              max={tarot.cards.length}
              sx={{ width: 175 }}
            />
          )}
          <FormControlLabel
            control={
              <Checkbox
                checked={allowReversals}
                onChange={(e) => setAllowReversals(e.target.checked)}
              />
            }
            label="Allow Reversals"
          />
          <Button variant="contained" onClick={drawCards}>Draw Cards</Button>
        </Box>
        <Grid container spacing={3} justifyContent="center" sx={{ mt: 5 }}>
          {drawnCards.map((card, index) => {
            const { isFront, contentVisible, axis, phase } = getFlip(index);
            const animName = `flip${phase === 'shrink' ? 'Shrink' : 'Grow'}${axis}`;
            return (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Collapse in={contentVisible} timeout={300}>
                    <Box sx={{ mb: 1, textAlign: 'center', minHeight: 40 }}>
                      {selectedSpread.positions?.[index] && (
                        <>
                          <Typography variant="subtitle2" fontWeight="bold">{selectedSpread.positions[index].name}</Typography>
                          <Typography variant="caption" color="text.secondary">{selectedSpread.positions[index].description}</Typography>
                        </>
                      )}
                    </Box>
                  </Collapse>
                  <Box
                    onClick={(e) => handleCardClick(e, index)}
                    onAnimationEnd={(e) => { if (e.target === e.currentTarget) handleAnimationEnd(index); }}
                    sx={{
                      cursor: 'pointer',
                      width: 200,
                      animation: phase !== 'idle' ? `${animName} 0.15s ease forwards` : 'none',
                      '@keyframes flipShrinkY': { '0%': { transform: 'scaleX(1)', opacity: 1 }, '100%': { transform: 'scaleX(0)', opacity: 0 } },
                      '@keyframes flipGrowY': { '0%': { transform: 'scaleX(0)', opacity: 0 }, '100%': { transform: 'scaleX(1)', opacity: 1 } },
                      '@keyframes flipShrinkX': { '0%': { transform: 'scaleY(1)', opacity: 1 }, '100%': { transform: 'scaleY(0)', opacity: 0 } },
                      '@keyframes flipGrowX': { '0%': { transform: 'scaleY(0)', opacity: 0 }, '100%': { transform: 'scaleY(1)', opacity: 1 } },
                    }}
                  >
                    <Image
                      src={isFront ? `/tarot-images/${card.img}` : '/tarot-images/back.jpg'}
                      alt={isFront ? card.name : 'Card back'}
                      width={200}
                      height={350}
                      style={{
                        display: 'block',
                        filter: 'sepia(0.5)',
                        ...(isFront && card.isReversed ? { transform: 'rotate(180deg)' } : {}),
                      }}
                    />
                  </Box>
                  <Collapse in={contentVisible} timeout={300}>
                    <Box sx={{ mt: 2, maxWidth: 300, opacity: contentVisible ? 1 : 0, transition: 'opacity 0.3s', textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        {card.name}{card.isReversed ? <AutorenewIcon fontSize="inherit" /> : null}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textWrap: 'balance' }}>
                        {card.keywords.join(', ')}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {!readingHasReversals ? (
                          ([...card.meanings.light].sort((a, b) => b.length - a.length).map((meaning, i) => (
                            <Typography key={i} variant="body2" sx={{ textWrap: 'balance' }}>{meaning}</Typography>
                          )))
                        ) : (
                          [...(card.isReversed ? card.meanings.shadow : card.meanings.light)].sort((a, b) => b.length - a.length).map((meaning, i) => (
                            <Typography key={i} variant="body2" sx={{ textWrap: 'balance' }}>{meaning}</Typography>
                          ))
                        )}
                      </Box>
                    </Box>
                  </Collapse>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Container>
  );
}
