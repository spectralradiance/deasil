export interface LetterMapping {
  rune: string;
  ogham: string;
  name: string;
}

export const letterMappings: { [key: string]: LetterMapping } = {
  'f': { rune: 'ᚠ', ogham: 'ᚃ', name: 'Fehu' },
  'u': { rune: 'ᚢ', ogham: 'ᚆ', name: 'Uruz' },
  'th': { rune: 'ᚦ', ogham: 'ᚈ', name: 'Thurisaz' },
  'a': { rune: 'ᚨ', ogham: 'ᚐ', name: 'Ansuz' },
  'r': { rune: 'ᚱ', ogham: 'ᚇ', name: 'Raido' },
  'c': { rune: 'ᚲ', ogham: 'ᚊ', name: 'Kenaz' },
  'k': { rune: 'ᚲ', ogham: 'ᚊ', name: 'Kenaz' },
  'g': { rune: 'ᚷ', ogham: 'ᚌ', name: 'Gebo' },
  'w': { rune: 'ᚹ', ogham: 'ᚍ', name: 'Wunjo' },
  'h': { rune: 'ᚺ', ogham: 'ᚎ', name: 'Hagalaz' },
  'n': { rune: 'ᚾ', ogham: 'ᚏ', name: 'Naudiz' },
  'i': { rune: 'ᛁ', ogham: 'ᚔ', name: 'Isaz' },
  'j': { rune: 'ᛃ', ogham: 'ᚎ', name: 'Jera' },
  'y': { rune: 'ᛃ', ogham: 'ᚎ', name: 'Jera' },
  'ei': { rune: 'ᛇ', ogham: 'ᚕ', name: 'Eihwaz' },
  'p': { rune: 'ᛈ', ogham: 'ᚖ', name: 'Perthro' },
  'z': { rune: 'ᛉ', ogham: 'ᚎ', name: 'Algiz' },
  's': { rune: 'ᛊ', ogham: 'ᚄ', name: 'Sowilo' },
  't': { rune: 'ᛏ', ogham: 'ᚈ', name: 'Tiwaz' },
  'b': { rune: 'ᛒ', ogham: 'ᚁ', name: 'Berkano' },
  'e': { rune: 'ᛖ', ogham: 'ᚓ', name: 'Ehwaz' },
  'm': { rune: 'ᛗ', ogham: 'ᚋ', name: 'Mannaz' },
  'l': { rune: 'ᛚ', ogham: 'ᚂ', name: 'Laguz' },
  'ng': { rune: 'ᛜ', ogham: 'ᚍ', name: 'Ingwaz' },
  'd': { rune: 'ᛞ', ogham: 'ᚉ', name: 'Dagaz' },
  'o': { rune: 'ᛟ', ogham: 'ᚑ', name: 'Othala' },
  ' ': { rune: '᛫', ogham: ' ', name: 'space' },
};
