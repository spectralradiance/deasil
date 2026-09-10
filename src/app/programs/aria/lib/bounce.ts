import { AudioEngine } from '../audio/AudioEngine';
import { GraphInstrument } from '../audio/GraphInstrument';
import { presetGraph } from '../audio/graph-presets';
import { createSoftClip } from '../audio/softclip';
import { Scale } from './scale';
import { findPattern, isAudible, orderLength, positionAt, type Song } from './song';

/**
 * Renders a song to a WAV blob with no real-time playback.
 *
 * This works only because `audio/` never touches React and never assumes a live
 * AudioContext: the same GraphInstrument that plays through the speakers
 * compiles just as happily into an OfflineAudioContext. That separation was the
 * plan's first architectural rule, and this is what it buys.
 *
 * Rendering is faster than real time, so a four-bar loop returns in well under
 * a second.
 */

export interface BounceOptions {
  /** How many times to play through the order list. */
  repeats?: number;
  sampleRate?: number;
  /** Seconds of silence kept at the end for release tails and reverb. */
  tailSeconds?: number;
}

/**
 * A minimal stand-in for AudioEngine over an offline context.
 *
 * GraphInstrument only needs `context` and `destination` from the engine, so
 * rather than complicate the real class with an offline mode, this satisfies
 * that shape and keeps the production path untouched.
 */
function offlineEngine(ctx: OfflineAudioContext, destination: GainNode): AudioEngine {
  return {
    context: ctx,
    destination,
    currentTime: 0,
    isRunning: true,
    sampleRate: ctx.sampleRate,
  } as unknown as AudioEngine;
}

export async function renderSong(song: Song, options: BounceOptions = {}): Promise<AudioBuffer> {
  const { repeats = 1, sampleRate = 44100, tailSeconds = 2.5 } = options;

  const secondsPerStep = 60 / song.bpm / song.stepsPerBeat;
  const stepsPerPass = orderLength(song);
  if (stepsPerPass <= 0) throw new Error('Aria: nothing to render — the order list is empty');

  const totalSteps = stepsPerPass * Math.max(1, repeats);
  const seconds = totalSteps * secondsPerStep + tailSeconds;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);

  // Mirror the live master chain, limiter included, so a render sounds like
  // what you heard rather than hard-clipping where playback would not.
  const master = ctx.createGain();
  master.gain.value = 0.7;
  const safety = createSoftClip(ctx);
  master.connect(safety.input);
  safety.output.connect(ctx.destination);
  const engine = offlineEngine(ctx, master);
  const scale = new Scale(song.key, song.scaleName);

  const instruments = new Map<string, GraphInstrument>();
  for (const track of song.tracks) {
    const graph = song.instruments[track.instrumentId] ?? presetGraph('default');
    const instrument = new GraphInstrument(engine, track.id, graph, track.polyphony);
    instrument.setLevel(track.level);
    instruments.set(track.id, instrument);
  }

  // Schedule every note up front. There is no clock to wait for offline — the
  // whole arrangement is written onto the timeline before rendering starts.
  for (let step = 0; step < totalSteps; ++step) {
    const position = positionAt(song, step);
    if (!position) continue;
    const pattern = findPattern(song, song.order[position.orderIndex]);
    if (!pattern) continue;

    const time = step * secondsPerStep;
    for (const track of song.tracks) {
      if (!isAudible(song, track)) continue;
      const slot = pattern.lanes[track.id]?.steps[position.row];
      if (!slot) continue;
      instruments.get(track.id)?.noteOn({
        time,
        index: scale.indexAt(slot.degree),
        holdSeconds: secondsPerStep * track.gate,
        velocity: slot.velocity ?? 0.9,
      });
    }
  }

  return ctx.startRendering();
}

/** Interleaves and encodes an AudioBuffer as 16-bit PCM in a WAV container. */
export function encodeWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const bytesPerSample = 2;
  const dataBytes = frames * channels * bytesPerSample;
  const view = new DataView(new ArrayBuffer(44 + dataBytes));

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; ++i) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);          // PCM header size
  view.setUint16(20, 1, true);           // format: PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);          // bits per sample
  writeText(36, 'data');
  view.setUint32(40, dataBytes, true);

  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < frames; ++i) {
    for (let c = 0; c < channels; ++c) {
      // Clamp before scaling: a sample above full scale would wrap to the
      // opposite sign and read as a loud click rather than as clipping.
      const sample = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([view.buffer], { type: 'audio/wav' });
}

export async function bounceToWav(song: Song, options?: BounceOptions): Promise<Blob> {
  return encodeWav(await renderSong(song, options));
}
