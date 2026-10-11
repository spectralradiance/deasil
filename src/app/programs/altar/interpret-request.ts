import type { AnyReading } from './ReadingEntry';

/** One drawn card, rune or few as sent to /api/altar/interpret. */
export interface InterpretItem {
  /** Catalog name, e.g. "The Fool", "Fehu", "Beith". The server looks up its meaning. */
  name: string;
  reversed: boolean;
  position?: string;
  positionDescription?: string;
}

export interface InterpretRequest {
  oracle: 'tarot' | 'runes' | 'ogham';
  spread: string;
  message?: string;
  items: InterpretItem[];
}

export const INTERPRET_LIMITS = {
  messageChars: 500,
  items: 78,
  nameChars: 64,
  positionChars: 200,
};

/** Builds the relay request body from a reading on the table. */
export function toInterpretRequest(reading: AnyReading): InterpretRequest {
  if (reading.kind === 'tarot') {
    return {
      oracle: 'tarot',
      spread: reading.spread.name,
      message: reading.message,
      items: reading.cards.map((card, i) => ({
        name: card.name,
        reversed: reading.hasReversals && card.isReversed,
        position: reading.positions?.[i]?.name || undefined,
        positionDescription: reading.positions?.[i]?.description || undefined,
      })),
    };
  }
  return {
    oracle: reading.label === 'Ogham' ? 'ogham' : 'runes',
    spread: reading.spread.name,
    message: reading.message,
    items: reading.tokens.map((token, i) => ({
      name: token.id,
      reversed: token.isReversed && !!token.reversed,
      position: reading.spread.positions?.[i],
    })),
  };
}
