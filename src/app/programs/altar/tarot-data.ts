import mergedData from './tarot-merged.json';

export interface EnrichedCard {
  // tarot-images.json
  name: string;
  img: string;
  meanings: { light: string[]; shadow: string[] };
  fortune_telling?: string[];
  Archetype?: string;
  'Hebrew Alphabet'?: string;
  Numerology?: string;
  Elemental?: string;
  'Mythical/Spiritual'?: string;
  'Questions to Ask'?: string[];
  Affirmation?: string;
  Astrology?: string;
  // tarotoo.json
  element: string | null;
  planet: string | null;
  zodiac: string | null;
  yes_no: 'yes' | 'no' | 'maybe' | null;
  keywords_upright: string[];
  keywords_reversed: string[];
  love: string | null;
  career: string | null;
  mood: string | null;
  spiritual: string | null;
  // tarot_pkt.json (Waite primary source)
  waite_description: string | null;
  waite_divinatory: string | null;
  waite_reversed: string | null;
}

export const enrichedCards: EnrichedCard[] = mergedData.cards as unknown as EnrichedCard[];
