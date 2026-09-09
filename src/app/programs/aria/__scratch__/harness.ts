/**
 * Phase 1 scratch harness. Not part of the app: it bundles to
 * `public/aria-scratch/bundle.js` and is served as a static file, so no
 * /programs/aria route exists yet. Delete this directory at phase 3.
 *
 * Build:  npm run aria:scratch
 * Open:   http://localhost:3000/aria-scratch/
 */

import { AudioEngine } from '../audio/AudioEngine';
import { Scheduler, type StepEvent } from '../audio/Scheduler';
import { Note } from '../lib/note';
import { Scale, SCALE_NAMES, SCALE_PATTERNS, type ScaleName } from '../lib/scale';
import { frequencyOf, TWELVE_TET } from '../lib/tuning';
import { mod } from '../lib/math';

const engine = new AudioEngine({ masterVolume: 0.6 });
const scheduler = new Scheduler(engine, { bpm: 120, stepsPerBeat: 4, stepCount: 16 });

let mode: 'metronome' | 'scale' = 'metronome';
let scale = new Scale('C3', 'major');

/** Smallest gap seen between a step being scheduled and it becoming audible. */
let minLead = Infinity;
let lateSteps = 0;
let scheduledSteps = 0;

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const select = (id: string) => document.getElementById(id) as HTMLSelectElement;

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

function tone(time: number, frequency: number, duration: number): void {
  const ctx = engine.context;
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = frequency;
  const end = time + Math.min(duration * 0.9, 0.4);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.3, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain);
  gain.connect(engine.destination);
  osc.start(time);
  osc.stop(end + 0.01);
}

function handleStep(event: StepEvent): void {
  const lead = event.time - engine.currentTime;
  if (lead < minLead) minLead = lead;
  if (lead < 0) lateSteps += 1;
  scheduledSteps += 1;

  if (mode === 'metronome') {
    click(event.time, event.step % scheduler.getStepsPerBeat() === 0);
  } else {
    // Walk the scale up and back down, crossing degree 0 in both directions so
    // the negative-degree path is exercised audibly.
    const span = 15;
    const position = mod(event.step, span * 2);
    const degree = (position <= span ? position : span * 2 - position) - 7;
    tone(event.time, scale.noteAt(degree).frequency(TWELVE_TET), event.duration);
  }
}

scheduler.onStep(handleStep);

function paint(): void {
  const step = scheduler.getPlayingStep();
  if (step >= 0) $('step').textContent = String(step).padStart(2, '0');
  const worker = scheduler.usesWorkerClock;
  $('clock').textContent =
    worker === null ? 'not started' : worker ? 'worker' : 'main thread (fallback)';
  $('lead').textContent = Number.isFinite(minLead) ? `${(minLead * 1000).toFixed(1)} ms` : '—';
  $('late').textContent = `${lateSteps} / ${scheduledSteps}`;
  $('ctxtime').textContent = engine.currentTime.toFixed(2);
  requestAnimationFrame(paint);
}

function resetStats(): void {
  minLead = Infinity;
  lateSteps = 0;
  scheduledSteps = 0;
}

/** Assertions covering the bugs fixed while porting the prototype. */
function runChecks(): void {
  const results: { label: string; pass: boolean; detail: string }[] = [];
  const check = (label: string, actual: unknown, expected: unknown) =>
    results.push({
      label,
      pass: Object.is(actual, expected),
      detail: `got ${String(actual)}, want ${String(expected)}`,
    });

  check('mod(-4, 4)', mod(-4, 4), 0);
  check('mod(-1, 4)', mod(-1, 4), 3);

  const cMajor = new Scale('C0', 'major');
  check('C major degree -1 is B', cMajor.noteAt(-1).shortName, 'B-1');
  check('C major degree -7 offset', cMajor.offsetOf(-7), -12);
  check('C major degree -8 offset', cMajor.offsetOf(-8), -13);
  check('C major degree -15 offset', cMajor.offsetOf(-15), -25);
  check('C major degree 7 offset', cMajor.offsetOf(7), 12);

  for (const name of SCALE_NAMES) {
    const pattern = SCALE_PATTERNS[name as ScaleName];
    const total = pattern.reduce((a, b) => a + b, 0);
    check(`${name} spans an octave`, total, 12);
  }

  check('C0 frequency', Math.round(frequencyOf(0) * 1000) / 1000, 16.352);
  check('A4 frequency', frequencyOf(57), 440);
  check('A4 in 24-TET', frequencyOf(114, { referenceHz: 440, division: 24 }), 440);
  check('parse F#3', Note.fromName('F#3').index, 42);
  check('parse Bb-1', Note.fromName('Bb-1').index, -2);
  check('round trip C#2', Note.fromName('C#2').shortName, 'C#2');

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

function wire(): void {
  const scaleSelect = select('scale');
  scaleSelect.innerHTML = SCALE_NAMES.map((n) => `<option value="${n}">${n}</option>`).join('');
  scaleSelect.value = 'major';

  input('bpm').oninput = () => {
    const bpm = parseFloat(input('bpm').value);
    scheduler.setBpm(bpm);
    $('bpm-value').textContent = `${bpm}`;
  };

  input('steps').oninput = () => {
    const count = parseInt(input('steps').value, 10);
    scheduler.setStepCount(count);
    $('steps-value').textContent = `${count}`;
  };

  select('mode').onchange = () => {
    mode = select('mode').value as typeof mode;
  };

  scaleSelect.onchange = () => {
    scale = new Scale(input('root').value || 'C3', scaleSelect.value as ScaleName);
  };

  input('root').onchange = () => {
    try {
      scale = new Scale(input('root').value, scaleSelect.value as ScaleName);
      input('root').setCustomValidity('');
    } catch {
      input('root').setCustomValidity('unparseable note name');
    }
  };

  $('play').onclick = async () => {
    await engine.start();
    resetStats();
    scheduler.start(0);
    $('play').setAttribute('disabled', 'true');
    $('stop').removeAttribute('disabled');
  };

  $('stop').onclick = () => {
    scheduler.stop();
    $('step').textContent = '--';
    $('play').removeAttribute('disabled');
    $('stop').setAttribute('disabled', 'true');
  };

  $('reset-stats').onclick = resetStats;
}

wire();
runChecks();
requestAnimationFrame(paint);

// Debug handle for driving the harness from the console or an automated check.
// requestAnimationFrame is paused while the tab is hidden, so the on-screen
// readouts freeze there; read these objects directly instead.
(window as unknown as Record<string, unknown>).aria = {
  engine,
  scheduler,
  stats: () => ({
    playing: scheduler.isPlaying,
    usesWorkerClock: scheduler.usesWorkerClock,
    playingStep: scheduler.getPlayingStep(),
    contextTime: engine.currentTime,
    minLeadMs: Number.isFinite(minLead) ? minLead * 1000 : null,
    lateSteps,
    scheduledSteps,
  }),
};
