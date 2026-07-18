// Static data: translation list and stanza count cap

export const MAX_STANZAS = 66;

export const TRANSLATIONS = [
  { key: 'bellows',   file: '/voluspa/voluspa_bellows.json',   label: 'Bellows (1923)' },
  { key: 'bray',      file: '/voluspa/voluspa_bray.json',      label: 'Bray (1908)' },
  { key: 'hollander', file: '/voluspa/voluspa_hollander.json', label: 'Hollander (1962)' },
  { key: 'thorpe',    file: '/voluspa/voluspa_thorpe.json',    label: 'Thorpe (1866)' },
  { key: 'turner',    file: '/voluspa/voluspa_turner.json',    label: 'Turner (1836)' },
  { key: 'neckel',    file: '/voluspa/voluspa_neckel.json',    label: 'Neckel — Old Norse (1914)' },
] as const;

export type TranslationKey = typeof TRANSLATIONS[number]['key'];
