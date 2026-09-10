/**
 * Output safety stage.
 *
 * A resonant filter is a gain stage: a lowpass at Q=6 pushed the default patch
 * to 1.42 full scale, and a square wave through Q=20 reached 2.37. Left alone
 * that hard-clips at the destination, which sounds like tearing rather than
 * like a loud synth. Normalising per-oscillator level fixes the summing half of
 * the problem but not resonance, because resonance is the point.
 *
 * So the instrument bus ends in a curve that is exactly linear below
 * `threshold` — normal playing passes through bit-for-bit untouched — and bends
 * asymptotically toward full scale above it. Nothing can leave an instrument
 * above 1.0, whatever the patch.
 *
 * A WaveShaperNode clamps its lookup to [-1, 1], so a curve written directly
 * over that range would flatten anything louder into a hard corner at 1. The
 * pre-gain of 1/headroom is what maps a signal several times full scale into
 * the curve's domain, letting the bend do its work.
 */

export const SOFT_CLIP_THRESHOLD = 0.7;
export const SOFT_CLIP_HEADROOM = 4;
/**
 * The curve's asymptote. Not 1.0, because the 2x oversampling filter rings
 * slightly around the bend and overshoots its input by about 0.3% — measured,
 * not theoretical. Leaving 1% of margin keeps the "nothing exceeds full scale"
 * guarantee true of what actually reaches the master bus. The linear region is
 * deliberately not scaled, so ordinary levels stay bit-exact.
 */
export const SOFT_CLIP_CEILING = 0.99;

/**
 * Samples the limiter curve across an input range of ±`headroom`.
 * Below `threshold` the mapping is the identity.
 */
export function softClipCurve(
  length = 4096,
  threshold = SOFT_CLIP_THRESHOLD,
  headroom = SOFT_CLIP_HEADROOM,
  ceiling = SOFT_CLIP_CEILING,
): Float32Array<ArrayBuffer> {
  // Backed by an explicit ArrayBuffer: WaveShaperNode.curve will not accept a
  // Float32Array over the wider ArrayBufferLike that the bare constructor gives.
  const curve = new Float32Array(new ArrayBuffer(length * Float32Array.BYTES_PER_ELEMENT));
  const knee = ceiling - threshold;
  for (let i = 0; i < length; ++i) {
    // x spans [-1, 1]; u is the real signal level it stands for.
    const x = (i / (length - 1)) * 2 - 1;
    const u = x * headroom;
    const magnitude = Math.abs(u);
    const shaped =
      magnitude <= threshold
        ? magnitude
        : threshold + knee * Math.tanh((magnitude - threshold) / knee);
    curve[i] = Math.sign(u) * shaped;
  }
  return curve;
}

export interface SoftClip {
  /** Connect the instrument bus here. */
  input: GainNode;
  /** Connect this to the master bus. */
  output: WaveShaperNode;
  disconnect(): void;
}

export function createSoftClip(
  ctx: BaseAudioContext,
  headroom = SOFT_CLIP_HEADROOM,
): SoftClip {
  const input = ctx.createGain();
  input.gain.value = 1 / headroom;

  const shaper = ctx.createWaveShaper();
  shaper.curve = softClipCurve(4096, SOFT_CLIP_THRESHOLD, headroom, SOFT_CLIP_CEILING);
  // The bend generates harmonics; oversampling keeps them from aliasing back.
  shaper.oversample = '2x';

  input.connect(shaper);

  return {
    input,
    output: shaper,
    disconnect() {
      input.disconnect();
      shaper.disconnect();
    },
  };
}
