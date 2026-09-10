import type { AmpEnvelopeParams } from './InstrumentParams';

/**
 * ADSR scheduling and, crucially, the analytic value of the curve at any time.
 *
 * The whole envelope is scheduled at note-on, which a tracker can do because
 * it knows how long a note lasts before it starts. That keeps everything
 * sample-accurate and needs no polling.
 *
 * Interrupting a note early is the awkward case: to ramp down from wherever the
 * curve currently sits you have to know that value, and `cancelAndHoldAtTime`
 * is not available in Firefox. Since we scheduled the curve ourselves and it is
 * fully deterministic, `valueAt` recomputes it instead — no browser support
 * required, and it works for a time in the future as well as the present.
 */

/** Exponential ramps cannot reach zero, so silence is this instead. */
export const SILENCE = 0.0001;

export interface EnvelopePlan {
  startTime: number;
  peak: number;
  attack: number;
  decay: number;
  /** Absolute level held during sustain, already scaled by `peak`. */
  sustainLevel: number;
  release: number;
  /** Absolute time the release ramp begins. */
  releaseTime: number;
  /** Absolute time the envelope reaches silence. */
  endTime: number;
}

function exponentialAt(v0: number, v1: number, t: number): number {
  const from = Math.max(v0, SILENCE);
  const to = Math.max(v1, SILENCE);
  return from * Math.pow(to / from, t);
}

/**
 * Builds the plan for a note starting at `startTime` and held for
 * `holdSeconds` before release. The hold is stretched to at least cover attack
 * and decay, so a very short step never clips the front of the envelope.
 */
export function planEnvelope(
  params: AmpEnvelopeParams,
  peak: number,
  startTime: number,
  holdSeconds: number,
): EnvelopePlan {
  const attack = Math.max(params.attack, 0.001);
  const decay = Math.max(params.decay, 0.001);
  const release = Math.max(params.release, 0.005);
  const sustainLevel = Math.max(0, Math.min(1, params.sustain)) * peak;
  const hold = Math.max(holdSeconds, attack + decay);
  const releaseTime = startTime + hold;

  return {
    startTime,
    peak,
    attack,
    decay,
    sustainLevel,
    release,
    releaseTime,
    endTime: releaseTime + release,
  };
}

/** Level of the planned curve at an absolute time. */
export function valueAt(plan: EnvelopePlan, time: number): number {
  const { startTime, peak, attack, decay, sustainLevel, release, releaseTime } = plan;
  if (time <= startTime) return 0;

  const attackEnd = startTime + attack;
  if (time < attackEnd) return peak * ((time - startTime) / attack);

  const decayEnd = attackEnd + decay;
  if (time < decayEnd) {
    return exponentialAt(peak, sustainLevel, (time - attackEnd) / decay);
  }

  if (time < releaseTime) return Math.max(sustainLevel, SILENCE);

  const releaseEnd = releaseTime + release;
  if (time < releaseEnd) {
    return exponentialAt(Math.max(sustainLevel, SILENCE), 0, (time - releaseTime) / release);
  }
  return 0;
}

/**
 * Writes the full curve onto a gain AudioParam. Linear on the way up so it can
 * start from true zero, exponential on the way down because that is how
 * amplitude decay is heard.
 */
export function scheduleEnvelope(param: AudioParam, plan: EnvelopePlan): void {
  const { startTime, peak, attack, decay, sustainLevel, release, releaseTime, endTime } = plan;
  const attackEnd = startTime + attack;
  const decayEnd = attackEnd + decay;

  param.cancelScheduledValues(startTime);
  param.setValueAtTime(0, startTime);
  param.linearRampToValueAtTime(peak, attackEnd);
  param.exponentialRampToValueAtTime(Math.max(sustainLevel, SILENCE), decayEnd);
  param.setValueAtTime(Math.max(sustainLevel, SILENCE), releaseTime);
  param.exponentialRampToValueAtTime(SILENCE, releaseTime + release);
  // Exponential ramps only approach zero, so cut the last sliver off flat.
  param.setValueAtTime(0, endTime);
}

/**
 * Cuts a sounding note short: ramps from wherever the curve sits at `time`
 * down to silence over `release` seconds. Returns the time silence is reached.
 */
export function scheduleRelease(
  param: AudioParam,
  plan: EnvelopePlan,
  time: number,
  release: number,
): number {
  const from = Math.max(valueAt(plan, time), SILENCE);
  const end = time + Math.max(release, 0.005);
  param.cancelScheduledValues(time);
  param.setValueAtTime(from, time);
  param.exponentialRampToValueAtTime(SILENCE, end);
  param.setValueAtTime(0, end);
  return end;
}
