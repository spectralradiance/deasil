/**
 * Phase 1-2 scratch harness. Not part of the app: it bundles to
 * `public/aria-scratch/bundle.js` and is served as a static file, so no
 * /programs/aria route exists yet. Delete this directory at phase 3.
 *
 * Build:  npm run aria:scratch
 * Open:   http://localhost:3000/aria-scratch/
 */

import { AudioEngine } from '../audio/AudioEngine';
import { Scheduler, type StepEvent } from '../audio/Scheduler';
import { Instrument } from '../audio/Instrument';
import { VoicePool } from '../audio/VoicePool';
import { DEFAULT_INSTRUMENT, PRESETS, PRESET_NAMES, type InstrumentParams } from '../audio/InstrumentParams';
import { planEnvelope, valueAt } from '../audio/envelope';
import { createSoftClip, softClipCurve, SOFT_CLIP_THRESHOLD, SOFT_CLIP_CEILING } from '../audio/softclip';
import { Note } from '../lib/note';
import { Scale, SCALE_NAMES, SCALE_PATTERNS, type ScaleName } from '../lib/scale';
import { frequencyOf } from '../lib/tuning';
import { mod } from '../lib/math';
import {
  createRng,
  generatePhrase,
  generateArpeggio,
  randomSeed,
  repeatTo,
  rotate,
  transpose,
  type Phrase,
} from '../lib/generate';

const engine = new AudioEngine({ masterVolume: 0.6 });
const scheduler = new Scheduler(engine, { bpm: 110, stepsPerBeat: 4, stepCount: 16 });

let instrument: Instrument | null = null;
let mode: 'metronome' | 'phrase' = 'phrase';
let scale = new Scale('C3', 'dorian');
let phrase: Phrase = [];
let seed = 20260909;
let params: InstrumentParams = { ...DEFAULT_INSTRUMENT };

let minLead = Infinity;
let lateSteps = 0;
let scheduledSteps = 0;

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const select = (id: string) => document.getElementById(id) as HTMLSelectElement;
const num = (id: string) => parseFloat(input(id).value);

// ---- audible output --------------------------------------------------------

function click(time: number, accent: boolean): void {
  const ctx = engine.context;
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = accent ? 1600 : 900;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(accent ? 0.5 : 0.28, time + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
  osc.connect(gain);
  gain.connect(engine.destination);
  osc.start(time);
  osc.stop(time + 0.06);
}

function handleStep(event: StepEvent): void {
  const lead = event.time - engine.currentTime;
  if (lead < minLead) minLead = lead;
  if (lead < 0) lateSteps += 1;
  scheduledSteps += 1;

  if (mode === 'metronome') {
    click(event.time, event.step % scheduler.getStepsPerBeat() === 0);
    return;
  }

  if (!instrument || phrase.length === 0) return;
  const degree = phrase[mod(event.step, phrase.length)];
  if (degree === null) return;

  instrument.noteOn({
    time: event.time,
    index: scale.indexAt(degree),
    holdSeconds: event.duration * num('gate'),
    velocity: num('velocity'),
  });
}

scheduler.onStep(handleStep);

// ---- phrase ----------------------------------------------------------------

function buildPhrase(): void {
  const length = scheduler.getStepCount();
  if (select('generator').value === 'arpeggio') {
    phrase = generateArpeggio(0, length, [0, 2, 4], 2, scale.size);
  } else {
    phrase = generatePhrase({
      length,
      low: num('low'),
      high: num('high'),
      restDensity: num('rests'),
      stepwise: num('stepwise'),
      seed,
    });
  }
  renderPhrase();
}

function renderPhrase(): void {
  $('phrase').innerHTML = phrase
    .map((d, i) => {
      const label = d === null ? '·' : String(d);
      const note = d === null ? 'rest' : scale.noteAt(d).shortName;
      return `<span class="cell" data-step="${i}" title="${note}">${label}</span>`;
    })
    .join('');
  $('seed-value').textContent = String(seed);
}

// ---- readouts --------------------------------------------------------------

let paintedStep = -1;

function paint(): void {
  const step = scheduler.getPlayingStep();
  if (step !== paintedStep) {
    const cells = $('phrase').children;
    if (paintedStep >= 0 && cells[paintedStep]) cells[paintedStep].classList.remove('on');
    if (step >= 0 && cells[step]) cells[step].classList.add('on');
    paintedStep = step;
    if (step >= 0) $('step').textContent = String(step).padStart(2, '0');
  }

  const worker = scheduler.usesWorkerClock;
  $('clock').textContent =
    worker === null ? 'not started' : worker ? 'worker' : 'main thread (fallback)';
  $('lead').textContent = Number.isFinite(minLead) ? `${(minLead * 1000).toFixed(1)} ms` : '—';
  $('late').textContent = `${lateSteps} / ${scheduledSteps}`;
  $('voices').textContent = instrument
    ? `${instrument.activeVoices()} / ${instrument.polyphonyLimit}`
    : '—';
  $('stolen').textContent = instrument ? String(instrument.stolenNotes) : '—';
  requestAnimationFrame(paint);
}

function resetStats(): void {
  minLead = Infinity;
  lateSteps = 0;
  scheduledSteps = 0;
  if (instrument) instrument.stolenNotes = 0;
}

// ---- checks ----------------------------------------------------------------

interface Result { label: string; pass: boolean; detail: string }

async function runChecks(): Promise<void> {
  const results: Result[] = [];
  const check = (label: string, actual: unknown, expected: unknown) =>
    results.push({
      label,
      pass: Object.is(actual, expected),
      detail: `got ${String(actual)}, want ${String(expected)}`,
    });

  // -- phase 1: ported logic ------------------------------------------------
  check('mod(-4, 4)', mod(-4, 4), 0);
  check('mod(-1, 4)', mod(-1, 4), 3);

  const cMajor = new Scale('C0', 'major');
  check('C major degree -1 is B', cMajor.noteAt(-1).shortName, 'B-1');
  check('C major degree -7 offset', cMajor.offsetOf(-7), -12);
  check('C major degree -8 offset', cMajor.offsetOf(-8), -13);
  check('C major degree -15 offset', cMajor.offsetOf(-15), -25);
  check('C major degree 7 offset', cMajor.offsetOf(7), 12);

  for (const name of SCALE_NAMES) {
    const total = SCALE_PATTERNS[name as ScaleName].reduce((a, b) => a + b, 0);
    check(`${name} spans an octave`, total, 12);
  }

  check('C0 frequency', Math.round(frequencyOf(0) * 1000) / 1000, 16.352);
  check('A4 frequency', frequencyOf(57), 440);
  check('A4 in 24-TET', frequencyOf(114, { referenceHz: 440, division: 24 }), 440);
  check('parse F#3', Note.fromName('F#3').index, 42);
  check('parse Bb-1', Note.fromName('Bb-1').index, -2);
  check('round trip C#2', Note.fromName('C#2').shortName, 'C#2');

  // -- phase 2: envelope ----------------------------------------------------
  const amp = { attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.1 };
  const plan = planEnvelope(amp, 1, 10, 0.5);
  check('envelope: silent at onset', valueAt(plan, 10), 0);
  check('envelope: peak at attack end', +valueAt(plan, 10.01).toFixed(6), 1);
  check('envelope: sustain level held', +valueAt(plan, 10.4).toFixed(6), 0.5);
  check('envelope: silent after end', valueAt(plan, plan.endTime + 0.001), 0);
  check('envelope: ends after release', +(plan.endTime - plan.releaseTime).toFixed(6), 0.1);
  const shortPlan = planEnvelope(amp, 1, 0, 0.001);
  check('envelope: short hold covers attack+decay', +shortPlan.releaseTime.toFixed(6), 0.06);
  check(
    'envelope: monotonic through release',
    valueAt(plan, plan.releaseTime + 0.01) > valueAt(plan, plan.releaseTime + 0.09),
    true,
  );

  // -- phase 2: generator ---------------------------------------------------
  const optsA = { length: 16, low: -5, high: 5, seed: 1234, stepwise: 0.5, restDensity: 0.2 };
  check(
    'generator: same seed, same phrase',
    JSON.stringify(generatePhrase(optsA)),
    JSON.stringify(generatePhrase(optsA)),
  );
  check(
    'generator: different seed, different phrase',
    JSON.stringify(generatePhrase(optsA)) === JSON.stringify(generatePhrase({ ...optsA, seed: 5678 })),
    false,
  );
  const ranged = generatePhrase({ length: 200, low: -3, high: 4, seed: 99, stepwise: 0.8 });
  check('generator: length honoured', ranged.length, 200);
  check(
    'generator: stays in range',
    ranged.every((d) => d === null || (d >= -3 && d <= 4)),
    true,
  );
  check(
    'generator: no rests when density 0',
    generatePhrase({ length: 64, low: 0, high: 7, seed: 7 }).some((d) => d === null),
    false,
  );
  check(
    'generator: rests appear when asked',
    generatePhrase({ length: 200, low: 0, high: 7, seed: 7, restDensity: 0.5 }).some((d) => d === null),
    true,
  );
  check('generator: rng in [0,1)', createRng(1)() < 1, true);
  check('generator: arpeggio wraps octaves', JSON.stringify(generateArpeggio(0, 7, [0, 2, 4], 2, 7)),
    JSON.stringify([0, 2, 4, 7, 9, 11, 0]));
  check('generator: rotate', JSON.stringify(rotate([1, 2, 3, 4], 1)), JSON.stringify([4, 1, 2, 3]));
  check('generator: repeatTo', JSON.stringify(repeatTo([1, 2], 5)), JSON.stringify([1, 2, 1, 2, 1]));
  check('generator: transpose skips rests',
    JSON.stringify(transpose([0, null, 2], 3)), JSON.stringify([3, null, 5]));

  // -- phase 2: voice pool --------------------------------------------------
  const octx = new OfflineAudioContext(1, 44100, 4410);
  const bus = octx.createGain();
  const pool = new VoicePool(octx, bus, 2);
  const first = pool.allocate(0);
  first.voice.play(DEFAULT_INSTRUMENT, 440, 0, 1);
  const second = pool.allocate(0);
  second.voice.play(DEFAULT_INSTRUMENT, 440, 0, 1);
  const third = pool.allocate(0);
  check('pool: first allocation is free', first.stolen, false);
  check('pool: second allocation is free', second.stolen, false);
  check('pool: distinct voices', first.voice.serial === second.voice.serial, false);
  check('pool: third steals', third.stolen, true);
  check('pool: steals the oldest', third.voice.serial, first.voice.serial);
  check('pool: reports active voices', pool.activeCount(0), 2);
  check('pool: voices free after their tail', pool.activeCount(100), 0);

  // -- phase 2: offline render ----------------------------------------------
  // Renders real notes through the same chain an Instrument uses and inspects
  // the samples. This is the click test and the clipping test.
  const renderPatch = async (patch: InstrumentParams, hold: number) => {
    const render = new OfflineAudioContext(1, 44100, 22050);
    const bus = render.createGain();
    const safety = createSoftClip(render);
    bus.connect(safety.input);
    safety.output.connect(render.destination);
    const renderPool = new VoicePool(render, bus, 1);
    renderPool.allocate(0).voice.play(patch, 220, 0, hold);
    const samples = (await render.startRendering()).getChannelData(0);
    let peak = 0;
    for (let i = 0; i < samples.length; ++i) peak = Math.max(peak, Math.abs(samples[i]));
    return { samples, peak, tail: Math.abs(samples[samples.length - 1]) };
  };

  const normal = await renderPatch(DEFAULT_INSTRUMENT, 0.2);
  check('render: produces sound', normal.peak > 0.05, true);
  check('render: no click at onset', Math.abs(normal.samples[0]) < 0.001, true);
  check('render: decays to near silence', normal.tail < 0.01, true);
  check('render: never clips', normal.peak <= 1, true);

  // A deliberately hot patch: square through a Q=20 lowpass reached 2.37 full
  // scale before the safety stage existed.
  const hot = await renderPatch(
    {
      ...DEFAULT_INSTRUMENT,
      waveform: 'square',
      gain: 1,
      filter: { type: 'lowpass', cutoff: 1200, q: 20, envelopeAmount: 0 },
    },
    0.2,
  );
  check('render: hot patch stays under full scale', hot.peak <= 1, true);
  check('render: hot patch is still loud', hot.peak > 0.8, true);

  // The limiter must be exactly transparent for ordinary levels.
  const curve = softClipCurve();
  const atThreshold = curve[Math.round(((SOFT_CLIP_THRESHOLD / 4 + 1) / 2) * (curve.length - 1))];
  check('softclip: transparent below threshold', Math.abs(atThreshold - SOFT_CLIP_THRESHOLD) < 0.002, true);
  // Float32Array rounds 0.99 up to 0.99000001, so compare with float32 epsilon.
  check('softclip: bounded at the ceiling', curve[curve.length - 1] <= SOFT_CLIP_CEILING + 1e-6, true);
  check('softclip: ceiling leaves oversampling margin', SOFT_CLIP_CEILING < 1, true);
  check('softclip: monotonic', curve.every((v, i) => i === 0 || v >= curve[i - 1]), true);

  // -- report ---------------------------------------------------------------
  const failed = results.filter((r) => !r.pass);
  $('checks').innerHTML = results
    .map(
      (r) =>
        `<div class="${r.pass ? 'ok' : 'bad'}">${r.pass ? '✓' : '✗'} ${r.label}` +
        `${r.pass ? '' : ` — ${r.detail}`}</div>`,
    )
    .join('');
  $('checks-summary').textContent =
    failed.length === 0 ? `all ${results.length} passed` : `${failed.length} of ${results.length} FAILED`;
  $('checks-summary').className = failed.length === 0 ? 'ok' : 'bad';
}

// ---- instrument params -----------------------------------------------------

function readParams(): InstrumentParams {
  return {
    waveform: select('waveform').value as OscillatorType,
    detune: 0,
    spread: num('spread'),
    filter: {
      type: select('filtertype').value as BiquadFilterType,
      cutoff: num('cutoff'),
      q: num('q'),
      envelopeAmount: num('filterenv'),
    },
    amp: {
      attack: num('attack'),
      decay: num('decay'),
      sustain: num('sustain'),
      release: num('release'),
    },
    gain: num('gain'),
  };
}

function writeParams(p: InstrumentParams): void {
  select('waveform').value = p.waveform;
  input('spread').value = String(p.spread);
  select('filtertype').value = p.filter.type;
  input('cutoff').value = String(p.filter.cutoff);
  input('q').value = String(p.filter.q);
  input('filterenv').value = String(p.filter.envelopeAmount);
  input('attack').value = String(p.amp.attack);
  input('decay').value = String(p.amp.decay);
  input('sustain').value = String(p.amp.sustain);
  input('release').value = String(p.amp.release);
  input('gain').value = String(p.gain);
  syncParamLabels();
}

function syncParamLabels(): void {
  const show = (id: string, suffix = '') => {
    const el = document.getElementById(`${id}-value`);
    if (el) el.textContent = `${input(id).value}${suffix}`;
  };
  show('cutoff', ' Hz');
  show('q');
  show('filterenv', ' Hz');
  show('attack', ' s');
  show('decay', ' s');
  show('sustain');
  show('release', ' s');
  show('gain');
  show('spread', ' ¢');
  show('gate');
  show('velocity');
  show('bpm');
  show('steps');
  show('low');
  show('high');
  show('rests');
  show('stepwise');
  show('poly');
}

function applyParams(): void {
  params = readParams();
  instrument?.setParams(params);
}

// ---- wiring ----------------------------------------------------------------

function wire(): void {
  select('scale').innerHTML = SCALE_NAMES.map((n) => `<option value="${n}">${n}</option>`).join('');
  select('scale').value = 'dorian';
  select('preset').innerHTML = PRESET_NAMES.map((n) => `<option value="${n}">${n}</option>`).join('');

  input('bpm').oninput = () => {
    scheduler.setBpm(num('bpm'));
    syncParamLabels();
  };

  input('steps').oninput = () => {
    scheduler.setStepCount(parseInt(input('steps').value, 10));
    syncParamLabels();
    buildPhrase();
  };

  input('poly').oninput = () => {
    instrument?.setPolyphony(parseInt(input('poly').value, 10));
    syncParamLabels();
  };

  select('mode').onchange = () => {
    mode = select('mode').value as typeof mode;
  };

  select('preset').onchange = () => {
    writeParams(PRESETS[select('preset').value]);
    applyParams();
  };

  for (const id of ['waveform', 'filtertype']) {
    select(id).onchange = applyParams;
  }
  for (const id of ['spread', 'cutoff', 'q', 'filterenv', 'attack', 'decay', 'sustain', 'release', 'gain']) {
    input(id).oninput = () => {
      syncParamLabels();
      applyParams();
    };
  }
  for (const id of ['gate', 'velocity']) {
    input(id).oninput = syncParamLabels;
  }

  const rebuild = () => {
    syncParamLabels();
    buildPhrase();
  };
  for (const id of ['low', 'high', 'rests', 'stepwise']) {
    input(id).oninput = rebuild;
  }
  select('generator').onchange = rebuild;

  const rescale = () => {
    try {
      scale = new Scale(input('root').value || 'C3', select('scale').value as ScaleName);
      input('root').setCustomValidity('');
    } catch {
      input('root').setCustomValidity('unparseable note name');
    }
    renderPhrase();
  };
  select('scale').onchange = rescale;
  input('root').onchange = rescale;

  $('reseed').onclick = () => {
    seed = randomSeed();
    buildPhrase();
  };

  $('play').onclick = async () => {
    await engine.start();
    if (!instrument) {
      instrument = new Instrument(engine, 'lead', params, parseInt(input('poly').value, 10));
    }
    resetStats();
    scheduler.start(0);
    $('play').setAttribute('disabled', 'true');
    $('stop').removeAttribute('disabled');
  };

  $('stop').onclick = () => {
    scheduler.stop();
    instrument?.releaseAll();
    $('step').textContent = '--';
    $('play').removeAttribute('disabled');
    $('stop').setAttribute('disabled', 'true');
  };

  $('panic').onclick = () => instrument?.panic();
  $('reset-stats').onclick = resetStats;
}

wire();
writeParams(DEFAULT_INSTRUMENT);
buildPhrase();
void runChecks();
requestAnimationFrame(paint);

// Debug handle for driving the harness from the console or an automated check.
// requestAnimationFrame is paused while the tab is hidden, so the on-screen
// readouts freeze there; read these objects directly instead.
(window as unknown as Record<string, unknown>).aria = {
  engine,
  scheduler,
  get instrument() {
    return instrument;
  },
  get phrase() {
    return phrase;
  },
  get scale() {
    return scale;
  },
  stats: () => ({
    playing: scheduler.isPlaying,
    usesWorkerClock: scheduler.usesWorkerClock,
    playingStep: scheduler.getPlayingStep(),
    contextTime: engine.currentTime,
    minLeadMs: Number.isFinite(minLead) ? minLead * 1000 : null,
    lateSteps,
    scheduledSteps,
    activeVoices: instrument?.activeVoices() ?? null,
    stolenNotes: instrument?.stolenNotes ?? null,
  }),
};
