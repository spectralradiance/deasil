"use client";
import { useState } from 'react';
import Image from 'next/image';
import {
  Box, Typography, IconButton, Dialog, DialogContent,
  Divider, Chip, Collapse,
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
import TransitionGroup from 'react-transition-group/TransitionGroup';
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
  // Selected chip keys in the order they were clicked (oldest first = top of list)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  // Display indices for array-valued fields; randomised to a fresh entry on each open
  const [fortuneIndex, setFortuneIndex] = useState(0);
  const [questionsIndex, setQuestionsIndex] = useState(0);

  /**
   * Select a chip: move it to the opened section and randomise its start index
   * if it cycles through multiple values. Deselect: collapse it back to the pool.
   */
  const toggleContext = (key: string) => {
    setSelectedKeys(prev => {
      if (prev.includes(key)) {
        // Deselect: remove from the opened list
        return prev.filter(k => k !== key);
      }
      // Select: randomise the starting position for cycled fields
      if (key === 'fortune_telling' && modalCard.fortune_telling?.length) {
        setFortuneIndex(Math.floor(Math.random() * modalCard.fortune_telling.length));
      }
      if (key === 'questions' && modalCard['Questions to Ask']?.length) {
        setQuestionsIndex(Math.floor(Math.random() * modalCard['Questions to Ask'].length));
      }
      // Append so the first-clicked chip stays at the top of the selected section
      return [...prev, key];
    });
  };

  /** Resolve display data for a chip key; returns null when the card lacks that field */
  const resolveChip = (key: string): {
    color: string; icon: React.ReactElement; label: string;
    value: React.ReactNode; cycleNext?: () => void;
  } | null => {
    if (key === 'yes_no' && modalCard.yes_no && YES_NO_STYLES[modalCard.yes_no]) {
      return { color: YES_NO_STYLES[modalCard.yes_no].color, icon: <ThumbsUpDownIcon sx={{ fontSize: '1rem', flexShrink: 0 }} />, label: 'Yes / No', value: YES_NO_STYLES[modalCard.yes_no].label };
    }
    if (key === 'love' && modalCard.love) return { color: 'error.main', icon: <FavoriteIcon sx={{ fontSize: '1rem', flexShrink: 0 }} />, label: 'Love', value: modalCard.love };
    if (key === 'career' && modalCard.career) return { color: 'primary.main', icon: <WorkIcon sx={{ fontSize: '1rem', flexShrink: 0 }} />, label: 'Career', value: modalCard.career };
    if (key === 'mood' && modalCard.mood) return { color: 'warning.main', icon: <MoodIcon sx={{ fontSize: '1rem', flexShrink: 0 }} />, label: 'Mood', value: modalCard.mood };
    if (key === 'spiritual' && modalCard.spiritual) return { color: 'secondary.main', icon: <AutoAwesomeIcon sx={{ fontSize: '1rem', flexShrink: 0 }} />, label: 'Spiritual', value: modalCard.spiritual };
    if (key === 'affirmation' && modalCard.Affirmation) return { color: 'success.main', icon: <CampaignIcon sx={{ fontSize: '1rem', flexShrink: 0 }} />, label: 'Affirmation', value: modalCard.Affirmation };
    if (key === 'numerology' && modalCard.Numerology) return { color: 'success.dark', icon: <CalculateIcon sx={{ fontSize: '1rem', flexShrink: 0 }} />, label: 'Numerology', value: modalCard.Numerology };
    if (key === 'astrology' && modalCard.Astrology) return { color: 'warning.dark', icon: <FlareIcon sx={{ fontSize: '1rem', flexShrink: 0 }} />, label: 'Astrology', value: modalCard.Astrology };
    if (key === 'fortune_telling' && modalCard.fortune_telling?.length) {
      return {
        color: 'secondary.dark', icon: <AutoFixHighIcon sx={{ fontSize: '1rem', flexShrink: 0 }} />,
        label: 'Fortune',
        value: modalCard.fortune_telling[fortuneIndex % modalCard.fortune_telling.length],
        cycleNext: modalCard.fortune_telling.length > 1
          ? () => setFortuneIndex(i => (i + 1) % modalCard.fortune_telling!.length)
          : undefined,
      };
    }
    if (key === 'questions' && modalCard['Questions to Ask']?.length) {
      return {
        color: 'grey.600', icon: <QuestionMarkIcon sx={{ fontSize: '1rem', flexShrink: 0 }} />,
        label: 'Questions',
        value: modalCard['Questions to Ask'][questionsIndex % modalCard['Questions to Ask'].length],
        cycleNext: modalCard['Questions to Ask'].length > 1
          ? () => setQuestionsIndex(i => (i + 1) % modalCard['Questions to Ask']!.length)
          : undefined,
      };
    }
    return null;
  };

  // Chips the user has opened, in click order (first clicked = index 0 = top)
  const openChipKeys = selectedKeys.filter(k => Boolean(resolveChip(k)));
  // Remaining chips in alphabetical label order
  const ALL_ALPHA = ['affirmation', 'astrology', 'career', 'fortune_telling', 'love', 'mood', 'numerology', 'questions', 'spiritual', 'yes_no'];
  const closedChipKeys = ALL_ALPHA.filter(k => !selectedKeys.includes(k) && Boolean(resolveChip(k)));

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
          {/* Section 1: chips the user has opened (click order, oldest at top). */}
          {/* Section 2: remaining chips in alphabetical order (inline wrap).    */}
          {(openChipKeys.length > 0 || closedChipKeys.length > 0) && (
            <>
              <Divider sx={{ my: 1.5 }} />

              {/* ── Selected chips (TransitionGroup animates enter/exit) ─────── */}
              {openChipKeys.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: closedChipKeys.length > 0 ? 0.75 : 0 }}>
                  <TransitionGroup>
                    {openChipKeys.map(key => {
                      const chip = resolveChip(key)!;
                      return (
                        <Collapse key={key} timeout={250}>
                          <Box
                            sx={{
                              display: 'flex', alignItems: 'stretch',
                              borderRadius: '12px',
                              bgcolor: chip.color,
                              color: 'common.white',
                              userSelect: 'none',
                              overflow: 'hidden',
                              mb: 0.75,
                            }}
                          >
                            {/* Main area — click to deselect and collapse back to the pool */}
                            <Box
                              onClick={() => toggleContext(key)}
                              sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, px: 1.5, py: 0.75, cursor: 'pointer' }}
                            >
                              {chip.icon}
                              <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                <Box component="span" sx={{ fontWeight: 600 }}>{chip.label}:</Box>{' '}{chip.value}
                              </Typography>
                            </Box>
                            {/* Cycle area — full-height right zone for array-valued chips */}
                            {chip.cycleNext && (
                              <Box
                                onClick={(e) => { e.stopPropagation(); chip.cycleNext!(); }}
                                sx={{ display: 'flex', alignItems: 'center', px: 1, cursor: 'pointer', bgcolor: 'rgba(0,0,0,0.15)', '&:hover': { bgcolor: 'rgba(0,0,0,0.25)' } }}
                              >
                                <NavigateNextIcon sx={{ fontSize: '1.1rem' }} />
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      );
                    })}
                  </TransitionGroup>
                </Box>
              )}

              {/* ── Unselected chips (alphabetical, inline wrap) ─────────── */}
              {closedChipKeys.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {closedChipKeys.map(key => {
                    const chip = resolveChip(key)!;
                    return (
                      <Box
                        key={key}
                        onClick={() => toggleContext(key)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 0.5,
                          px: 1.5, py: 0.5,
                          borderRadius: '12px',
                          border: '1px solid',
                          borderColor: chip.color,
                          color: chip.color,
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background-color 0.2s ease, color 0.2s ease',
                          '&:hover': { bgcolor: chip.color, color: 'common.white' },
                        }}
                      >
                        {chip.icon}
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{chip.label}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </>
          )}

          <Divider sx={{ my: 1.5 }} />

          {/* ── Light / Shadow meaning lists ─────────────────────────────── */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Light Meanings</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
            {modalCard.keywords_upright.join(', ')}
          </Box>
          <Box component="ul" sx={{ pl: 2, mt: 0.5, mb: 1.5 }}>
            {modalCard.meanings.light.map((m, i) => (
              <Typography component="li" key={i} variant="body2">{m}</Typography>
            ))}
          </Box>

          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Shadow Meanings</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
            {modalCard.keywords_reversed?.join(', ') ?? 'N/A'}
          </Box>
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
