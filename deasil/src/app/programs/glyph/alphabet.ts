export interface Rune {
  name: string;
  glyph: string;
  meaning: string;
  poem: {
    original: string;
    translation: string;
  };
}

export interface Ogham {
  name: string;
  glyph: string;
  meaning: string;
}

export interface Translation {
  [key: string]: {
    rune: string;
    ogham: string;
  };
}

export const runes: { [key: string]: Rune } = {
  'Fehu': {
    name: 'Fehu',
    glyph: 'ᚠ',
    meaning: 'Wealth, cattle',
    poem: {
      original: 'Fé er frænda róg ok flæðar viti ok grafseiðs gata',
      translation: 'Wealth is a source of discord among kinsmen and fire of the sea and path of the serpent.'
    }
  },
  'Uruz': {
    name: 'Uruz',
    glyph: 'ᚢ',
    meaning: 'Aurochs, strength',
    poem: {
      original: 'Úr er skýja grátr ok skára þverrir ok hirðis hatr.',
      translation: 'Shower is lamentation of the clouds and ruin of the hay-harvest and abomination of the shepherd.'
    }
  },
  'Thurisaz': {
    name: 'Thurisaz',
    glyph: 'ᚦ',
    meaning: 'Giant, thorn',
    poem: {
      original: 'Þurs er kvenna kvöl ok kletta búi ok varðrúnar verr.',
      translation: 'Giant is torture of women and cliff-dweller and husband of a giantess.'
    }
  },
  'Ansuz': {
    name: 'Ansuz',
    glyph: 'ᚨ',
    meaning: 'God, mouth',
    poem: {
      original: 'Óss er aldingautr ok ásgarðs jöfurr, ok valhallar vísi.',
      translation: 'God is aged Gautr and prince of Ásgarðr and lord of Valhalla.'
    }
  },
  'Raido': {
    name: 'Raido',
    glyph: 'ᚱ',
    meaning: 'Riding, journey',
    poem: {
      original: 'Reið er sitjandi sæla ok snúðig ferð ok jórs erfiði.',
      translation: 'Riding is joy of the horsemen and speedy journey and toil of the steed.'
    }
  },
  'Kenaz': {
    name: 'Kenaz',
    glyph: 'ᚲ',
    meaning: 'Torch',
    poem: {
      original: 'Kaun er barna böl ok bardaga [för] ok holdfúa hús.',
      translation: 'Ulcer is disease fatal to children and painful spot and abode of mortification.'
    }
  },
  'Gebo': {
    name: 'Gebo',
    glyph: 'ᚷ',
    meaning: 'Gift',
    poem: {
      original: '', // No Icelandic rune poem for Gebo
      translation: ''
    }
  },
  'Wunjo': {
    name: 'Wunjo',
    glyph: 'ᚹ',
    meaning: 'Joy',
    poem: {
      original: '', // No Icelandic rune poem for Wunjo
      translation: ''
    }
  },
  'Hagalaz': {
    name: 'Hagalaz',
    glyph: 'ᚺ',
    meaning: 'Hail',
    poem: {
      original: 'Hagall er kaldakorn ok krapadrífa ok snáka sótt.',
      translation: 'Hail is cold grain and shower of sleet and sickness of serpents.'
    }
  },
  'Naudiz': {
    name: 'Naudiz',
    glyph: 'ᚾ',
    meaning: 'Need, necessity',
    poem: {
      original: 'Nauð er Þýjar þrá ok þungr kostr ok vássamlig verk.',
      translation: 'Constraint is grief of the bond-maid and state of oppression and toilsome work.'
    }
  },
  'Isaz': {
    name: 'Isaz',
    glyph: 'ᛁ',
    meaning: 'Ice',
    poem: {
      original: 'Íss er árbörkr ok unnar þak ok feigra manna fár.',
      translation: 'Ice is bark of rivers and roof of the wave and destruction of the doomed.'
    }
  },
  'Jera': {
    name: 'Jera',
    glyph: 'ᛃ',
    meaning: 'Year, harvest',
    poem: {
      original: 'Ár er gumna góði ok gott sumar algróinn akr.',
      translation: 'Plenty is boon to men and good summer and thriving crops.'
    }
  },
  'Eihwaz': {
    name: 'Eihwaz',
    glyph: 'ᛇ',
    meaning: 'Yew tree',
    poem: {
      original: 'Ýr er bendr bogi ok brotgjarnt járn ok fífu fárbauti.',
      translation: 'Yew is bent bow and brittle iron and giant of the arrow.'
    }
  },
  'Perthro': {
    name: 'Perthro',
    glyph: 'ᛈ',
    meaning: 'Lot cup, fate',
    poem: {
      original: '', // No Icelandic rune poem for Perthro
      translation: ''
    }
  },
  'Algiz': {
    name: 'Algiz',
    glyph: 'ᛉ',
    meaning: 'Elk, protection',
    poem: {
      original: 'Ýr er bendr bogi ok brotgjarnt járn ok fífu fárbauti.',
      translation: 'Yew is bent bow and brittle iron and giant of the arrow.'
    }
  },
  'Sowilo': {
    name: 'Sowilo',
    glyph: 'ᛊ',
    meaning: 'Sun',
    poem: {
      original: 'Sól er skýja skjöldr ok skínandi röðull ok ísa aldrtregi.',
      translation: 'Sun is shield of the clouds and shining ray and destroyer of ice.'
    }
  },
  'Tiwaz': {
    name: 'Tiwaz',
    glyph: 'ᛏ',
    meaning: 'The god Tyr',
    poem: {
      original: 'Týr er einhendr áss ok ulfs leifar ok hofa hilmir.',
      translation: 'Týr is god with one hand and leavings of the wolf and prince of temples.'
    }
  },
  'Berkano': {
    name: 'Berkano',
    glyph: 'ᛒ',
    meaning: 'Birch',
    poem: {
      original: 'Bjarkan er laufgat lim ok lítit tré ok ungsamligr viðr.',
      translation: 'Birch is leafy twig and little tree and fresh young shrub.'
    }
  },
  'Ehwaz': {
    name: 'Ehwaz',
    glyph: 'ᛖ',
    meaning: 'Horse',
    poem: {
      original: '', // No Icelandic rune poem for Ehwaz
      translation: ''
    }
  },
  'Mannaz': {
    name: 'Mannaz',
    glyph: 'ᛗ',
    meaning: 'Man, mankind',
    poem: {
      original: 'Maðr er manns gaman ok moldar auki ok skipa skreytir.',
      translation: 'Man is delight of man and augmentation of the earth and adorner of ships.'
    }
  },
  'Laguz': {
    name: 'Laguz',
    glyph: 'ᛚ',
    meaning: 'Water, lake',
    poem: {
      original: 'Lögr er vellanda vatn ok viðr ketill ok glömmungr grund.',
      translation: 'Water is eddying stream and broad geysir and land of the fish.'
    }
  },
  'Ingwaz': {
    name: 'Ingwaz',
    glyph: 'ᛜ',
    meaning: 'The god Ing',
    poem: {
      original: '', // No Icelandic rune poem for Ingwaz
      translation: ''
    }
  },
  'Dagaz': {
    name: 'Dagaz',
    glyph: 'ᛞ',
    meaning: 'Day',
    poem: {
      original: '', // No Icelandic rune poem for Dagaz
      translation: ''
    }
  },
  'Othala': {
    name: 'Othala',
    glyph: 'ᛟ',
    meaning: 'Heritage, ancestral property',
    poem: {
      original: '', // No Icelandic rune poem for Othala
      translation: ''
    }
  }
};

export const ogham: { [key: string]: Ogham } = {
  'Beith': { name: 'Beith', glyph: 'ᚁ', meaning: 'Birch' },
  'Luis': { name: 'Luis', glyph: 'ᚂ', meaning: 'Flame or herb, associated with rowan' },
  'Fearn': { name: 'Fearn', glyph: 'ᚃ', meaning: 'Alder' },
  'Sail': { name: 'Sail', glyph: 'ᚄ', meaning: 'Willow' },
  'Nion': { name: 'Nion', glyph: 'ᚅ', meaning: 'Fork or loft, associated with ash' },
  'Uath': { name: 'Uath', glyph: 'ᚆ', meaning: 'Horror or fear, associated with hawthorn' },
  'Dair': { name: 'Dair', glyph: 'ᚇ', meaning: 'Oak' },
  'Tinne': { name: 'Tinne', glyph: 'ᚈ', meaning: 'Bar of metal or ingot, associated with holly' },
  'Coll': { name: 'Coll', glyph: 'ᚉ', meaning: 'Hazel' },
  'Ceirt': { name: 'Ceirt', glyph: 'ᚊ', meaning: 'Bush or rag, associated with apple' },
  'Muin': { name: 'Muin', glyph: 'ᚋ', meaning: 'Neck, ruse, or love, associated with vine' },
  'Gort': { name: 'Gort', glyph: 'ᚌ', meaning: 'Field, associated with ivy' },
  'nGeadal': { name: 'nGéadal', glyph: 'ᚍ', meaning: 'Killing, associated with broom or fern' },
  'Straif': { name: 'Straif', glyph: 'ᚎ', meaning: 'Sulphur, associated with blackthorn' },
  'Ruis': { name: 'Ruis', glyph: 'ᚏ', meaning: 'Red or redness, associated with elder' },
  'Ailm': { name: 'Ailm', glyph: 'ᚐ', meaning: 'Pine or fir' },
  'Onn': { name: 'Onn', glyph: 'ᚑ', meaning: 'Ash, associated with furze' },
  'Ur': { name: 'Ur', glyph: 'ᚒ', meaning: 'Earth, clay, or soil, associated with heath' },
  'Eadhadh': { name: 'Eadhadh', glyph: 'ᚓ', meaning: 'Unknown, associated with aspen' },
  'Iodhadh': { name: 'Iodhadh', glyph: 'ᚔ', meaning: 'Unknown, associated with yew' },
  'Eabhadh': { name: 'Eabhadh', glyph: 'ᚕ', meaning: 'Unknown, associated with aspen' },
  'Oir': { name: 'Óir', glyph: 'ᚖ', meaning: 'Gold, associated with spindle tree or ivy' },
  'Uilleann': { name: 'Uilleann', glyph: 'ᚗ', meaning: 'Elbow, associated with honeysuckle' },
  'Ifin': { name: 'Ifín', glyph: 'ᚘ', meaning: 'Spine or thorn, associated with gooseberry or thorn' },
  'Eamhancholl': { name: 'Eamhancholl', glyph: 'ᚙ', meaning: 'Twin of hazel' }
};

export const translations: Translation = {
  'f': { rune: 'Fehu', ogham: 'Fearn' },
  'u': { rune: 'Uruz', ogham: 'Ur' },
  'th': { rune: 'Thurisaz', ogham: 'Tinne' },
  'a': { rune: 'Ansuz', ogham: 'Ailm' },
  'r': { rune: 'Raido', ogham: 'Ruis' },
  'c': { rune: 'Kenaz', ogham: 'Ceirt' },
  'k': { rune: 'Kenaz', ogham: 'Ceirt' },
  'g': { rune: 'Gebo', ogham: 'Gort' },
  'w': { rune: 'Wunjo', ogham: 'nGéadal' },
  'h': { rune: 'Hagalaz', ogham: 'Uath' },
  'n': { rune: 'Naudiz', ogham: 'Nion' },
  'i': { rune: 'Isaz', ogham: 'Iodhadh' },
  'j': { rune: 'Jera', ogham: 'Straif' },
  'y': { rune: 'Jera', ogham: 'Straif' },
  'ei': { rune: 'Eihwaz', ogham: 'Eabhadh' },
  'p': { rune: 'Perthro', ogham: 'Oir' },
  'z': { rune: 'Algiz', ogham: 'Straif' },
  's': { rune: 'Sowilo', ogham: 'Sail' },
  't': { rune: 'Tiwaz', ogham: 'Tinne' },
  'b': { rune: 'Berkano', ogham: 'Beith' },
  'e': { rune: 'Ehwaz', ogham: 'Eadhadh' },
  'm': { rune: 'Mannaz', ogham: 'Muin' },
  'l': { rune: 'Laguz', ogham: 'Luis' },
  'ng': { rune: 'Ingwaz', ogham: 'nGéadal' },
  'd': { rune: 'Dagaz', ogham: 'Dair' },
  'o': { rune: 'Othala', ogham: 'Onn' },
  ' ': { rune: 'space', ogham: 'space' },
};

export const source = "https://en.wikipedia.org/wiki/Rune_poem";
