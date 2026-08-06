export interface OghamFew {
  name: string;
  symbol: string;
  letter: string;
  tree: string;
  aicme: 1 | 2 | 3 | 4;
  keywords: string[];
  meaning: string;
}

export const OGHAM: OghamFew[] = [
  // ── First Aicme (Beth) ─────────────────────────────────────────────────────
  {
    name: 'Beith', symbol: 'ᚁ', letter: 'B', tree: 'Birch', aicme: 1,
    keywords: ['new beginnings', 'purification', 'rebirth', 'cleansing'],
    meaning: 'The silver birch stands first among the trees. New beginnings after endings, cleansing of the old, and the courage to start fresh on clear, white ground.',
  },
  {
    name: 'Luis', symbol: 'ᚂ', letter: 'L', tree: 'Rowan', aicme: 1,
    keywords: ['protection', 'vision', 'quick action', 'foresight'],
    meaning: 'The rowan offers bright berries and shields against enchantment. Clarity of sight, psychic protection, and the power to discern truth from illusion.',
  },
  {
    name: 'Nion', symbol: 'ᚃ', letter: 'N', tree: 'Ash', aicme: 1,
    keywords: ['world tree', 'connections', 'cosmos', 'fate'],
    meaning: 'The great ash is the world tree Yggdrasil — connecting all realms. Binding threads of fate, inner and outer worlds in communication, and the web of all existence.',
  },
  {
    name: 'Fearn', symbol: 'ᚄ', letter: 'F', tree: 'Alder', aicme: 1,
    keywords: ['protection', 'guidance', 'strength', 'bridge'],
    meaning: 'The alder grows where water meets land — a bridge between worlds. Oracular guidance, the courage to venture into the unknown, and protective support on difficult crossings.',
  },
  {
    name: 'Sail', symbol: 'ᚅ', letter: 'S', tree: 'Willow', aicme: 1,
    keywords: ['intuition', 'moon', 'flexibility', 'water'],
    meaning: 'The willow bends without breaking and follows the waters. Deep intuition, lunar wisdom, the ability to adapt to any current, and the knowledge that flows beneath the surface.',
  },
  // ── Second Aicme (Huath) ───────────────────────────────────────────────────
  {
    name: 'Huath', symbol: 'ᚆ', letter: 'H', tree: 'Hawthorn', aicme: 2,
    keywords: ['cleansing', 'patience', 'waiting', 'chastity'],
    meaning: 'The hawthorn stands at the threshold between the seen and unseen worlds. A time of restraint and inner purification before the sacred may be entered.',
  },
  {
    name: 'Duir', symbol: 'ᚇ', letter: 'D', tree: 'Oak', aicme: 2,
    keywords: ['strength', 'kingship', 'doorways', 'endurance'],
    meaning: 'The mighty oak stands as king of the forest, its doors opening to hidden realms. Enduring strength, authority, and the power of the sacred masculine.',
  },
  {
    name: 'Tinne', symbol: 'ᚈ', letter: 'T', tree: 'Holly', aicme: 2,
    keywords: ['challenge', 'balance', 'sacrifice', 'warrior'],
    meaning: 'The holly king rules the waning year and meets all challenges with bright fierceness. Balance through conflict, sacred struggle, and the warrior spirit.',
  },
  {
    name: 'Coll', symbol: 'ᚉ', letter: 'C', tree: 'Hazel', aicme: 2,
    keywords: ['wisdom', 'inspiration', 'poetry', 'knowledge'],
    meaning: 'The hazel drops its nuts into the well of wisdom where the salmon swims. Sudden poetic inspiration, the direct transmission of knowledge, and the magic of the bard.',
  },
  {
    name: 'Quert', symbol: 'ᚊ', letter: 'Q', tree: 'Apple', aicme: 2,
    keywords: ['beauty', 'love', 'eternal youth', 'otherworld'],
    meaning: 'The apple tree blossoms in Avalon, isle of the blessed. Beauty, love, and a taste of the immortal realm that lies just beyond the veil.',
  },
  // ── Third Aicme (Muin) ────────────────────────────────────────────────────
  {
    name: 'Muin', symbol: 'ᚋ', letter: 'M', tree: 'Vine/Bramble', aicme: 3,
    keywords: ['introspection', 'prophecy', 'truth', 'inner harvest'],
    meaning: 'The vine twines and turns inward, yielding the fruit of truth. A time of retrospection and harvesting the lessons of lived experience through honest self-examination.',
  },
  {
    name: 'Gort', symbol: 'ᚌ', letter: 'G', tree: 'Ivy', aicme: 3,
    keywords: ['tenacity', 'spirals', 'growth', 'persistence'],
    meaning: 'Ivy spirals endlessly around its host, clinging through every season. Tenacious growth, the spiral pattern of all becoming, and the determination to thrive despite all obstacles.',
  },
  {
    name: 'Ngetal', symbol: 'ᚍ', letter: 'Ng', tree: 'Reed', aicme: 3,
    keywords: ['healing', 'music', 'order', 'voice'],
    meaning: 'The hollow reed becomes the flute, carrying healing music. Order restored, the healing power of sound and rhythm, and the voice that channels divine breath.',
  },
  {
    name: 'Straif', symbol: 'ᚎ', letter: 'St', tree: 'Blackthorn', aicme: 3,
    keywords: ['fate', 'discipline', 'strife', 'necessity'],
    meaning: 'The blackthorn\'s thorns draw blood and its sloe fruits follow frost. Unavoidable fate, the hard discipline imposed by circumstance, and strength forged in difficulty.',
  },
  {
    name: 'Ruis', symbol: 'ᚏ', letter: 'R', tree: 'Elder', aicme: 3,
    keywords: ['endings', 'regeneration', 'elder wisdom', 'completion'],
    meaning: 'The elder stands at the year\'s end, yet from its deadened wood new shoots spring. Completion, the wisdom of endings, and the regenerative force that makes all death a doorway.',
  },
  // ── Fourth Aicme (Ailm) ───────────────────────────────────────────────────
  {
    name: 'Ailm', symbol: 'ᚐ', letter: 'A', tree: 'Silver Fir', aicme: 4,
    keywords: ['clarity', 'perspective', 'healing', 'vision'],
    meaning: 'The silver fir stands tall with a clear view above the forest canopy. Far-sighted perspective, the panoramic view of life\'s patterns, and the clarity that comes with healing.',
  },
  {
    name: 'Onn', symbol: 'ᚑ', letter: 'O', tree: 'Gorse', aicme: 4,
    keywords: ['vitality', 'summer', 'life force', 'gold'],
    meaning: 'Gorse blazes brilliant gold even in winter, bursting with life. Irrepressible vitality, the summer sun\'s warm promise, and the joy of life asserting itself.',
  },
  {
    name: 'Ur', symbol: 'ᚒ', letter: 'U', tree: 'Heather', aicme: 4,
    keywords: ['healing', 'luck', 'passion', 'earth magic'],
    meaning: 'Heather carpets the moors and sweetens the wind. Healing of deep wounds, the lucky grace of the earth, and the warm comfort of belonging to a landscape.',
  },
  {
    name: 'Edad', symbol: 'ᚓ', letter: 'E', tree: 'Aspen', aicme: 4,
    keywords: ['courage', 'endurance', 'wind', 'eloquence'],
    meaning: 'The aspen shivers in the faintest breeze yet stands through every storm. Courage and endurance in the face of fear, the eloquent voice that speaks even when trembling.',
  },
  {
    name: 'Idad', symbol: 'ᚔ', letter: 'I', tree: 'Yew', aicme: 4,
    keywords: ['immortality', 'death and rebirth', 'ancestors', 'mystery'],
    meaning: 'The ancient yew lives for millennia, its heartwood rotting while new growth springs from within. The mystery of eternal life, direct communion with ancestors, and the knowledge that death is never final.',
  },
];

export const OGHAM_AICMI: Array<{ name: string; fews: OghamFew[] }> = [
  { name: 'First Aicme — Beth',  fews: OGHAM.filter(f => f.aicme === 1) },
  { name: 'Second Aicme — Huath', fews: OGHAM.filter(f => f.aicme === 2) },
  { name: 'Third Aicme — Muin',  fews: OGHAM.filter(f => f.aicme === 3) },
  { name: 'Fourth Aicme — Ailm', fews: OGHAM.filter(f => f.aicme === 4) },
];
