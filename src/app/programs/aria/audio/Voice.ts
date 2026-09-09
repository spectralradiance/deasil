import type { InstrumentParams } from './InstrumentParams';
import { planEnvelope, scheduleEnvelope, scheduleRelease, type EnvelopePlan } from './envelope';

/**
 * One sounding note: oscillators -> filter -> amp gain -> instrument output.
 *
 * The filter and amp nodes are created once and live for as long as the voice
 * does. Only the oscillators are rebuilt per note, because an OscillatorNode is
 * single-use by spec — `start()` may be called exactly once. That is the whole
 * reason voices are pooled rather than allocated per note: the reusable half of
 * the graph stays put and only the unavoidable part is rebuilt.
 */

let nextVoiceSerial = 0;

export class Voice {
  private readonly ctx: BaseAudioContext;
  private readonly filter: BiquadFilterNode;
  private readonly amp: GainNode;

  private oscillators: OscillatorNode[] = [];
  private plan: EnvelopePlan | null = null;
  private releaseSeconds = 0;

  /** Monotonic id, so the pool can steal the oldest voice deterministically. */
  readonly serial = nextVoiceSerial++;

  /** Context time the current note began, or -Infinity when idle. */
  startTime = -Infinity;
  /** Context time this voice becomes reusable. */
  freeAt = -Infinity;
  /** Pitch index the current note was triggered with, for note-off matching. */
  noteId: number | null = null;

  constructor(ctx: BaseAudioContext, output: AudioNode) {
    this.ctx = ctx;
    this.filter = ctx.createBiquadFilter();
    this.amp = ctx.createGain();
    this.amp.gain.value = 0;
    this.filter.connect(this.amp);
    this.amp.connect(output);
  }

  /** True while this voice is still producing sound at `time`. */
  isActive(time: number): boolean {
    return time < this.freeAt;
  }

  /**
   * Starts a note. `holdSeconds` is how long before release begins, which the
   * scheduler knows from the step length.
   */
  play(
    params: InstrumentParams,
    frequency: number,
    time: number,
    holdSeconds: number,
    velocity = 1,
  ): void {
    this.stopOscillators(time);

    // Oscillators sum, so two detuned saws at gain 0.5 would reach full scale
    // on their own. Divide the envelope peak by the count instead of adding a
    // gain node per oscillator: same result, no extra nodes per voice.
    const oscillatorCount = params.spread > 0 ? 2 : 1;
    const peak = Math.max(0, Math.min(1, params.gain * velocity)) / oscillatorCount;
    const plan = planEnvelope(params.amp, peak, time, holdSeconds);
    this.plan = plan;
    this.releaseSeconds = plan.release;
    this.startTime = time;
    this.freeAt = plan.endTime;

    this.filter.type = params.filter.type;
    this.filter.Q.cancelScheduledValues(time);
    this.filter.Q.setValueAtTime(Math.max(0.0001, params.filter.q), time);
    this.scheduleFilter(params, plan);

    scheduleEnvelope(this.amp.gain, plan);

    const detunes = params.spread > 0
      ? [params.detune - params.spread, params.detune + params.spread]
      : [params.detune];

    this.oscillators = detunes.map((detune) => {
      const osc = this.ctx.createOscillator();
      osc.type = params.waveform;
      osc.frequency.setValueAtTime(frequency, time);
      osc.detune.setValueAtTime(detune, time);
      osc.connect(this.filter);
      osc.start(time);
      // A little tail past the envelope end so the stop never truncates a ramp.
      osc.stop(plan.endTime + 0.01);
      return osc;
    });
  }

  /**
   * Releases early — a note-off arriving before the planned release, or a
   * steal. Returns the time the voice falls silent.
   */
  release(time: number): number {
    if (!this.plan) return time;
    const end = scheduleRelease(this.amp.gain, this.plan, time, this.releaseSeconds);
    this.freeAt = end;
    for (const osc of this.oscillators) {
      try {
        osc.stop(end + 0.01);
      } catch {
        // Already stopped; harmless.
      }
    }
    return end;
  }

  /**
   * Steals the voice for a new note: a fast fade rather than the instrument's
   * release, so the incoming note is not delayed. `fadeSeconds` should stay
   * short enough to be inaudible but long enough to avoid a click.
   */
  steal(time: number, fadeSeconds = 0.006): number {
    if (!this.plan) return time;
    const end = scheduleRelease(this.amp.gain, this.plan, time, fadeSeconds);
    this.freeAt = end;
    for (const osc of this.oscillators) {
      try {
        osc.stop(end + 0.005);
      } catch {
        // Already stopped; harmless.
      }
    }
    return end;
  }

  /** Cuts the voice off immediately, without a ramp. For transport stop. */
  kill(time: number): void {
    this.amp.gain.cancelScheduledValues(time);
    this.amp.gain.setValueAtTime(0, time);
    this.stopOscillators(time);
    this.plan = null;
    this.noteId = null;
    this.startTime = -Infinity;
    this.freeAt = -Infinity;
  }

  dispose(): void {
    this.stopOscillators(this.ctx.currentTime);
    this.filter.disconnect();
    this.amp.disconnect();
  }

  /**
   * Sweeps the cutoff up by `envelopeAmount` over the attack and back down
   * over the decay. Cheaper and easier to reason about than routing a second
   * envelope generator, and it is the shape a subtractive patch usually wants.
   */
  private scheduleFilter(params: InstrumentParams, plan: EnvelopePlan): void {
    const { cutoff, envelopeAmount } = params.filter;
    const nyquist = this.ctx.sampleRate / 2;
    const base = Math.max(20, Math.min(cutoff, nyquist - 1));
    const param = this.filter.frequency;

    param.cancelScheduledValues(plan.startTime);
    if (envelopeAmount === 0) {
      param.setValueAtTime(base, plan.startTime);
      return;
    }
    const top = Math.max(20, Math.min(base + envelopeAmount, nyquist - 1));
    param.setValueAtTime(base, plan.startTime);
    param.linearRampToValueAtTime(top, plan.startTime + plan.attack);
    param.exponentialRampToValueAtTime(base, plan.startTime + plan.attack + plan.decay);
  }

  private stopOscillators(time: number): void {
    for (const osc of this.oscillators) {
      try {
        osc.stop(time);
      } catch {
        // Never started, or already stopped.
      }
      osc.disconnect();
    }
    this.oscillators = [];
  }
}
