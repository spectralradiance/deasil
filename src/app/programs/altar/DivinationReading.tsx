'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Chip, Collapse, Container, FormControl, FormControlLabel,
  IconButton, InputLabel, MenuItem, Select, Switch, Typography,
} from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import SymbolBrowser, { type SymbolGroup } from './SymbolBrowser';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DivinationToken {
  id: string;       // unique key
  symbol: string;   // Unicode glyph
  name: string;
  secondary?: string; // tree name, phoneme, etc.
  keywords: string[];
  upright: string;
  reversed?: string;  // omit = token is not reversible
}

export interface DrawSpread {
  name: string;
  count: number;
  positions?: string[]; // label for each position
}

interface DrawnToken extends DivinationToken {
  isReversed: boolean;
}

interface TokenState {
  revealed: boolean;
  infoOpen: boolean;
}

const FADE_MS = 280;

// ── Token card ────────────────────────────────────────────────────────────────

function TokenCard({
  token, state, position, onReveal, onToggleInfo,
}: {
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
      {/* Position label */}
      <Collapse in={state.revealed && !!position} timeout={300}>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
          {position}
        </Typography>
      </Collapse>

      {/* Symbol tile */}
      <Box
        onClick={state.revealed ? onToggleInfo : onReveal}
        sx={{
          width: 120, height: 160,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          border: '1px solid',
          borderColor: state.revealed ? 'primary.main' : 'divider',
          borderRadius: 2,
          cursor: 'pointer',
          bgcolor: state.revealed ? 'background.paper' : 'action.hover',
          transition: 'border-color 0.3s, background-color 0.3s',
          gap: 0.5,
          px: 1,
          '&:hover': { borderColor: 'primary.light' },
        }}
      >
        <Typography
          sx={{
            fontSize: '3.5rem', lineHeight: 1, userSelect: 'none',
            transform: showReversed ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.4s',
            filter: state.revealed ? 'none' : 'blur(6px)',
          }}
        >
          {state.revealed ? token.symbol : token.symbol}
        </Typography>
        <Typography variant="caption" sx={{ opacity: state.revealed ? 1 : 0, transition: 'opacity 0.3s', textAlign: 'center' }}>
          {token.name}
          {showReversed && ' ↓'}
        </Typography>
        {!state.revealed && (
          <Typography variant="caption" color="text.secondary">tap to reveal</Typography>
        )}
      </Box>

      {/* Meaning panel */}
      <Collapse in={state.revealed && state.infoOpen} timeout={300}>
        <Box sx={{ maxWidth: 200, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center', mb: 0.75 }}>
            {token.keywords.map(kw => (
              <Chip key={kw} label={kw} size="small" sx={{ fontSize: '0.6rem' }} />
            ))}
          </Box>
          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary', fontStyle: 'italic' }}>
            {showReversed ? token.reversed : token.upright}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  label: string;
  tokens: DivinationToken[];
  spreads: DrawSpread[];
  canReverse?: boolean;
  systemSelector?: React.ReactNode;
  browseGroups?: SymbolGroup[];
}

export default function DivinationReading({ label, tokens, spreads, canReverse = false, systemSelector, browseGroups }: Props) {
  const [browseOpen, setBrowseOpen] = useState(false);
  const [selectedSpread, setSelectedSpread] = useState(spreads[0]);
  const [allowReversals, setAllowReversals]  = useState(canReverse);
  const [drawn, setDrawn]                    = useState<DrawnToken[]>([]);
  const [tokenStates, setTokenStates]        = useState<Map<number, TokenState>>(new Map());
  const [visible, setVisible]                = useState(false);
  const [isClearing, setIsClearing]          = useState(false);

  const clearTimer = useRef<number | null>(null);
  const rAF        = useRef<number | null>(null);

  useEffect(() => () => {
    if (clearTimer.current) window.clearTimeout(clearTimer.current);
    if (rAF.current) window.cancelAnimationFrame(rAF.current);
  }, []);

  const getState = (i: number): TokenState =>
    tokenStates.get(i) ?? { revealed: false, infoOpen: false };

  const draw = () => {
    if (isClearing) return;
    const pool = [...tokens];
    const result: DrawnToken[] = [];
    for (let i = 0; i < selectedSpread.count; i++) {
      if (!pool.length) break;
      const idx = Math.floor(Math.random() * pool.length);
      const t = pool.splice(idx, 1)[0];
      result.push({ ...t, isReversed: canReverse && allowReversals && Math.random() < 0.5 });
    }
    setTokenStates(new Map());
    setVisible(false);
    setIsClearing(false);
    setDrawn(result);
    rAF.current = window.requestAnimationFrame(() => { setVisible(true); rAF.current = null; });
  };

  const clear = () => {
    if (!drawn.length || isClearing) return;
    if (clearTimer.current) window.clearTimeout(clearTimer.current);
    setIsClearing(true);
    setVisible(false);
    clearTimer.current = window.setTimeout(() => {
      setDrawn([]); setTokenStates(new Map()); setIsClearing(false); clearTimer.current = null;
    }, FADE_MS);
  };

  const revealAll = () => {
    const next = new Map<number, TokenState>();
    drawn.forEach((_, i) => next.set(i, { revealed: true, infoOpen: true }));
    setTokenStates(next);
  };

  const reveal = useCallback((i: number) => {
    setTokenStates(prev => new Map(prev).set(i, { revealed: true, infoOpen: false }));
  }, []);

  const toggleInfo = useCallback((i: number) => {
    setTokenStates(prev => {
      const s = prev.get(i) ?? { revealed: false, infoOpen: false };
      return new Map(prev).set(i, { ...s, infoOpen: !s.infoOpen });
    });
  }, []);

  return (
    <Container maxWidth={false}>
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* ── Controls ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', justifyContent: 'center', mb: 3 }}>
          <Typography variant="h4">{label}</Typography>
          {systemSelector}

          <FormControl sx={{ minWidth: 180 }} disabled={drawn.length > 0 || isClearing}>
            <InputLabel>Spread</InputLabel>
            <Select
              value={selectedSpread.name}
              label="Spread"
              onChange={e => setSelectedSpread(spreads.find(s => s.name === e.target.value)!)}
            >
              {spreads.map(s => <MenuItem key={s.name} value={s.name}>{s.name} ({s.count})</MenuItem>)}
            </Select>
          </FormControl>

          {canReverse && (
            <FormControlLabel
              control={<Switch checked={allowReversals} onChange={e => setAllowReversals(e.target.checked)} disabled={drawn.length > 0 || isClearing} />}
              label="Reversals"
            />
          )}

          {drawn.length > 0
            ? <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton onClick={revealAll} title="Reveal all" size="small"><AutorenewIcon /></IconButton>
                <Box component="button" onClick={clear} disabled={isClearing}
                  sx={{ px: 2, py: 0.75, borderRadius: 1, border: '1px solid', borderColor: 'primary.main', bgcolor: 'transparent', color: 'primary.main', cursor: 'pointer', '&:hover': { color: 'primary.light', borderColor: 'primary.light' } }}>
                  Clear
                </Box>
              </Box>
            : <Box component="button" onClick={() => { setBrowseOpen(false); draw(); }} disabled={isClearing}
                sx={{ px: 2, py: 0.75, borderRadius: 1, border: '1px solid', borderColor: 'primary.main', bgcolor: 'transparent', color: 'primary.main', cursor: 'pointer', '&:hover': { color: 'primary.light', borderColor: 'primary.light' } }}>
                Draw
              </Box>
          }
          {browseGroups && (
            <Box component="button" onClick={() => setBrowseOpen(b => !b)}
              sx={{ px: 2, py: 0.75, borderRadius: 1, border: 'none', bgcolor: 'transparent',
                    color: browseOpen ? 'primary.main' : 'inherit', cursor: 'pointer',
                    '&:hover': { color: 'primary.light' } }}>
              Browse
            </Box>
          )}
        </Box>

        {/* ── Token grid or browser ── */}
        {browseOpen && browseGroups
          ? <SymbolBrowser groups={browseGroups} />
          : <Box sx={{
              display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center',
              opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease`,
            }}>
          {drawn.map((token, i) => (
            <TokenCard
              key={i}
              token={token}
              state={getState(i)}
              position={selectedSpread.positions?.[i]}
              onReveal={() => reveal(i)}
              onToggleInfo={() => toggleInfo(i)}
            />
          ))}
        </Box>
        }
      </Box>
    </Container>
  );
}
