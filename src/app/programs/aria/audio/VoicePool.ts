import { Voice } from './Voice';

/**
 * Fixed-size bank of voices with oldest-first stealing.
 *
 * Allocation is scheduled, not live: `allocate(time)` answers "which voice is
 * free at this future moment", because the scheduler is always working ahead of
 * the audio clock. Comparing against `ctx.currentTime` instead would report
 * voices as busy that will in fact have finished by the time the note sounds.
 */
export class VoicePool {
  private readonly voices: Voice[];

  constructor(ctx: BaseAudioContext, output: AudioNode, polyphony: number) {
    const count = Math.max(1, Math.floor(polyphony));
    this.voices = Array.from({ length: count }, () => new Voice(ctx, output));
  }

  get size(): number {
    return this.voices.length;
  }

  /** Voices still sounding at `time`. */
  activeCount(time: number): number {
    let n = 0;
    for (const voice of this.voices) if (voice.isActive(time)) n += 1;
    return n;
  }

  /**
   * Returns a voice usable at `time`, stealing the longest-running one if all
   * are busy. `stolen` lets callers surface how often the polyphony cap bites.
   */
  allocate(time: number): { voice: Voice; stolen: boolean } {
    let idle: Voice | null = null;
    let oldest: Voice | null = null;

    for (const voice of this.voices) {
      if (!voice.isActive(time)) {
        // Prefer the voice that has been silent longest, so a just-released
        // note keeps its tail for as long as possible.
        if (!idle || voice.freeAt < idle.freeAt) idle = voice;
        continue;
      }
      if (!oldest || voice.startTime < oldest.startTime) oldest = voice;
    }

    if (idle) return { voice: idle, stolen: false };

    const victim = oldest ?? this.voices[0];
    victim.steal(time);
    return { voice: victim, stolen: true };
  }

  /** Finds the voice currently playing a given pitch, for note-off. */
  findByNote(noteId: number, time: number): Voice | null {
    let match: Voice | null = null;
    for (const voice of this.voices) {
      if (voice.noteId === noteId && voice.isActive(time)) {
        if (!match || voice.startTime > match.startTime) match = voice;
      }
    }
    return match;
  }

  /** Releases every sounding voice with its normal release tail. */
  releaseAll(time: number): void {
    for (const voice of this.voices) {
      if (voice.isActive(time)) voice.release(time);
    }
  }

  /** Silences everything immediately. For transport stop. */
  killAll(time: number): void {
    for (const voice of this.voices) voice.kill(time);
  }

  dispose(): void {
    for (const voice of this.voices) voice.dispose();
    this.voices.length = 0;
  }
}
