"use client";
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { enrichedCards, type EnrichedCard } from './tarot-data';
import {
  Button, Checkbox, Collapse, FormControl, FormControlLabel,
  InputLabel, MenuItem, Select, Box, Typography, Grid, Container,
  useMediaQuery, useTheme, TextField, IconButton, Dialog,
  DialogContent, Divider, Chip,
} from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import WorkIcon from '@mui/icons-material/Work';
import MoodIcon from '@mui/icons-material/Mood';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AirIcon from '@mui/icons-material/Air';
import LandscapeIcon from '@mui/icons-material/Landscape';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CalculateIcon from '@mui/icons-material/Calculate';
import FlareIcon from '@mui/icons-material/Flare';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import ThumbsUpDownIcon from '@mui/icons-material/ThumbsUpDown';
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

interface DrawnCard extends EnrichedCard {
  isReversed: boolean;
}

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '\u2609\uFE0E', Moon: '\u263d\uFE0E', Mercury: '\u263f\uFE0E', Venus: '\u2640\uFE0E', Mars: '\u2642\uFE0E',
  Jupiter: '\u2643\uFE0E', Saturn: '\u2644\uFE0E', Uranus: '\u2645\uFE0E', Neptune: '\u2646\uFE0E', Pluto: '\u2647\uFE0E',
};

const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: '\u2648\uFE0E', Taurus: '\u2649\uFE0E', Gemini: '\u264a\uFE0E', Cancer: '\u264b\uFE0E', Leo: '\u264c\uFE0E', Virgo: '\u264d\uFE0E',
  Libra: '\u264e\uFE0E', Scorpio: '\u264f\uFE0E', Sagittarius: '\u2650\uFE0E', Capricorn: '\u2651\uFE0E', Aquarius: '\u2652\uFE0E', Pisces: '\u2653\uFE0E',
};

const ELEMENT_STYLES: Record<string, { bgcolor: string; color: string }> = {
  Fire:  { bgcolor: 'rgba(211,84,0,0.12)',    color: '#b03000' },
  Water: { bgcolor: 'rgba(41,128,185,0.12)',   color: '#1a5276' },
  Air:   { bgcolor: 'rgba(52,152,219,0.12)',   color: '#1a6fa8' },
  Earth: { bgcolor: 'rgba(39,174,96,0.12)',    color: '#1e8449' },
};

const ELEMENT_ICONS: Record<string, React.ReactElement> = {
  Fire:  <WhatshotIcon sx={{ fontSize: '0.875rem' }} />,
  Water: <WaterDropIcon sx={{ fontSize: '0.875rem' }} />,
  Air:   <AirIcon sx={{ fontSize: '0.875rem' }} />,
  Earth: <LandscapeIcon sx={{ fontSize: '0.875rem' }} />,
};

const YES_NO_STYLES: Record<string, { color: string; label: string }> = {
  yes:   { color: 'success.main', label: 'Yes' },
  no:    { color: 'error.main',   label: 'No' },
  maybe: { color: 'warning.main', label: 'Maybe' },
};

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
  const [openContext, setOpenContext] = useState<
    'love' | 'career' | 'mood' | 'spiritual' | 'yes_no' | 'fortune_telling' | 'numerology' | 'astrology' | 'questions' | null
  >(null);
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
    const availableCards = [...enrichedCards];

    for (let i = 0; i < count; i++) {
      if (availableCards.length === 0) break;
      const randomIndex = Math.floor(Math.random() * availableCards.length);
      const card = availableCards.splice(randomIndex, 1)[0];
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

  const modalIsReversed = Boolean(modalCard?.isReversed) && readingHasReversals;

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
              max={enrichedCards.length}
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
        <Dialog
          open
          onClose={() => { setModalCard(null); setOpenContext(null); }}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { height: '90vh', maxHeight: '90vh', display: 'flex', flexDirection: 'column' } }}
        >
          <DialogContent sx={{ padding: '0 !important', display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* Left: full-height card image */}
            <Box
              sx={{
                width: '50%',
                flexShrink: 0,
                position: 'relative',
                borderRight: 1,
                borderColor: 'divider',
              }}
            >
              <Image
                src={`/tarot-images/${modalCard.img}`}
                alt={modalCard.name}
                fill
                style={{ objectFit: 'contain', filter: 'sepia(0.5)' }}
              />
            </Box>
            {/* Right: scrollable content */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
              {/* Title + close */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="h5" component="h2">{modalCard.name}</Typography>
                </Box>
                <IconButton
                  onClick={() => { setModalCard(null); setOpenContext(null); }}
                  size="small"
                  aria-label="Close"
                  sx={{ flexShrink: 0, ml: 1 }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
              {/* Attribute chips */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {modalCard.element && ELEMENT_ICONS[modalCard.element] && (
                  <Chip
                    label={modalCard.element}
                    size="small"
                    icon={ELEMENT_ICONS[modalCard.element]}
                    sx={{ bgcolor: 'transparent' }}
                  />
                )}
                {modalCard.planet && (
                  <Chip
                    label={`${PLANET_SYMBOLS[modalCard.planet] ?? ''} ${modalCard.planet}`}
                    size="small"
                    sx={{ fontFamily: 'serif', bgcolor: 'transparent' }}
                  />
                )}
                {modalCard.zodiac && modalCard.zodiac.split(',').map(z => z.trim()).filter(Boolean).map(z => (
                  <Chip
                    key={z}
                    label={`${ZODIAC_SYMBOLS[z] ?? ''} ${z}`}
                    size="small"
                    sx={{ fontFamily: 'serif', bgcolor: 'transparent' }}
                  />
                ))}
              </Box>
              {(
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                  {modalIsReversed ? modalCard.meaning_reversed : modalCard.meaning_upright}
                </Typography>
              )}
              {modalCard.Affirmation && !modalIsReversed && (
                <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.75, mb: 1 }}>
                  {modalCard.Affirmation}
                </Typography>
              )}
              {/* Keywords */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                {(modalIsReversed
                  ? (modalCard.keywords_reversed ?? modalCard.keywords)
                  : modalCard.keywords
                ).map((kw, i) => (
                  <Chip
                    key={i} label={kw} size="small"
                    sx={{ bgcolor: 'transparent' }}
                  />
                ))}
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
                  <Typography component="li" key={i} variant="body2">{m}</Typography>
                ))}
              </Box>
              {/* Context icons — click to reveal */}
              {(modalCard.love || modalCard.career || modalCard.mood || modalCard.spiritual || modalCard.yes_no) && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {modalCard.yes_no && (
                      <Chip
                        size="small"
                        icon={<ThumbsUpDownIcon />}
                        label="Yes / No"
                        onClick={() => setOpenContext(openContext === 'yes_no' ? null : 'yes_no')}
                        sx={openContext === 'yes_no' && modalCard.yes_no && YES_NO_STYLES[modalCard.yes_no]
                          ? { bgcolor: 'transparent', color: YES_NO_STYLES[modalCard.yes_no].color, '& .MuiChip-icon': { color: 'inherit' } }
                          : { bgcolor: 'transparent', color: 'text.disabled', '& .MuiChip-icon': { color: 'inherit' } }}
                      />
                    )}
                    {modalCard.love && (
                      <Chip
                        size="small"
                        icon={<FavoriteIcon />}
                        label="Love"
                        onClick={() => setOpenContext(openContext === 'love' ? null : 'love')}
                        sx={openContext === 'love'
                          ? { bgcolor: 'transparent', color: 'error.main', '& .MuiChip-icon': { color: 'inherit' } }
                          : { bgcolor: 'transparent', color: 'text.disabled', '& .MuiChip-icon': { color: 'inherit' } }}
                      />
                    )}
                    {modalCard.career && (
                      <Chip
                        size="small"
                        icon={<WorkIcon />}
                        label="Career"
                        onClick={() => setOpenContext(openContext === 'career' ? null : 'career')}
                        sx={openContext === 'career'
                          ? { bgcolor: 'transparent', color: 'primary.main', '& .MuiChip-icon': { color: 'inherit' } }
                          : { bgcolor: 'transparent', color: 'text.disabled', '& .MuiChip-icon': { color: 'inherit' } }}
                      />
                    )}
                    {modalCard.mood && (
                      <Chip
                        size="small"
                        icon={<MoodIcon />}
                        label="Mood"
                        onClick={() => setOpenContext(openContext === 'mood' ? null : 'mood')}
                        sx={openContext === 'mood'
                          ? { bgcolor: 'transparent', color: 'warning.main', '& .MuiChip-icon': { color: 'inherit' } }
                          : { bgcolor: 'transparent', color: 'text.disabled', '& .MuiChip-icon': { color: 'inherit' } }}
                      />
                    )}
                    {modalCard.spiritual && (
                      <Chip
                        size="small"
                        icon={<AutoAwesomeIcon />}
                        label="Spiritual"
                        onClick={() => setOpenContext(openContext === 'spiritual' ? null : 'spiritual')}
                        sx={openContext === 'spiritual'
                          ? { bgcolor: 'transparent', color: 'secondary.main', '& .MuiChip-icon': { color: 'inherit' } }
                          : { bgcolor: 'transparent', color: 'text.disabled', '& .MuiChip-icon': { color: 'inherit' } }}
                      />
                    )}
                    {modalCard.fortune_telling && modalCard.fortune_telling.length > 0 && (
                      <Chip
                        size="small"
                        icon={<AutoFixHighIcon />}
                        label="Fortune Telling"
                        onClick={() => setOpenContext(openContext === 'fortune_telling' ? null : 'fortune_telling')}
                        sx={openContext === 'fortune_telling'
                          ? { bgcolor: 'transparent', color: 'secondary.main', '& .MuiChip-icon': { color: 'inherit' } }
                          : { bgcolor: 'transparent', color: 'text.disabled', '& .MuiChip-icon': { color: 'inherit' } }}
                      />
                    )}
                    {modalCard.Numerology && (
                      <Chip
                        size="small"
                        icon={<CalculateIcon />}
                        label="Numerology"
                        onClick={() => setOpenContext(openContext === 'numerology' ? null : 'numerology')}
                        sx={openContext === 'numerology'
                          ? { bgcolor: 'transparent', color: 'success.main', '& .MuiChip-icon': { color: 'inherit' } }
                          : { bgcolor: 'transparent', color: 'text.disabled', '& .MuiChip-icon': { color: 'inherit' } }}
                      />
                    )}
                    {modalCard.Astrology && (
                      <Chip
                        size="small"
                        icon={<FlareIcon />}
                        label="Astrology"
                        onClick={() => setOpenContext(openContext === 'astrology' ? null : 'astrology')}
                        sx={openContext === 'astrology'
                          ? { bgcolor: 'transparent', color: 'warning.dark', '& .MuiChip-icon': { color: 'inherit' } }
                          : { bgcolor: 'transparent', color: 'text.disabled', '& .MuiChip-icon': { color: 'inherit' } }}
                      />
                    )}
                    {modalCard['Questions to Ask'] && modalCard['Questions to Ask'].length > 0 && (
                      <Chip
                        size="small"
                        icon={<QuestionMarkIcon />}
                        label="Questions"
                        onClick={() => setOpenContext(openContext === 'questions' ? null : 'questions')}
                        sx={openContext === 'questions'
                          ? { bgcolor: 'transparent', color: 'text.secondary', '& .MuiChip-icon': { color: 'inherit' } }
                          : { bgcolor: 'transparent', color: 'text.disabled', '& .MuiChip-icon': { color: 'inherit' } }}
                      />
                    )}
                  </Box>
                  <Collapse in={openContext !== null}>
                    <Box sx={{ mt: 0.75, textAlign: 'center' }}>
                      {openContext === 'yes_no' ? (
                        <Typography variant="body2">
                          {modalCard.yes_no ? (YES_NO_STYLES[modalCard.yes_no]?.label ?? '') : ''}
                        </Typography>
                      ) : openContext === 'fortune_telling' ? (
                        <Box component="ul" sx={{ pl: 2, mt: 0, mb: 0 }}>
                          {modalCard.fortune_telling?.map((f, i) => (
                            <Typography component="li" key={i} variant="body2">{f}</Typography>
                          ))}
                        </Box>
                      ) : openContext === 'questions' ? (
                        <Box component="ul" sx={{ pl: 2, mt: 0, mb: 0 }}>
                          {modalCard['Questions to Ask']?.map((q, i) => (
                            <Typography component="li" key={i} variant="body2">{q}</Typography>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2">
                          {openContext === 'love' ? modalCard.love
                            : openContext === 'career' ? modalCard.career
                            : openContext === 'mood' ? modalCard.mood
                            : openContext === 'spiritual' ? modalCard.spiritual
                            : openContext === 'numerology' ? modalCard.Numerology
                            : openContext === 'astrology' ? modalCard.Astrology
                            : ''}
                        </Typography>
                      )}
                    </Box>
                  </Collapse>
                </>
              )}
              {/* Waite content */}
              {(modalCard.waite_divinatory || modalCard.waite_reversed || modalCard.waite_description) && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  {modalCard.waite_divinatory && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Waite · Divinatory
                      </Typography>
                      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                        {modalCard.waite_divinatory}
                      </Typography>
                    </Box>
                  )}
                  {modalCard.waite_reversed && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Waite · Reversed
                      </Typography>
                      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                        {modalCard.waite_reversed}
                      </Typography>
                    </Box>
                  )}
                  {modalCard.waite_description && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Description
                      </Typography>
                      <Typography variant="body2" sx={{ lineHeight: 1.65 }}>
                        {modalCard.waite_description}
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </DialogContent>
        </Dialog>
      )}
    </Container>
  );
}
