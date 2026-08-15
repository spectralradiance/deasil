'use client';
import { useState } from 'react';
import {
  Box, Chip, Collapse, Grid, IconButton, Menu, MenuItem, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import MenuIcon from '@mui/icons-material/Menu';
import CardItem from './CardItem';
import { DEFAULT_FLIP, LAYOUT_GAP, type CardFlipState, type DrawnCard, type SpreadOption, type SpreadPosition } from './tarot-constants';

// ── Shared types ──────────────────────────────────────────────────────────────

export interface DivinationToken {
  id: string;
  symbol: string;
  name: string;
  secondary?: string;
  keywords: string[];
  upright: string;
  reversed?: string;
}

export interface DrawSpread {
  name: string;
  count: number;
  positions?: string[];
}

export interface TokenState {
  revealed: boolean;
  infoOpen: boolean;
}

export interface DrawnToken extends DivinationToken {
  isReversed: boolean;
}

export interface TokenReadingRecord {
  kind: 'tokens';
  id: number;
  label: string;
  tokens: DrawnToken[];
  spread: DrawSpread;
  states: Map<number, TokenState>;
}

export interface TarotReadingRecord {
  kind: 'tarot';
  id: number;
  cards: DrawnCard[];
  spread: SpreadOption;
  positions: SpreadPosition[] | undefined;
  hasReversals: boolean;
}

export type AnyReading = TarotReadingRecord | TokenReadingRecord;

// ── Token card ────────────────────────────────────────────────────────────────

function TokenCard({ token, state, position, onReveal, onToggleInfo }: {
  token: DrawnToken;
  state: TokenState;
  position?: string;
  onReveal: () => void;
  onToggleInfo: () => void;
}) {
  const canReverse = !!token.reversed;
  const showReversed = token.isReversed && canReverse;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <Collapse in={state.revealed && state.infoOpen && !!position} timeout={300}>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
          {position}
        </Typography>
      </Collapse>
      <Box
        onClick={state.revealed ? onToggleInfo : onReveal}
        sx={{
          width: 120, height: 160,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          border: '1px solid', borderColor: state.revealed ? 'primary.main' : 'divider',
          borderRadius: 2, cursor: 'pointer',
          bgcolor: state.revealed ? 'background.paper' : 'action.hover',
          transition: 'border-color 0.3s, background-color 0.3s',
          gap: 0.5, px: 1,
          '&:hover': { borderColor: 'primary.light' },
        }}
      >
        <Typography sx={{ fontSize: '3.5rem', lineHeight: 1, userSelect: 'none', transform: showReversed ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s', filter: state.revealed ? 'none' : 'blur(6px)' }}>
          {token.symbol}
        </Typography>
        <Typography variant="caption" sx={{ opacity: state.revealed ? 1 : 0, transition: 'opacity 0.3s', textAlign: 'center' }}>
          {token.name}{showReversed && ' ↓'}
        </Typography>
        {!state.revealed && <Typography variant="caption" color="text.secondary">tap to reveal</Typography>}
      </Box>
      <Collapse in={state.revealed && state.infoOpen} timeout={300}>
        <Box sx={{ maxWidth: 200, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center', mb: 0.75 }}>
            {token.keywords.map(kw => <Chip key={kw} label={kw} size="small" sx={{ fontSize: '0.6rem' }} />)}
          </Box>
          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary', fontStyle: 'italic' }}>
            {showReversed ? token.reversed : token.upright}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}

// ── Tarot card display (manages its own flip state) ───────────────────────────

function TarotContent({ record, onOpenModal }: {
  record: TarotReadingRecord;
  onOpenModal: (card: DrawnCard, isReversed: boolean) => void;
}) {
  const [flipStates, setFlipStates] = useState<Map<number, CardFlipState>>(new Map());
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const getFlip = (i: number) => flipStates.get(i) ?? DEFAULT_FLIP;

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.abs((e.clientX - rect.left) / rect.width - 0.5);
    const relY = Math.abs((e.clientY - rect.top) / rect.height - 0.5);
    const axis: 'X' | 'Y' = relX >= relY ? 'Y' : 'X';
    setFlipStates(prev => {
      const s = prev.get(index) ?? DEFAULT_FLIP;
      if (s.phase !== 'idle') return prev;
      if (!s.isFront) return new Map(prev).set(index, { ...s, axis, phase: 'shrink' });
      return new Map(prev).set(index, { ...s, contentVisible: !s.contentVisible });
    });
  };

  const handleAnimationEnd = (index: number) => {
    setFlipStates(prev => {
      const s = prev.get(index) ?? DEFAULT_FLIP;
      if (s.phase === 'shrink') return new Map(prev).set(index, { isFront: !s.isFront, contentVisible: false, axis: s.axis, phase: 'grow' });
      if (s.phase === 'grow') return new Map(prev).set(index, { ...s, phase: 'idle' });
      return prev;
    });
  };

  const layoutCols = record.spread.layout ? Math.max(...record.spread.layout.map(p => p.col)) : 0;
  const naturalGridW = (layoutCols + 1) * (200 + LAYOUT_GAP) - LAYOUT_GAP;

  if (record.spread.layout && !isMobile) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${layoutCols + 1}, 1fr)`, gap: `${LAYOUT_GAP}px`, width: '100%', maxWidth: `${naturalGridW}px`, mx: 'auto', alignItems: 'start' }}>
          {record.cards.map((card, i) => {
            const gridPos = record.spread.layout![i];
            if (!gridPos) return null;
            const flip = getFlip(i);
            return (
              <Box key={i} sx={{ gridColumn: gridPos.col + 1, gridRow: gridPos.row + 1, display: 'flex', flexDirection: 'column', py: flip.contentVisible ? 2 : 0, transition: 'padding 0.3s' }}>
                <CardItem card={card} index={i} flipState={flip} position={record.positions?.[i]}
                  onCardClick={handleCardClick} onAnimationEnd={handleAnimationEnd}
                  onInfoClick={c => onOpenModal(c, c.isReversed && record.hasReversals)} variant="layout" />
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }
  return (
    <Grid container spacing={3} justifyContent="center" sx={{ mt: 2 }}>
      {record.cards.map((card, i) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CardItem card={card} index={i} flipState={getFlip(i)} position={record.positions?.[i]}
              onCardClick={handleCardClick} onAnimationEnd={handleAnimationEnd}
              onInfoClick={c => onOpenModal(c, c.isReversed && record.hasReversals)} variant="grid" />
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}

// ── Generic reading entry ─────────────────────────────────────────────────────

export function ReadingEntry({
  reading, isFirst, isLast, onMoveUp, onMoveDown, onRemove,
  onReveal, onToggleInfo, onRevealAll, onOpenModal,
}: {
  reading: AnyReading;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onReveal: (i: number) => void;
  onToggleInfo: (i: number) => void;
  onRevealAll: () => void;
  onOpenModal: (card: DrawnCard, isReversed: boolean) => void;
}) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const label = reading.kind === 'tokens' ? reading.label : 'Tarot';

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'fadeIn 0.3s ease', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {label} · {reading.spread.name}
        </Typography>
        {reading.kind === 'tokens' && (
          <IconButton onClick={onRevealAll} title="Reveal all" size="small">
            <AutorenewIcon fontSize="small" />
          </IconButton>
        )}
        <IconButton size="small" onClick={e => setMenuAnchor(e.currentTarget)}>
          <MenuIcon fontSize="small" />
        </IconButton>
      </Box>

      {reading.kind === 'tokens' ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
          {reading.tokens.map((token, i) => (
            <TokenCard key={i} token={token}
              state={reading.states.get(i) ?? { revealed: false, infoOpen: false }}
              position={reading.spread.positions?.[i]}
              onReveal={() => onReveal(i)}
              onToggleInfo={() => onToggleInfo(i)}
            />
          ))}
        </Box>
      ) : (
        <TarotContent record={reading} onOpenModal={onOpenModal} />
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { onMoveUp(); setMenuAnchor(null); }} disabled={isFirst}>Move Up</MenuItem>
        <MenuItem onClick={() => { onMoveDown(); setMenuAnchor(null); }} disabled={isLast}>Move Down</MenuItem>
        <MenuItem onClick={() => { onRemove(); setMenuAnchor(null); }}>Remove</MenuItem>
      </Menu>
    </Box>
  );
}
