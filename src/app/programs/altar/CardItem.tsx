"use client";
import Image from 'next/image';
import { Box, Collapse, Typography, IconButton, Chip } from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { CardFlipState, DrawnCard, SpreadPosition } from './tarot-constants';

/**
 * Inline MUI `sx` keyframes for the two-phase card-flip animation.
 * Attached to the animated inner box so they travel with the component.
 *
 * Phase 1 (shrink): card collapses along the flip axis → becomes invisible.
 * Phase 2 (grow):   card expands back to full size → reveals the new face.
 *
 * Axis is chosen based on where the user clicked relative to the card centre:
 *   closer to a left/right edge → Y-axis flip (scaleX)
 *   closer to a top/bottom edge → X-axis flip (scaleY)
 */
const FLIP_KEYFRAMES = {
  '@keyframes flipShrinkY': { '0%': { transform: 'scaleX(1)', opacity: 1 }, '100%': { transform: 'scaleX(0)', opacity: 0 } },
  '@keyframes flipGrowY':   { '0%': { transform: 'scaleX(0)', opacity: 0 }, '100%': { transform: 'scaleX(1)', opacity: 1 } },
  '@keyframes flipShrinkX': { '0%': { transform: 'scaleY(1)', opacity: 1 }, '100%': { transform: 'scaleY(0)', opacity: 0 } },
  '@keyframes flipGrowX':   { '0%': { transform: 'scaleY(0)', opacity: 0 }, '100%': { transform: 'scaleY(1)', opacity: 1 } },
};

interface CardItemProps {
  card: DrawnCard;
  index: number;
  flipState: CardFlipState;
  /** Position label shown above the card once it has been flipped face-up */
  position?: SpreadPosition;
  onCardClick: (e: React.MouseEvent<HTMLDivElement>, index: number) => void;
  /** Called when a flip animation phase ends; advances the state machine in the parent */
  onAnimationEnd: (index: number) => void;
  /** Called when the ⓘ button is clicked; parent should open the detail modal */
  onInfoClick: (card: DrawnCard) => void;
  /**
   * Rendering mode:
   * - 'layout' — fills its CSS-grid cell; face-up clicks open a modal (no expand/collapse).
   * - 'grid'   — fixed 200 × 350 card with expand/collapse text above and below.
   */
  variant?: 'layout' | 'grid';
}

/**
 * A single tarot card.
 *
 * List view (`variant="grid"`) stacks three sections:
 * 1. A collapsible **position label** above the card (e.g. "Past", "Outcome")
 * 2. A click-to-flip **card image** with a two-phase shrink/grow CSS animation
 * 3. A collapsible **info section** below (card name, keywords, detail icon)
 *
 * Grid view (`variant="layout"`) shows only the card image and a compact
 * position name; face-up clicks are handled by the parent to open a modal.
 *
 * The flip state machine lives in the parent. This component fires
 * `onCardClick` and `onAnimationEnd` so the parent can update `flipStates`.
 */
export default function CardItem({
  card,
  index,
  flipState,
  position,
  onCardClick,
  onAnimationEnd,
  onInfoClick,
  variant = 'grid',
}: CardItemProps) {
  const { isFront, contentVisible, axis, phase } = flipState;

  // Build the CSS animation name from the current phase and flip axis
  const animName = `flip${phase === 'shrink' ? 'Shrink' : 'Grow'}${axis}`;

  const isLayout = variant === 'layout';

  return (
    <>
      {/* ── Position label (list view only) ──────────────────────────────── */}
      {!isLayout && (
        <Collapse in={contentVisible} timeout={300} sx={{ width: 300, maxWidth: '100%' }}>
          <Box
            sx={{
              mb: 1,
              textAlign: 'center',
              opacity: contentVisible ? 1 : 0,
              transition: 'opacity 0.3s',
              minHeight: 40,
            }}
          >
            {position && (
              <>
                <Typography variant="subtitle2" fontWeight="bold">{position.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {position.description}
                </Typography>
              </>
            )}
          </Box>
        </Collapse>
      )}

      {/* ── Card image ─────────────────────────────────────────────────────── */}
      {/* Outer box: sets dimensions and is the click target */}
      <Box
        sx={{
          position: 'relative',
          cursor: 'pointer',
          ...(isLayout
            ? { width: '100%', aspectRatio: '200/350' }
            : { width: 200, height: 350 }),
        }}
        onClick={(e) => onCardClick(e, index)}
      >
        {/*
         * Inner animated box — shrinks to zero width/height and grows back during
         * the flip. The image swap (back → front) happens between the two phases,
         * while this element is invisible at its thinnest/shortest point.
         */}
        <Box
          onAnimationEnd={(e) => {
            // Only handle events that originate from this element, not from
            // child elements (the Next.js Image component may also fire events).
            if (e.target === e.currentTarget) onAnimationEnd(index);
          }}
          sx={{
            position: 'absolute',
            top: 0, right: 0, bottom: 0, left: 0,
            animation: phase !== 'idle' ? `${animName} 0.15s ease forwards` : 'none',
            ...FLIP_KEYFRAMES,
          }}
        >
          <Image
            src={isFront ? `/tarot-images/${card.img}` : '/tarot-images/back.jpg'}
            alt={isFront ? card.name : 'Card back'}
            fill
            style={{
              objectFit: 'contain',
              filter: 'sepia(0.5)',
              // Rotate reversed cards 180° — only when the face is showing
              ...(isFront && card.isReversed ? { transform: 'rotate(180deg)' } : {}),
            }}
          />
        </Box>
      </Box>

      {/* ── Position name (grid view) ─────────────────────────────────────── */}
      {isLayout && position && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.75 }}>
          {position.name}
        </Typography>
      )}

      {/* ── Card info (list view only) ─────────────────────────────────────── */}
      {!isLayout && (
        <Collapse in={contentVisible} timeout={300} sx={{ width: 300, maxWidth: '100%' }}>
          <Box
            sx={{
              mt: 2,
              textAlign: 'center',
              opacity: contentVisible ? 1 : 0,
              transition: 'opacity 0.3s',
              maxWidth: 300,
            }}
          >
            <Typography
              variant="h5"
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}
            >
              {card.name}
              {card.isReversed ? <AutorenewIcon fontSize="inherit" /> : null}
            </Typography>
            <Box sx={{ display: 'block', mt: 1, textWrap: 'balance' }}>
              {(card.isReversed ? card.keywords_reversed ?? ['N/A'] : card.keywords_upright).map((kw, i) => (
                <Chip key={i} label={kw.toLowerCase()} size="small" sx={{ bgcolor: 'transparent' }} />
              ))}
            </Box>
            <Box sx={{ mt: 0.5, display: 'flex', justifyContent: 'center' }}>
              <IconButton size="small" onClick={() => onInfoClick(card)} aria-label="Card details">
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Collapse>
      )}
    </>
  );
}
