"use client";
import { useEffect, useRef, useState } from 'react';
import tarot from './tarot-images.json';
import Image from 'next/image';
import {
  Button, Checkbox, Collapse, FormControl, FormControlLabel,
  InputLabel, MenuItem, Select, Box, Typography, Grid, Container,
  useMediaQuery, useTheme, TextField, IconButton, Dialog, DialogTitle,
  DialogContent, Divider,
} from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import NumberField from '../../components/NumberField';

interface SpreadPosition {
  name: string;
  description: string;
}

interface SpreadGridPos { col: number; row: number; }

interface SpreadOption {
  name: string;
  count: number | null;
  positions?: SpreadPosition[];
  layout?: SpreadGridPos[];
}

const LAYOUT_CARD_W = 90;
const LAYOUT_CARD_H = 158;
const LAYOUT_GAP = 14;
const CARDS_FADE_MS = 280;

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
    { name: 'Fire', description: 'South — Passion, action, and will' },
    { name: 'Water', description: 'West — Emotion, intuition, and feeling' },
    { name: 'Air', description: 'East — Thought, communication, and clarity' },
    { name: 'Earth', description: 'North — Practical matters and material concerns' },
  ], layout: [
    { col: 1, row: 2 },
    { col: 0, row: 1 },
    { col: 2, row: 1 },
    { col: 1, row: 0 },
  ]},
  { name: 'Five Card Cross', count: 5, positions: [
    { name: 'Present', description: 'Your current situation' },
    { name: 'Challenge', description: 'What crosses or opposes you' },
    { name: 'Past', description: 'Influences from the past' },
    { name: 'Future', description: 'What is coming' },
    { name: 'Outcome', description: 'The likely resolution' },
  ], layout: [
    { col: 1, row: 1 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: 2, row: 1 },
    { col: 1, row: 2 },
  ]},
  { name: 'Horseshoe', count: 7, positions: [
    { name: 'Past', description: 'Recent past influences' },
    { name: 'Present', description: 'Your current situation' },
    { name: 'Hidden Influences', description: 'What lies beneath the surface' },
    { name: 'Obstacles', description: 'Challenges to overcome' },
    { name: 'External Influences', description: 'The environment around you' },
    { name: 'Hopes & Fears', description: 'What you wish for and dread' },
    { name: 'Outcome', description: 'The likely result' },
  ], layout: [
    { col: 0, row: 2 },
    { col: 0, row: 1 },
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 2, row: 0 },
    { col: 2, row: 1 },
    { col: 2, row: 2 },
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
  ], layout: [
    { col: 1, row: 1 },
    { col: 2, row: 1 },
    { col: 1, row: 2 },
    { col: 0, row: 1 },
    { col: 1, row: 0 },
    { col: 3, row: 1 },
    { col: 5, row: 3 },
    { col: 5, row: 2 },
    { col: 5, row: 1 },
    { col: 5, row: 0 },
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
  fortune_telling?: string[];
  Archetype?: string;
  'Hebrew Alphabet'?: string;
  Numerology?: string;
  Elemental?: string;
  'Mythical/Spiritual'?: string;
  'Questions to Ask'?: string[];
  Affirmation?: string;
  Astrology?: string;
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
  const [modalCard, setModalCard] = useState<DrawnCard | null>(null);
  const [selectedSpread, setSelectedSpread] = useState<SpreadOption>(SPREADS[0]);
  const [customCount, setCustomCount] = useState(1);
  const [customPositionText, setCustomPositionText] = useState('');
  const [allowReversals, setAllowReversals] = useState(true);
  const [readingHasReversals, setReadingHasReversals] = useState(true);
  const [flipStates, setFlipStates] = useState<Map<number, CardFlipState>>(new Map());
  const [cardsVisible, setCardsVisible] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const clearTimerRef = useRef<number | null>(null);
  const fadeInFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current !== null) {
        window.clearTimeout(clearTimerRef.current);
      }
      if (fadeInFrameRef.current !== null) {
        window.cancelAnimationFrame(fadeInFrameRef.current);
      }
    };
  }, []);

  const getFlip = (index: number) => flipStates.get(index) ?? DEFAULT_FLIP;

  const drawCards = () => {
    if (isClearing) return;

    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    if (fadeInFrameRef.current !== null) {
      window.cancelAnimationFrame(fadeInFrameRef.current);
      fadeInFrameRef.current = null;
    }

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
    setCardsVisible(false);
    setIsClearing(false);
    setDrawnCards(newDrawnCards);

    fadeInFrameRef.current = window.requestAnimationFrame(() => {
      setCardsVisible(true);
      fadeInFrameRef.current = null;
    });
  };

  const clearCards = () => {
    if (drawnCards.length === 0 || isClearing) return;

    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
    }

    setIsClearing(true);
    setCardsVisible(false);
    clearTimerRef.current = window.setTimeout(() => {
      setDrawnCards([]);
      setFlipStates(new Map());
      setIsClearing(false);
      clearTimerRef.current = null;
    }, CARDS_FADE_MS);
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const layoutCols = selectedSpread.layout ? Math.max(...selectedSpread.layout.map(p => p.col)) : 0;
  const layoutRows = selectedSpread.layout ? Math.max(...selectedSpread.layout.map(p => p.row)) : 0;
  const naturalGridW = (layoutCols + 1) * (200 + LAYOUT_GAP) - LAYOUT_GAP;
  const naturalGridH = (layoutRows + 1) * (350 + LAYOUT_GAP) - LAYOUT_GAP;
  const customPositionLines = customPositionText.split('\n').filter(l => l.trim().length > 0);
  const displayPositions: SpreadPosition[] | undefined = selectedSpread.count === null
    ? customPositionLines.map(l => {
        const [name, ...rest] = l.trim().split(' - ');
        return { name: name.trim(), description: rest.join(' - ').trim() };
      })
    : selectedSpread.positions;

  return (
    <Container maxWidth={false}>
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Typography variant="h4">Altar</Typography>
          <FormControl sx={{ minWidth: 220 }} disabled={drawnCards.length > 0 || isClearing}>
            <InputLabel>Spread</InputLabel>
            <Select
              value={selectedSpread.name}
              label="Spread"
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
              label="Cards"
              value={customCount}
              onValueChange={(val) => setCustomCount(val ?? 1)}
              min={1}
              max={tarot.cards.length}
              sx={{ width: 175 }}
              disabled={drawnCards.length > 0 || isClearing}
            />
          )}
          <FormControlLabel
            control={
              <Checkbox
                checked={allowReversals}
                onChange={(e) => setAllowReversals(e.target.checked)}
                disabled={drawnCards.length > 0 || isClearing}
              />
            }
            label="Reversals"
          />
          {drawnCards.length > 0
            ? <Button variant="outlined" onClick={clearCards} disabled={isClearing}>Clear</Button>
            : <Button variant="contained" onClick={drawCards} disabled={isClearing}>Draw</Button>
          }
        </Box>
        {selectedSpread.count === null && (
          <TextField
            label="Positions"
            multiline
            rows={Math.min(Math.max(customCount, 3), 10)}
            value={customPositionText}
            onChange={(e) => setCustomPositionText(e.target.value)}
            placeholder={`Position 1 - Description\nPosition 2 - Description\n...`}
            disabled={drawnCards.length > 0 || isClearing}
            sx={{ width: 400, maxWidth: '100%', mt: 2 }}
          />
        )}
        {selectedSpread.layout && !isMobile ? (
          <Box sx={{ width: '100%', mt: 4 }}>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${layoutCols + 1}, 1fr)`,
              gap: `${LAYOUT_GAP}px`,
              width: '100%',
              maxWidth: `${naturalGridW}px`,
              mx: 'auto',
              alignItems: 'start',
            }}>
              {drawnCards.map((card, index) => {
                const { isFront, contentVisible, axis, phase } = getFlip(index);
                const gridPos = selectedSpread.layout![index];
                if (!gridPos) return null;
                const animName = `flip${phase === 'shrink' ? 'Shrink' : 'Grow'}${axis}`;
                const pos = selectedSpread.positions?.[index];
                return (
                  <Box
                    key={index}
                    sx={{
                      gridColumn: gridPos.col + 1,
                      gridRow: gridPos.row + 1,
                      display: 'flex',
                      flexDirection: 'column',
                      opacity: cardsVisible ? 1 : 0,
                      transition: `opacity ${CARDS_FADE_MS}ms ease, padding 0.3s ease`,
                      py: contentVisible ? 2 : 0,
                    }}
                  >
                    <Collapse in={contentVisible} timeout={300}>
                      {pos && (
                        <Box sx={{ mb: 1, textAlign: 'center', opacity: contentVisible ? 1 : 0, transition: 'opacity 0.3s' }}>
                          <Typography variant="subtitle2" fontWeight="bold">{pos.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{pos.description}</Typography>
                        </Box>
                      )}
                    </Collapse>
                    <Box
                      sx={{ position: 'relative', width: '100%', aspectRatio: '200/350', cursor: 'pointer' }}
                      onClick={(e) => handleCardClick(e, index)}
                    >
                      <Box
                        onAnimationEnd={(e) => { if (e.target === e.currentTarget) handleAnimationEnd(index); }}
                        sx={{
                          position: 'absolute',
                          top: 0, right: 0, bottom: 0, left: 0,
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
                          fill
                          style={{
                            objectFit: 'contain',
                            filter: 'sepia(0.5)',
                            ...(isFront && card.isReversed ? { transform: 'rotate(180deg)' } : {}),
                          }}
                        />
                      </Box>
                    </Box>
                    <Collapse in={contentVisible} timeout={300}>
                      <Box sx={{ mt: 1, textAlign: 'center', opacity: contentVisible ? 1 : 0, transition: 'opacity 0.3s' }}>
                        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          {card.name}{card.isReversed ? <AutorenewIcon fontSize="inherit" /> : null}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 1, textWrap: 'balance' }}>
                          {card.keywords.join(', ')}
                        </Typography>
                          <Box sx={{ mt: 0.5, display: 'flex', justifyContent: 'center' }}>
                            <IconButton size="small" onClick={() => setModalCard(card)} aria-label="Card details">
                              <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Box>
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ) : (
          <Grid container spacing={3} justifyContent="center" sx={{ mt: 5 }}>
            {drawnCards.map((card, index) => {
              const { isFront, contentVisible, axis, phase } = getFlip(index);
              const animName = `flip${phase === 'shrink' ? 'Shrink' : 'Grow'}${axis}`;
              return (
                <Grid item xs={12} sm={6} md={4} key={index} sx={{ opacity: cardsVisible ? 1 : 0, transition: `opacity ${CARDS_FADE_MS}ms ease` }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Collapse in={contentVisible} timeout={300}>
                      <Box sx={{ mb: 1, textAlign: 'center', minHeight: 40 }}>
                        {displayPositions?.[index] && (
                          <>
                            <Typography variant="subtitle2" fontWeight="bold">{displayPositions[index].name}</Typography>
                            <Typography variant="caption" color="text.secondary">{displayPositions[index].description}</Typography>
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
                        <Box sx={{ mt: 0.5, display: 'flex', justifyContent: 'center' }}>
                          <IconButton size="small" onClick={() => setModalCard(card)} aria-label="Card details">
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </Collapse>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
      {modalCard && (
        <Dialog open onClose={() => setModalCard(null)} maxWidth="sm" fullWidth scroll="paper">
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">{modalCard.name}</Typography>
              {modalCard.isReversed && <AutorenewIcon fontSize="small" />}
            </Box>
            <IconButton onClick={() => setModalCard(null)} size="small" edge="end" aria-label="Close">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ flexShrink: 0 }}>
                <Image
                  src={`/tarot-images/${modalCard.img}`}
                  alt={modalCard.name}
                  width={100}
                  height={175}
                  style={{
                    objectFit: 'contain',
                    filter: 'sepia(0.5)',
                    ...(modalCard.isReversed ? { transform: 'rotate(180deg)' } : {}),
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {modalCard.keywords.join(' · ')}
                </Typography>
                {modalCard.Affirmation && (
                  <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 1 }}>
                    {modalCard.Affirmation}
                  </Typography>
                )}
              </Box>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Light Meanings</Typography>
            <Box component="ul" sx={{ pl: 2, mt: 0.5, mb: 1.5 }}>
              {modalCard.meanings.light.map((m, i) => (
                <Typography component="li" key={i} variant="body2">{m}</Typography>
              ))}
            </Box>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Shadow Meanings</Typography>
            <Box component="ul" sx={{ pl: 2, mt: 0.5, mb: 0 }}>
              {modalCard.meanings.shadow.map((m, i) => (
                <Typography component="li" key={i} variant="body2" color="text.secondary">{m}</Typography>
              ))}
            </Box>
            {modalCard.fortune_telling && modalCard.fortune_telling.length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Fortune Telling</Typography>
                <Box component="ul" sx={{ pl: 2, mt: 0.5, mb: 0 }}>
                  {modalCard.fortune_telling.map((f, i) => (
                    <Typography component="li" key={i} variant="body2">{f}</Typography>
                  ))}
                </Box>
              </>
            )}
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              {modalCard.Archetype && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Archetype</Typography>
                  <Typography variant="body2">{modalCard.Archetype}</Typography>
                </Box>
              )}
              {modalCard['Hebrew Alphabet'] && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Hebrew Alphabet</Typography>
                  <Typography variant="body2">{modalCard['Hebrew Alphabet']}</Typography>
                </Box>
              )}
              {modalCard.Numerology && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Numerology</Typography>
                  <Typography variant="body2">{modalCard.Numerology}</Typography>
                </Box>
              )}
              {modalCard.Elemental && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Elemental</Typography>
                  <Typography variant="body2">{modalCard.Elemental}</Typography>
                </Box>
              )}
              {modalCard.Astrology && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Astrology</Typography>
                  <Typography variant="body2">{modalCard.Astrology}</Typography>
                </Box>
              )}
            </Box>
            {modalCard['Mythical/Spiritual'] && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Mythical / Spiritual</Typography>
                <Typography variant="body2">{modalCard['Mythical/Spiritual']}</Typography>
              </>
            )}
            {modalCard['Questions to Ask'] && modalCard['Questions to Ask'].length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Questions to Ask</Typography>
                <Box component="ul" sx={{ pl: 2, mt: 0.5, mb: 0 }}>
                  {modalCard['Questions to Ask'].map((q, i) => (
                    <Typography component="li" key={i} variant="body2">{q}</Typography>
                  ))}
                </Box>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </Container>
  );
}
