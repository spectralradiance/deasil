"use client";
import { useEffect, useRef, useState } from 'react';
import { Box, Container, Grid, useMediaQuery, useTheme } from '@mui/material';
import { enrichedCards } from './tarot-data';
import {
  CARDS_FADE_MS, DEFAULT_FLIP, LAYOUT_GAP, SPREADS,
  type CardFlipState, type DrawnCard, type SpreadOption, type SpreadPosition,
} from './tarot-constants';
import SpreadControls from './SpreadControls';
import CardItem from './CardItem';
import CardModal from './CardModal';

export default function TarotReading() {
  // ── State ─────────────────────────────────────────────────────────────────

  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  /** The card currently shown in the detail modal (null = modal closed) */
  const [modalCard, setModalCard] = useState<DrawnCard | null>(null);
  const [selectedSpread, setSelectedSpread] = useState<SpreadOption>(SPREADS[0]);
  const [customCount, setCustomCount] = useState(1);
  const [customPositionText, setCustomPositionText] = useState('');
  const [allowReversals, setAllowReversals] = useState(true);
  /**
   * Snapshot of whether reversals were active when the current cards were drawn.
   * Used to determine how the modal displays meaning text (upright vs reversed).
   */
  const [readingHasReversals, setReadingHasReversals] = useState(true);
  /** Per-card flip state; keyed by card index within the current draw */
  const [flipStates, setFlipStates] = useState<Map<number, CardFlipState>>(new Map());
  /** Controls the opacity fade when cards appear or disappear */
  const [cardsVisible, setCardsVisible] = useState(false);
  /** True while the clear fade-out animation is running (prevents re-drawing) */
  const [isClearing, setIsClearing] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────

  /** setTimeout handle for the post-clear delay */
  const clearTimerRef = useRef<number | null>(null);
  /** requestAnimationFrame handle for the draw fade-in */
  const fadeInFrameRef = useRef<number | null>(null);

  // Cancel any pending timers on unmount to avoid state updates on a dead component
  useEffect(() => {
    return () => {
      if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current);
      if (fadeInFrameRef.current !== null) window.cancelAnimationFrame(fadeInFrameRef.current);
    };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Returns the flip state for card at `index`, defaulting to the face-down idle state */
  const getFlip = (index: number) => flipStates.get(index) ?? DEFAULT_FLIP;

  // ── Handlers ──────────────────────────────────────────────────────────────

  /** Randomly draws `count` unique cards from the deck, then fades them in */
  const drawCards = () => {
    if (isClearing) return;

    // Cancel any in-flight timers from a previous draw/clear cycle
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
    // Copy the deck so we can splice without mutating the source array
    const availableCards = [...enrichedCards];

    for (let i = 0; i < count; i++) {
      if (availableCards.length === 0) break;
      const randomIndex = Math.floor(Math.random() * availableCards.length);
      const card = availableCards.splice(randomIndex, 1)[0];
      // Only mark a card reversed when reversals are enabled
      const isReversed = allowReversals && Math.random() < 0.5;
      newDrawnCards.push({ ...card, isReversed });
    }

    setReadingHasReversals(allowReversals);
    setFlipStates(new Map());
    setCardsVisible(false);
    setIsClearing(false);
    setDrawnCards(newDrawnCards);

    // Use rAF to let the DOM commit the new cards (with opacity 0) before fading in
    fadeInFrameRef.current = window.requestAnimationFrame(() => {
      setCardsVisible(true);
      fadeInFrameRef.current = null;
    });
  };

  /** Fades out all cards, then removes them from state after the CSS transition */
  const clearCards = () => {
    if (drawnCards.length === 0 || isClearing) return;

    if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current);

    setIsClearing(true);
    setCardsVisible(false); // triggers the CSS opacity transition

    // Wait for the opacity transition to finish before tearing down card state
    clearTimerRef.current = window.setTimeout(() => {
      setDrawnCards([]);
      setFlipStates(new Map());
      setIsClearing(false);
      clearTimerRef.current = null;
    }, CARDS_FADE_MS);
  };

  /**
   * Determines the flip axis from where the user clicked, then starts the shrink
   * phase of the flip animation. If the card is already face-up, clicking instead
   * toggles the position-label / card-info panels.
   */
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Axis is Y (scaleX) when the click is closer to a left/right edge,
    // X (scaleY) when it is closer to a top/bottom edge.
    const relX = Math.abs((e.clientX - rect.left) / rect.width - 0.5);
    const relY = Math.abs((e.clientY - rect.top) / rect.height - 0.5);
    const axis: 'X' | 'Y' = relX >= relY ? 'Y' : 'X';

    setFlipStates(prev => {
      const state = prev.get(index) ?? DEFAULT_FLIP;
      if (state.phase !== 'idle') return prev; // ignore clicks during animation
      if (!state.isFront) {
        // Card is face-down → start the flip (shrink phase)
        return new Map(prev).set(index, { ...state, axis, phase: 'shrink' });
      } else {
        // Card is already face-up → toggle the info panel instead
        return new Map(prev).set(index, { ...state, contentVisible: !state.contentVisible });
      }
    });
  };

  /**
   * Advances the two-phase flip state machine when a CSS animation completes:
   *   shrink → grow  (isFront is toggled so the image swap happens while invisible)
   *   grow   → idle
   */
  const handleAnimationEnd = (index: number) => {
    setFlipStates(prev => {
      const state = prev.get(index) ?? DEFAULT_FLIP;
      if (state.phase === 'shrink') {
        return new Map(prev).set(index, {
          isFront: !state.isFront,
          contentVisible: false,
          axis: state.axis,
          phase: 'grow',
        });
      }
      if (state.phase === 'grow') {
        return new Map(prev).set(index, { ...state, phase: 'idle' });
      }
      return prev;
    });
  };

  // ── Layout computations ───────────────────────────────────────────────────

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Grid dimensions for spreads that use a positioned layout
  const layoutCols = selectedSpread.layout ? Math.max(...selectedSpread.layout.map(p => p.col)) : 0;
  const naturalGridW = (layoutCols + 1) * (200 + LAYOUT_GAP) - LAYOUT_GAP;

  // Parse the custom positions textarea: each non-empty line is "Name - Description"
  const customPositionLines = customPositionText.split('\n').filter(l => l.trim().length > 0);
  const displayPositions: SpreadPosition[] | undefined = selectedSpread.count === null
    ? customPositionLines.map(l => {
        const [name, ...rest] = l.trim().split(' - ');
        return { name: name.trim(), description: rest.join(' - ').trim() };
      })
    : selectedSpread.positions;

  // The modal shows the reversed meaning only when the card was reversed AND
  // reversals were active for this reading.
  const modalIsReversed = Boolean(modalCard?.isReversed) && readingHasReversals;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Container maxWidth={false}>
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* ── Spread configuration controls ─────────────────────────────── */}
        <SpreadControls
          selectedSpread={selectedSpread}
          onSpreadChange={setSelectedSpread}
          customCount={customCount}
          onCustomCountChange={setCustomCount}
          customPositionText={customPositionText}
          onCustomPositionTextChange={setCustomPositionText}
          allowReversals={allowReversals}
          onAllowReversalsChange={setAllowReversals}
          drawnCards={drawnCards}
          isClearing={isClearing}
          onDraw={drawCards}
          onClear={clearCards}
        />

        {/* ── Card layout ───────────────────────────────────────────────── */}
        {selectedSpread.layout && !isMobile ? (
          /*
           * Positioned layout mode — for spreads that define a 2-D grid
           * (e.g. Celtic Cross, Four Elements). Cards are placed at specific
           * col/row positions using CSS grid.
           */
          <Box sx={{ width: '100%', mt: 4 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${layoutCols + 1}, 1fr)`,
                gap: `${LAYOUT_GAP}px`,
                width: '100%',
                maxWidth: `${naturalGridW}px`,
                mx: 'auto',
                alignItems: 'start',
              }}
            >
              {drawnCards.map((card, index) => {
                const flipState = getFlip(index);
                const gridPos = selectedSpread.layout![index];
                if (!gridPos) return null;
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
                      // Expand vertical padding when the info panel is open
                      py: flipState.contentVisible ? 2 : 0,
                    }}
                  >
                    <CardItem
                      card={card}
                      index={index}
                      flipState={flipState}
                      position={selectedSpread.positions?.[index]}
                      onCardClick={handleCardClick}
                      onAnimationEnd={handleAnimationEnd}
                      onInfoClick={setModalCard}
                      variant="layout"
                    />
                  </Box>
                );
              })}
            </Box>
          </Box>
        ) : (
          /*
           * MUI Grid fallback mode — used on mobile or for spreads without a
           * custom layout (e.g. Single Card, Past/Present/Future).
           */
          <Grid container spacing={3} justifyContent="center" sx={{ mt: 5 }}>
            {drawnCards.map((card, index) => (
              <Grid
                item xs={12} sm={6} md={4}
                key={index}
                sx={{ opacity: cardsVisible ? 1 : 0, transition: `opacity ${CARDS_FADE_MS}ms ease` }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <CardItem
                    card={card}
                    index={index}
                    flipState={getFlip(index)}
                    position={displayPositions?.[index]}
                    onCardClick={handleCardClick}
                    onAnimationEnd={handleAnimationEnd}
                    onInfoClick={setModalCard}
                    variant="grid"
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* ── Card detail modal ─────────────────────────────────────────────── */}
      {modalCard && (
        <CardModal
          modalCard={modalCard}
          modalIsReversed={modalIsReversed}
          onClose={() => setModalCard(null)}
        />
      )}
    </Container>
  );
}
