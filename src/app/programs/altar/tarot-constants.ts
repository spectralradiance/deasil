import type { EnrichedCard } from './tarot-data';

// ── Interfaces ────────────────────────────────────────────────────────────────

/** A named position within a tarot spread (e.g. "Past", "Future") */
export interface SpreadPosition {
  name: string;
  description: string;
}

/** Column/row coordinates for a card in a custom-layout CSS grid */
export interface SpreadGridPos {
  col: number;
  row: number;
}

/** Definition of one spread type (e.g. "Celtic Cross", "Custom") */
export interface SpreadOption {
  name: string;
  /** Number of cards to draw. null means the user specifies the count. */
  count: number | null;
  positions?: SpreadPosition[];
  /** Optional 2-D grid layout for non-linear spreads */
  layout?: SpreadGridPos[];
}

/** A tarot card as it was drawn, including its orientation for this reading */
export interface DrawnCard extends EnrichedCard {
  isReversed: boolean;
}

// ── Card flip state machine ───────────────────────────────────────────────────

/**
 * Flip animation state for a single card.
 *
 * The flip is a two-phase CSS animation:
 *   idle → shrink (card collapses along its flip axis, becoming invisible)
 *        → grow   (card expands back to full size, revealing the new face)
 *        → idle
 *
 * `isFront` is toggled between the shrink and grow phases so the image swap
 * occurs while the card is invisible at its narrowest (or shortest) point.
 *
 * After the card is face-up, subsequent clicks toggle `contentVisible` to
 * expand/collapse the position label and card-info panels instead of flipping.
 */
export interface CardFlipState {
  /** True when the card face (art) is visible; false when showing the back */
  isFront: boolean;
  /** True when the position-label and card-info panels are expanded */
  contentVisible: boolean;
  /** Which CSS transform axis the flip acts on, determined by click position */
  axis: 'X' | 'Y';
  phase: 'idle' | 'shrink' | 'grow';
}

/** Initial state for every card: face-down, info collapsed, no animation running */
export const DEFAULT_FLIP: CardFlipState = {
  isFront: false,
  contentVisible: false,
  axis: 'Y',
  phase: 'idle',
};

// ── Context panel type ────────────────────────────────────────────────────────

/** Which context chip panel is currently expanded in the card detail modal */
export type OpenContext =
  | 'love' | 'career' | 'mood' | 'spiritual'
  | 'yes_no' | 'fortune_telling' | 'numerology' | 'astrology' | 'questions' | 'affirmation'
  | null;

// ── Layout & animation constants ──────────────────────────────────────────────

/** Nominal card width used for grid-size calculations (px) */
export const LAYOUT_CARD_W = 90;
/** Nominal card height used for grid-size calculations (px) */
export const LAYOUT_CARD_H = 158;
/** Gutter between cards in a positioned layout grid (px) */
export const LAYOUT_GAP = 14;
/** Duration of the draw / clear opacity fade (ms) */
export const CARDS_FADE_MS = 280;

// ── Spread definitions ────────────────────────────────────────────────────────

/** All available spread types. "Custom" uses a user-defined card count. */
export const SPREADS: SpreadOption[] = [
  {
    name: 'Single Card', count: 1,
    positions: [{ name: 'The Card', description: 'Your central focus or message' }],
  },
  {
    name: 'Two Card', count: 2,
    positions: [
      { name: 'Situation', description: 'The current state of affairs' },
      { name: 'Advice',    description: 'Guidance for how to proceed' },
    ],
  },
  {
    name: 'Past · Present · Future', count: 3,
    positions: [
      { name: 'Past',    description: 'What has led you to this moment' },
      { name: 'Present', description: 'Where you stand right now' },
      { name: 'Future',  description: 'Where your path is heading' },
    ],
  },
  {
    name: 'Four Elements', count: 4,
    positions: [
      { name: 'Fire',  description: 'South — Passion, action, and will' },
      { name: 'Water', description: 'West — Emotion, intuition, and feeling' },
      { name: 'Air',   description: 'East — Thought, communication, and clarity' },
      { name: 'Earth', description: 'North — Practical matters and material concerns' },
    ],
    layout: [
      { col: 1, row: 2 }, { col: 0, row: 1 }, { col: 2, row: 1 }, { col: 1, row: 0 },
    ],
  },
  {
    name: 'Five Card Cross', count: 5,
    positions: [
      { name: 'Present',   description: 'Your current situation' },
      { name: 'Challenge', description: 'What crosses or opposes you' },
      { name: 'Past',      description: 'Influences from the past' },
      { name: 'Future',    description: 'What is coming' },
      { name: 'Outcome',   description: 'The likely resolution' },
    ],
    layout: [
      { col: 1, row: 1 }, { col: 1, row: 0 }, { col: 0, row: 1 }, { col: 2, row: 1 }, { col: 1, row: 2 },
    ],
  },
  {
    name: 'Horseshoe', count: 7,
    positions: [
      { name: 'Past',                description: 'Recent past influences' },
      { name: 'Present',             description: 'Your current situation' },
      { name: 'Hidden Influences',   description: 'What lies beneath the surface' },
      { name: 'Obstacles',           description: 'Challenges to overcome' },
      { name: 'External Influences', description: 'The environment around you' },
      { name: 'Hopes & Fears',       description: 'What you wish for and dread' },
      { name: 'Outcome',             description: 'The likely result' },
    ],
    layout: [
      { col: 0, row: 2 }, { col: 0, row: 1 }, { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 }, { col: 2, row: 1 }, { col: 2, row: 2 },
    ],
  },
  {
    name: 'Celtic Cross', count: 10,
    positions: [
      { name: 'Present',             description: 'Your current situation' },
      { name: 'Challenge',           description: 'What crosses you' },
      { name: 'Distant Past',        description: 'The root of the matter' },
      { name: 'Recent Past',         description: 'What is passing away' },
      { name: 'Best Outcome',        description: 'What you are working toward' },
      { name: 'Near Future',         description: 'What is coming next' },
      { name: 'Self',                description: 'Your attitude and approach' },
      { name: 'External Influences', description: "Others' perceptions and environment" },
      { name: 'Hopes & Fears',       description: 'Your inner hopes and fears' },
      { name: 'Final Outcome',       description: 'The likely resolution' },
    ],
    layout: [
      { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 1, row: 2 },
      { col: 0, row: 1 }, { col: 1, row: 0 }, { col: 3, row: 1 },
      { col: 5, row: 3 }, { col: 5, row: 2 }, { col: 5, row: 1 }, { col: 5, row: 0 },
    ],
  },
  { name: 'Custom', count: null },
];

// ── Symbol & style lookup maps ────────────────────────────────────────────────

/** Text-presentation (\uFE0E) unicode symbols for astrological planets */
export const PLANET_SYMBOLS: Record<string, string> = {
  Sun:     '\u2609\uFE0E',
  Moon:    '\u263d\uFE0E',
  Mercury: '\u263f\uFE0E',
  Venus:   '\u2640\uFE0E',
  Mars:    '\u2642\uFE0E',
  Jupiter: '\u2643\uFE0E',
  Saturn:  '\u2644\uFE0E',
  Uranus:  '\u2645\uFE0E',
  Neptune: '\u2646\uFE0E',
  Pluto:   '\u2647\uFE0E',
};

/** Text-presentation unicode symbols for the zodiac signs */
export const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries:       '\u2648\uFE0E',
  Taurus:      '\u2649\uFE0E',
  Gemini:      '\u264a\uFE0E',
  Cancer:      '\u264b\uFE0E',
  Leo:         '\u264c\uFE0E',
  Virgo:       '\u264d\uFE0E',
  Libra:       '\u264e\uFE0E',
  Scorpio:     '\u264f\uFE0E',
  Sagittarius: '\u2650\uFE0E',
  Capricorn:   '\u2651\uFE0E',
  Aquarius:    '\u2652\uFE0E',
  Pisces:      '\u2653\uFE0E',
};

/** MUI background/foreground colour tokens per classical element */
export const ELEMENT_STYLES: Record<string, { bgcolor: string; color: string }> = {
  Fire:  { bgcolor: 'rgba(211,84,0,0.12)',   color: '#b03000' },
  Water: { bgcolor: 'rgba(41,128,185,0.12)', color: '#1a5276' },
  Air:   { bgcolor: 'rgba(52,152,219,0.12)', color: '#1a6fa8' },
  Earth: { bgcolor: 'rgba(39,174,96,0.12)',  color: '#1e8449' },
};

/** Colour token and human-readable label for yes / no / maybe verdicts */
export const YES_NO_STYLES: Record<string, { color: string; label: string }> = {
  yes:   { color: 'success.main', label: 'Yes'   },
  no:    { color: 'error.main',   label: 'No'    },
  maybe: { color: 'warning.main', label: 'Maybe' },
};
