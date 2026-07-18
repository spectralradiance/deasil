// Types shared across the Völuspá viewer

export type ViewMode = 'stanza' | 'single' | 'compare';

export interface Footnote {
  number: number;
  char_index?: number;
  text: string;
}

export interface Stanza {
  index: number;
  original_index?: number;
  text: string;
  /** Legacy single-footnote field */
  footnote?: string | null;
  /** Modern multi-footnote field */
  footnotes?: Footnote[];
}

export interface Section {
  after_stanza: number;
  title: string;
}

export interface VoluspaData {
  title: string;
  subtitle?: string;
  translator?: string;
  language?: string;
  edition?: string;
  introductory_note?: string;
  sections?: Section[];
  stanzas: Stanza[];
}
