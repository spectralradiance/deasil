"use client";
import { useState } from 'react';
import Image from 'next/image';
import {
  Box, Typography, IconButton, Dialog, DialogContent,
  Divider, Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import WorkIcon from '@mui/icons-material/Work';
import MoodIcon from '@mui/icons-material/Mood';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CalculateIcon from '@mui/icons-material/Calculate';
import FlareIcon from '@mui/icons-material/Flare';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import ThumbsUpDownIcon from '@mui/icons-material/ThumbsUpDown';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AirIcon from '@mui/icons-material/Air';
import LandscapeIcon from '@mui/icons-material/Landscape';
import CampaignIcon from '@mui/icons-material/Campaign';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { PLANET_SYMBOLS, ZODIAC_SYMBOLS, YES_NO_STYLES, type DrawnCard } from './tarot-constants';

// ── Local icon map ────────────────────────────────────────────────────────────
// JSX elements cannot live in a plain .ts file, so this lives here rather than
// in tarot-constants.ts. Only used inside this modal.

/** MUI icon element for each classical element, used in the attribute chip row */
const ELEMENT_ICONS: Record<string, React.ReactElement> = {
  Fire:  <WhatshotIcon  sx={{ fontSize: '0.875rem' }} />,
  Water: <WaterDropIcon sx={{ fontSize: '0.875rem' }} />,
  Air:   <AirIcon       sx={{ fontSize: '0.875rem' }} />,
  Earth: <LandscapeIcon sx={{ fontSize: '0.875rem' }} />,
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface CardModalProps {
  /** The card whose details are being displayed */
  modalCard: DrawnCard;
  /**
   * True when the card was drawn reversed AND reversals were active for this
   * reading. Switches the meaning text and keyword set to their reversed form.
   */
  modalIsReversed: boolean;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Full-detail dialog for a single drawn tarot card.
 *
 * Layout: two-column — card image on the left (fills the full dialog height),
 * scrollable detail content on the right.
 *
 * Right-panel sections (in order):
 * 1. Card name + close button
 * 2. Attribute chips — element, planet, zodiac
 * 3. Upright or reversed meaning text (determined by `modalIsReversed`)
 * 4. Affirmation (upright only)
 * 5. Keyword chips (reversed set shown when appropriate)
 * 6. Light / Shadow meaning lists
 * 7. Context chips — each chip expands an inline panel when clicked:
 *    Yes/No · Love · Career · Mood · Spiritual · Fortune Telling ·
 *    Numerology · Astrology · Questions
 * 8. Waite descriptive content (divinatory, reversed, description)
 *
 * `openContext` is managed as local state so it resets automatically each time
 * a new card's modal is opened (the component unmounts then remounts).
 */
export default function CardModal({ modalCard, modalIsReversed, onClose }: CardModalProps) {
  // Which context chips are currently expanded (keyed by field name)
  const [openContexts, setOpenContexts] = useState<Set<string>>(new Set());
  // Current index within array-valued context fields (fortune telling, questions to ask)
  const [fortuneIndex, setFortuneIndex] = useState(0);
  const [questionsIndex, setQuestionsIndex] = useState(0);
  // Display order; opening a chip promotes it to index 0
  const [chipOrder, setChipOrder] = useState([
    'yes_no', 'love', 'career', 'mood', 'spiritual',
    'affirmation', 'numerology', 'astrology', 'fortune_telling', 'questions',
  ]);

  /** Expand or collapse a chip; expanding also moves it to the top of the list */
  const toggleContext = (key: string) => {
    setOpenContexts(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        setChipOrder(order => [key, ...order.filter(k => k !== key)]);
      }
      return next;
    });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { height: '90vh', maxHeight: '90vh', display: 'flex', flexDirection: 'column' } }}
    >
      <DialogContent sx={{ padding: '0 !important', display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── Left: full-height card image ────────────────────────────────── */}
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

        {/* ── Right: scrollable card detail ───────────────────────────────── */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>

          {/* Title + close button */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h5" component="h2">{modalCard.name}</Typography>
            </Box>
            <IconButton onClick={onClose} size="small" aria-label="Close" sx={{ flexShrink: 0, ml: 1 }}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* ── Attribute chips ───────────────────────────────────────────── */}
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
                sx={{ bgcolor: 'transparent' }}
              />
            )}
            {/* A card may have multiple comma-separated zodiac signs */}
            {modalCard.zodiac && modalCard.zodiac.split(',').map(z => z.trim()).filter(Boolean).map(z => (
              <Chip
                key={z}
                label={`${ZODIAC_SYMBOLS[z] ?? ''} ${z}`}
                size="small"
                sx={{ bgcolor: 'transparent' }}
              />
            ))}
          </Box>

          {/* Upright or reversed meaning text */}
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
            Upright Meaning: {modalCard.meaning_upright}<br/><br/>
            Reversed Meaning: {modalCard.meaning_reversed}<br/><br/>
            Keywords Reversed: {modalCard.keywords_reversed?.join(', ') ?? 'N/A'}<br/><br/>
            Keywords Upright: {modalCard.keywords?.join(', ') ?? 'N/A'}
          </Typography>

          {/* ── Keywords ─────────────────────────────────────────────────── */}
          {/* Switches to the reversed keyword set when the card is reversed */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
            {(modalIsReversed
              ? (modalCard.keywords_reversed ?? modalCard.keywords)
              : modalCard.keywords
            ).map((kw, i) => (
              <Chip key={i} label={kw} size="small" sx={{ bgcolor: 'transparent' }} />
            ))}
          </Box>

          <Divider sx={{ my: 1.5 }} />

          {/* ── Waite descriptive content ────────────────────────────────── */}
          {(modalCard.waite_divinatory || modalCard.waite_reversed || modalCard.waite_description) && (
            <>

                {modalCard.waite_description && (
                <Box sx={{ mb: 1.5 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.65 }}>
                    {modalCard.waite_description}
                    </Typography>
                </Box>
                )}

              {modalCard.waite_divinatory && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Divinatory
                  </Typography>
                  <Typography variant="body2">
                    {modalCard.waite_divinatory}
                  </Typography>
                </Box>
              )}

              {modalCard.waite_reversed && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Reversed
                  </Typography>
                  <Typography variant="body2">
                    {modalCard.waite_reversed}
                  </Typography>
                </Box>
              )}

            </>
          )}

          {/* ── Context chips ────────────────────────────────────────────── */}
          {/* Each chip shows its value inline against a coloured background.   */}
          {/* Chips with multiple values (Fortune Telling, Questions) show one  */}
          {/* entry at a time; the › arrow cycles to the next.                  */}
          {(modalCard.yes_no || modalCard.love || modalCard.career || modalCard.mood || modalCard.spiritual ||
            modalCard.Affirmation || modalCard.Numerology || modalCard.Astrology ||
            (modalCard.fortune_telling && modalCard.fortune_telling.length > 0) ||
            (modalCard['Questions to Ask'] && modalCard['Questions to Ask'].length > 0)) && (
            <>
              <Divider sx={{ my: 1.5 }} />
              {/* Chips wrap inline; expanded chips show their value and a full-height cycle zone */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {chipOrder.flatMap((key): React.ReactElement[] => {
                    // Resolve chip params for this key; return [] to skip chips the card lacks
                    let color = '';
                    let icon: React.ReactElement = <></>;
                    let label = '';
                    let value: React.ReactNode = null;
                    let cycleNext: (() => void) | undefined;

                    if (key === 'yes_no' && modalCard.yes_no && YES_NO_STYLES[modalCard.yes_no]) {
                      color = YES_NO_STYLES[modalCard.yes_no].color;
                      icon  = <ThumbsUpDownIcon sx={{ fontSize: '1rem', mt: '1px', flexShrink: 0 }} />;
                      label = 'Yes / No';
                      value = YES_NO_STYLES[modalCard.yes_no].label;
                    } else if (key === 'love' && modalCard.love) {
                      color = 'error.main'; icon = <FavoriteIcon sx={{ fontSize: '1rem', mt: '1px', flexShrink: 0 }} />; label = 'Love'; value = modalCard.love;
                    } else if (key === 'career' && modalCard.career) {
                      color = 'primary.main'; icon = <WorkIcon sx={{ fontSize: '1rem', mt: '1px', flexShrink: 0 }} />; label = 'Career'; value = modalCard.career;
                    } else if (key === 'mood' && modalCard.mood) {
                      color = 'warning.main'; icon = <MoodIcon sx={{ fontSize: '1rem', mt: '1px', flexShrink: 0 }} />; label = 'Mood'; value = modalCard.mood;
                    } else if (key === 'spiritual' && modalCard.spiritual) {
                      color = 'secondary.main'; icon = <AutoAwesomeIcon sx={{ fontSize: '1rem', mt: '1px', flexShrink: 0 }} />; label = 'Spiritual'; value = modalCard.spiritual;
                    } else if (key === 'affirmation' && modalCard.Affirmation) {
                      color = 'success.main'; icon = <CampaignIcon sx={{ fontSize: '1rem', mt: '1px', flexShrink: 0 }} />; label = 'Affirmation'; value = modalCard.Affirmation;
                    } else if (key === 'numerology' && modalCard.Numerology) {
                      color = 'success.dark'; icon = <CalculateIcon sx={{ fontSize: '1rem', mt: '1px', flexShrink: 0 }} />; label = 'Numerology'; value = modalCard.Numerology;
                    } else if (key === 'astrology' && modalCard.Astrology) {
                      color = 'warning.dark'; icon = <FlareIcon sx={{ fontSize: '1rem', mt: '1px', flexShrink: 0 }} />; label = 'Astrology'; value = modalCard.Astrology;
                    } else if (key === 'fortune_telling' && modalCard.fortune_telling?.length) {
                      color = 'secondary.dark';
                      icon  = <AutoFixHighIcon sx={{ fontSize: '1rem', mt: '1px', flexShrink: 0 }} />;
                      label = 'Fortune';
                      value = modalCard.fortune_telling[fortuneIndex % modalCard.fortune_telling.length];
                      if (modalCard.fortune_telling.length > 1)
                        cycleNext = () => setFortuneIndex(i => (i + 1) % modalCard.fortune_telling!.length);
                    } else if (key === 'questions' && modalCard['Questions to Ask']?.length) {
                      color = 'grey.600';
                      icon  = <QuestionMarkIcon sx={{ fontSize: '1rem', mt: '1px', flexShrink: 0 }} />;
                      label = 'Question';
                      value = modalCard['Questions to Ask'][questionsIndex % modalCard['Questions to Ask'].length];
                      if (modalCard['Questions to Ask'].length > 1)
                        cycleNext = () => setQuestionsIndex(i => (i + 1) % modalCard['Questions to Ask']!.length);
                    } else {
                      return []; // card doesn’t have data for this chip
                    }

                    const isOpen = openContexts.has(key);
                    return [(
                      <Box
                        key={key}
                        sx={{
                          display: 'flex',
                          alignItems: 'stretch',
                          borderRadius: '12px',
                          // Fade between transparent (collapsed) and solid colour (expanded)
                          bgcolor: isOpen ? color : 'transparent',
                          color: 'common.white',
                          transition: 'background-color 0.25s ease',
                          userSelect: 'none',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Main area: clicking here toggles open/closed; icon always centred */}
                        <Box
                          onClick={() => toggleContext(key)}
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, px: 1.5, py: 0.75, cursor: 'pointer' }}
                        >
                          {icon}
                          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                            <Box component="span" sx={{ fontWeight: 600 }}>{label}</Box>
                            {isOpen && <>: {value}</>}
                          </Typography>
                        </Box>
                        {/* Cycle area: full-height right zone, only present when open with multiple values */}
                        {isOpen && cycleNext && (
                          <Box
                            onClick={(e) => { e.stopPropagation(); cycleNext!(); }}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              px: 1,
                              cursor: 'pointer',
                              bgcolor: 'rgba(0,0,0,0.15)',
                              '&:hover': { bgcolor: 'rgba(0,0,0,0.25)' },
                            }}
                          >
                            <NavigateNextIcon sx={{ fontSize: '1.1rem' }} />
                          </Box>
                        )}
                      </Box>
                    )];
                  })}
                </Box>
            </>
          )}

          <Divider sx={{ my: 1.5 }} />

          {/* ── Light / Shadow meaning lists ─────────────────────────────── */}
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

        </Box>
      </DialogContent>
    </Dialog>
  );
}
