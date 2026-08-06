export interface Rune {
  name: string;
  symbol: string;
  phoneme: string;
  aett: 'Freyr' | 'Heimdall' | 'Tyr';
  keywords: string[];
  upright: string;
  reversed: string; // empty = non-reversible
}

export const RUNES: Rune[] = [
  // ── Freyr's Aett ──────────────────────────────────────────────────────────
  {
    name: 'Fehu', symbol: 'ᚠ', phoneme: 'F', aett: 'Freyr',
    keywords: ['wealth', 'cattle', 'abundance', 'prosperity'],
    upright:  'Earned wealth, abundance, and new opportunities. Energy flowing outward; generosity and sharing of resources.',
    reversed: 'Loss of wealth or property. Greed, stinginess, or misuse of resources. Guard against squandering gains.',
  },
  {
    name: 'Uruz', symbol: 'ᚢ', phoneme: 'U', aett: 'Freyr',
    keywords: ['strength', 'aurochs', 'vitality', 'primal force'],
    upright:  'Raw strength, endurance, and primal life force. A time of good health and physical or mental power.',
    reversed: 'Lack of willpower or missed opportunities. Weakness, misdirected force, or violence.',
  },
  {
    name: 'Thurisaz', symbol: 'ᚦ', phoneme: 'Th', aett: 'Freyr',
    keywords: ['thorn', 'giant', 'protection', 'conflict'],
    upright:  'Reactive force and protection through challenge. A gateway demanding careful contemplation before action.',
    reversed: 'Danger, compulsion, and vulnerability. Betrayal or rash decisions with painful consequences.',
  },
  {
    name: 'Ansuz', symbol: 'ᚨ', phoneme: 'A', aett: 'Freyr',
    keywords: ['Odin', 'wisdom', 'communication', 'inspiration'],
    upright:  'Divine inspiration, eloquent communication, and the power of the spoken word. Gifts of wisdom or a message.',
    reversed: 'Deception, manipulation, or failed communication. Vanity, poor advice, or blocked creative flow.',
  },
  {
    name: 'Raidho', symbol: 'ᚱ', phoneme: 'R', aett: 'Freyr',
    keywords: ['journey', 'wheel', 'movement', 'rhythm'],
    upright:  'A journey — physical or spiritual. Righteous action, natural rhythm, and the soul\'s true path.',
    reversed: 'Disrupted travel, irrationality, or a path taken out of sync with natural flow.',
  },
  {
    name: 'Kenaz', symbol: 'ᚲ', phoneme: 'K', aett: 'Freyr',
    keywords: ['torch', 'fire', 'knowledge', 'creativity'],
    upright:  'The torch of knowledge and technical skill. Creative fire, controlled transformation, and new insight.',
    reversed: 'Arrogance, false inspiration, or a flame extinguished. Loss of direction or creative block.',
  },
  {
    name: 'Gebo', symbol: 'ᚷ', phoneme: 'G', aett: 'Freyr',
    keywords: ['gift', 'exchange', 'partnership', 'generosity'],
    upright:  'The sacred gift and its obligation. Balance in exchange, partnership, and generous giving.',
    reversed: 'Gebo has no reversed meaning; it remains a rune of harmony.',
  },
  {
    name: 'Wunjo', symbol: 'ᚹ', phoneme: 'W', aett: 'Freyr',
    keywords: ['joy', 'harmony', 'fellowship', 'happiness'],
    upright:  'Joy, harmony among kin, and the fulfillment of wishes. A time of pleasure and well-being.',
    reversed: 'Alienation, sorrow, or unfulfilled desires. Frenzy beneath a surface appearance of joy.',
  },
  // ── Heimdall's Aett ───────────────────────────────────────────────────────
  {
    name: 'Hagalaz', symbol: 'ᚺ', phoneme: 'H', aett: 'Heimdall',
    keywords: ['hail', 'disruption', 'crisis', 'transformation'],
    upright:  'Sudden disruption and elemental crisis. A hailstorm that destroys and then melts into water — transformation through catastrophe.',
    reversed: 'Hagalaz has no reversed meaning; its energy is always disruptive.',
  },
  {
    name: 'Nauthiz', symbol: 'ᚾ', phoneme: 'N', aett: 'Heimdall',
    keywords: ['need', 'necessity', 'constraint', 'endurance'],
    upright:  'Distress, necessity, and the seed of will that grows from need. Patience and the lessons of privation.',
    reversed: 'Excessive constraint, neediness, or impatience. Failing to learn from hardship.',
  },
  {
    name: 'Isa', symbol: 'ᛁ', phoneme: 'I', aett: 'Heimdall',
    keywords: ['ice', 'stillness', 'blockage', 'introspection'],
    upright:  'Ice-cold stillness and the cessation of movement. Concentrated self, contraction, and necessary pause.',
    reversed: 'Isa has no reversed meaning; its nature is stillness.',
  },
  {
    name: 'Jera', symbol: 'ᛃ', phoneme: 'J/Y', aett: 'Heimdall',
    keywords: ['harvest', 'year', 'cycles', 'reward'],
    upright:  'The cycle of the year and just reward for past efforts. Harvest time, natural cycles, and patience rewarded.',
    reversed: 'Jera has no reversed meaning; cycles are not reversible.',
  },
  {
    name: 'Eihwaz', symbol: 'ᛇ', phoneme: 'Ei', aett: 'Heimdall',
    keywords: ['yew', 'endurance', 'axis', 'death and rebirth'],
    upright:  'The yew tree as world-axis and bridge between worlds. Endurance, reliability, and the mystery of continuance.',
    reversed: 'Eihwaz has no reversed meaning; it stands between life and death.',
  },
  {
    name: 'Perthro', symbol: 'ᛈ', phoneme: 'P', aett: 'Heimdall',
    keywords: ['fate', 'mystery', 'chance', 'hidden'],
    upright:  'The lot cup and the mysteries of wyrd. Chance, hidden forces, and the revelation of what was concealed.',
    reversed: 'Addiction, stagnation, or manipulation. Something hidden remains deliberately obscured.',
  },
  {
    name: 'Algiz', symbol: 'ᛉ', phoneme: 'Z', aett: 'Heimdall',
    keywords: ['elk', 'protection', 'sanctuary', 'higher self'],
    upright:  'Protection, the elk\'s antler warding off danger. Connection to the higher self and divine guardianship.',
    reversed: 'Hidden danger, vulnerability, or taboo violated. A warning that protection has been withdrawn.',
  },
  {
    name: 'Sowilo', symbol: 'ᛊ', phoneme: 'S', aett: 'Heimdall',
    keywords: ['sun', 'victory', 'wholeness', 'success'],
    upright:  'The sun\'s guiding light, victory, and the wholeness of the self. Life force, clarity, and achievement.',
    reversed: 'Sowilo has no reversed meaning; the sun always shines eventually.',
  },
  // ── Tyr's Aett ────────────────────────────────────────────────────────────
  {
    name: 'Tiwaz', symbol: 'ᛏ', phoneme: 'T', aett: 'Tyr',
    keywords: ['Tyr', 'justice', 'sacrifice', 'victory'],
    upright:  'The one-handed war god Tyr — just victory through self-sacrifice. Honor, law, and the triumph of right.',
    reversed: 'Injustice, blocked energy, or a cause that has lost its moral foundation. Sacrifice made in vain.',
  },
  {
    name: 'Berkano', symbol: 'ᛒ', phoneme: 'B', aett: 'Tyr',
    keywords: ['birch', 'fertility', 'nurturing', 'rebirth'],
    upright:  'The birch goddess — new beginnings, birth, and the healing shelter of the mother. Growth and renewal.',
    reversed: 'Infertility, anxiety, or failed nurturing. Family problems or a project stillborn.',
  },
  {
    name: 'Ehwaz', symbol: 'ᛖ', phoneme: 'E', aett: 'Tyr',
    keywords: ['horse', 'partnership', 'trust', 'progress'],
    upright:  'Horse and rider in perfect partnership. Loyalty, gradual progress through trust, and harmonious movement.',
    reversed: 'Disharmony, restlessness, or a relationship of distrust. Movement for its own sake.',
  },
  {
    name: 'Mannaz', symbol: 'ᛗ', phoneme: 'M', aett: 'Tyr',
    keywords: ['humanity', 'self', 'community', 'mind'],
    upright:  'Humanity, the rational mind, and one\'s place in the social order. Introspection and the divine gift of memory.',
    reversed: 'Manipulation, cunning misused, or isolation from community. Depression or delusion.',
  },
  {
    name: 'Laguz', symbol: 'ᛚ', phoneme: 'L', aett: 'Tyr',
    keywords: ['water', 'lake', 'intuition', 'flow'],
    upright:  'The deep lake and flowing water. Intuition, the unconscious, psychic ability, and the ebb and flow of life.',
    reversed: 'Fear, confusion, or avoiding what lies beneath. Madness from refusing to face the unconscious.',
  },
  {
    name: 'Ingwaz', symbol: 'ᛜ', phoneme: 'Ng', aett: 'Tyr',
    keywords: ['Freyr', 'fertility', 'inner strength', 'completion'],
    upright:  'The god Ing (Freyr) and gestation before release. Potential energy, inner completion, and readiness for the next phase.',
    reversed: 'Ingwaz has no reversed meaning; it is a rune of pure potential.',
  },
  {
    name: 'Dagaz', symbol: 'ᛞ', phoneme: 'D', aett: 'Tyr',
    keywords: ['dawn', 'breakthrough', 'day', 'transformation'],
    upright:  'The dawn\'s moment of breakthrough — radical transformation and the balance point between opposites. A new day.',
    reversed: 'Dagaz has no reversed meaning; it stands at the eternal threshold.',
  },
  {
    name: 'Othala', symbol: 'ᛟ', phoneme: 'O', aett: 'Tyr',
    keywords: ['inheritance', 'home', 'heritage', 'ancestral wisdom'],
    upright:  'Ancestral property and inherited wisdom. Home, clan, spiritual heritage, and the gifts passed down through generations.',
    reversed: 'Totalitarianism, clannishness, or spiritual poverty. Clinging to the past at the expense of the present.',
  },
];

export const RUNE_AETTS: Array<{ name: string; runes: Rune[] }> = [
  { name: "Freyr's Aett",    runes: RUNES.filter(r => r.aett === 'Freyr')    },
  { name: "Heimdall's Aett", runes: RUNES.filter(r => r.aett === 'Heimdall') },
  { name: "Tyr's Aett",      runes: RUNES.filter(r => r.aett === 'Tyr')      },
];
