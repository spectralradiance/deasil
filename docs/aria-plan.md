# Aria — project plan

A browser-based music tracker for deasil.org/programs/aria. Scale-aware melody
generation (Sonic Pi), a modular instrument built from a node graph (SunVox),
step sequencing, looping, and visualization.

---

## 1. Design position

Three influences pull in different directions; picking a center keeps scope sane.

| Influence | What to take | What to leave |
|---|---|---|
| **Sonic Pi / DJ Dave** | Music *theory* as a first-class primitive — scales, degrees, algorithmic phrase generation, live parameter tweaks while the loop runs | The Ruby runtime and the live-coding text buffer (see §7, phase 6) |
| **SunVox** | Instruments as a patchable node graph; modules are cheap and composable | Its full module count (~40) and its pattern-in-a-timeline arrangement |
| **ProTracker / Renoise** | The pattern grid, keyboard-first note entry, effect columns, an order list | Sample-based instruments and .XM/.MOD format fidelity |

**Center of gravity: a *generative* tracker.** The grid is the source of truth,
but any track can be filled by a scale-aware generator you re-roll live. That is
the Sonic Pi feeling without building a language sandbox.

---

## 2. Technology decisions

### Existing stack (no change)

Next.js 15 App Router · React 19 · TypeScript · MUI 7 · Emotion.
Aria is a client component tree under `src/app/programs/aria/`, following the
`sundial` convention (`lib/` for pure logic, subfolders for UI groups).

### Audio: raw Web Audio API, **not** Tone.js

The prototype uses Tone.js. Recommend dropping it.

- The instrument editor *is* a Web Audio graph editor. Tone wraps nodes in its
  own objects, so every graph edge would need unwrapping (`.input` / `.output`)
  anyway — the abstraction becomes friction rather than help.
- Tone ships its own `Transport`. Running it alongside a custom lookahead
  scheduler means two clocks; using Tone's own means surrendering control of the
  one thing that most needs control.
- ~200 KB gzipped on a page that already loads MUI.
- Tone 13 (what the prototype pins) is several majors behind, and `.toMaster()`
  no longer exists in current versions — the prototype needs a rewrite regardless.

What you give up, and the replacement:

| Tone feature | Replacement |
|---|---|
| Reverb | `ConvolverNode` + a procedurally generated impulse response (noise × exponential decay, ~30 lines) |
| Delay / chorus / phaser | `DelayNode` + `GainNode` feedback + an LFO on delay time |
| Distortion | `WaveShaperNode` with a generated curve |
| Note-name → frequency | Already written in the prototype (`Note`) |
| Scheduling | A custom lookahead scheduler — needed anyway |

Deferred: `AudioWorklet` for custom DSP (wavefolder, Karplus–Strong,
sample-accurate glide). Native `OscillatorNode` + `BiquadFilterNode` +
`WaveShaperNode` cover phases 1–4. Add a worklet only when a node type demands it.

### Clock: a lookahead scheduler on a **Worker** timer

The standard pattern — a ~25 ms tick that schedules every event falling inside
the next ~100 ms against `audioContext.currentTime`, so note starts are
sample-accurate and JS jitter is absorbed.

One addition to the usual recipe: run the tick from a **Web Worker**
`setInterval`, not the main thread. Browsers throttle main-thread timers to
≥1000 ms in backgrounded tabs, which stalls the scheduler and drops notes the
moment you switch tabs. Worker timers are not throttled the same way.

### State: `useSyncExternalStore` over a plain module store

No new dependency. The audio engine owns the authoritative transport state and
React subscribes. Two channels, kept separate:

- **Song data** (patterns, instruments, order list) — low frequency, ordinary
  React state, drives re-renders.
- **Playhead position and meter levels** — 60 Hz. These must *never* pass through
  React state. Write them to a ref and drive the DOM directly (a CSS custom
  property for the active-row highlight, canvas for the scopes) from one shared
  `requestAnimationFrame` loop.

Zustand is a reasonable alternative once the store wants selectors; it is not
needed to start.

### Node graph editor: `@xyflow/react` (React Flow)

The one new dependency worth adding. Hand-rolling drag, edge routing, port
hit-testing, pan/zoom, and selection is roughly two weeks that buys nothing
unique to Aria. React Flow is headless enough to style into the deasil look. It
renders the *view* only; the graph JSON stays a plain serializable structure
that the audio layer compiles independently.

If you would rather stay dependency-free, the fallback is an SVG canvas with
absolutely positioned MUI cards as nodes and bezier `<path>` edges — a plausible
weekend, but it will keep asking for polish.

### Visualization: `<canvas>` + `AnalyserNode`

`getByteTimeDomainData` for the oscilloscope, `getByteFrequencyData` for the
spectrum. One rAF loop paints every visualizer. No charting library — these are
per-frame redraws, not data viz.

### Persistence

1. **localStorage** — autosave the working song, restore on load (matching the existing `sundial-*` key convention).
2. **JSON import/export** — an `.aria.json` download/upload. The song is already a serializable object.
3. **URL sharing** — the `altar/reading-url.ts` pattern, but songs are far larger than readings. Only feasible with a compact encoding (short keys, deltas, base64url) and realistically only for a single pattern, not a full song. Stretch.

### Other candidates, decided

| | Decision |
|---|---|
| Web MIDI API (hardware keyboard in) | Phase 6 stretch — cheap to add, Chrome/Edge only |
| MIDI file export | Stretch; the note model already carries everything needed |
| Audio export | `OfflineAudioContext` re-render to a WAV blob. This works *because* the engine is pure — a concrete payoff from the separation in §3 |
| Sample-based instruments | Out of scope for v1. The graph model leaves room for an `AudioBufferSourceNode` node type later |

---

## 3. Architecture

Non-negotiable rule: **`audio/` and `lib/` import nothing from React.** No hooks,
no dependence on the render lifecycle. Everything there is constructible,
testable, and re-runnable inside an `OfflineAudioContext`.

```
src/app/programs/aria/
  page.tsx                 // composition + shared song state
  lib/                     // pure; no Web Audio, no React
    note.ts                // Note  (ported from the prototype)
    scale.ts               // Scale, Scale.patterns
    tuning.ts              // degree/index -> frequency, incl. non-12-TET
    song.ts                // Song / Pattern / Track / Step types
    generate.ts            // seeded melody + rhythm generators
    serialize.ts           // save / load / migrate
  audio/                   // pure TS; Web Audio only
    AudioEngine.ts         // AudioContext lifecycle, unlock, master bus
    Scheduler.ts           // worker-driven lookahead loop
    clock.worker.ts
    InstrumentGraph.ts     // graph JSON -> Web Audio nodes
    Voice.ts               // one polyphonic voice + ADSR
    VoicePool.ts           // allocation, stealing, release
    nodes/                 // node type registry (params, ports, factory)
    Analysers.ts
  components/
    Transport.tsx          // play/stop, BPM, loop range, octave
    PatternGrid.tsx        // the tracker matrix
    PatternRow.tsx         // memoized
    OrderList.tsx          // song arrangement
    GeneratorPanel.tsx     // scale, key, bounds, re-roll
    instrument/
      GraphEditor.tsx      // React Flow canvas
      NodeInspector.tsx    // params for the selected node
      nodeviews/           // one small component per node type
    visualizers/
      Oscilloscope.tsx
      Spectrum.tsx
      Meters.tsx
```

### Data model

```ts
type Step = {
  degree: number | null;     // scale degree, not semitone — the Sonic Pi bit
  octave?: number;
  off?: true;                // note-off
  instrument?: string;
  velocity?: number;         // 0..1
  fx?: { code: string; param: number }[];
};

type Track   = { id: string; name: string; steps: (Step | null)[]; instrument: string; mute: boolean; solo: boolean };
type Pattern = { id: string; length: number; tracks: Track[] };          // length 16 / 32 / 64 / 128
type Song    = {
  bpm: number; ppq: number;
  key: string; scale: keyof typeof Scale.patterns;   // global, overridable per track
  patterns: Pattern[];
  order: string[];                                    // pattern ids, in play order
  instruments: Record<string, InstrumentGraph>;
};
```

Storing **scale degrees rather than semitones** is what makes the whole thing
generative: change the key or the scale and every existing pattern transposes
into the new mode. Semitone is the derived value, computed at schedule time.
Keep an explicit per-step chromatic escape hatch.

### Instrument graph

```ts
type GraphNode = { id: string; type: NodeType; params: Record<string, number | string>; pos: { x: number; y: number } };
type Edge      = { from: string; fromPort: string; to: string; toPort: string };  // toPort may be an AudioParam
type InstrumentGraph = { nodes: GraphNode[]; edges: Edge[] };
```

Two port kinds, and the distinction carries real weight:

- **audio ports** — signal, node → node.
- **modulation ports** — an output connected to an `AudioParam` (filter cutoff,
  oscillator detune, gain). This is what makes LFOs and envelopes work, and it is
  why the editor needs typed ports rather than generic ones.

**The performance-critical decision:** the graph splits at the amplitude
envelope. Everything upstream — oscillators, per-voice filters, per-voice
envelopes — is instantiated **per voice** and torn down on release, since
`OscillatorNode` is single-use by spec. Everything downstream — reverb, delay,
master filter, distortion — is built **once per instrument** and shared across
its voices. Building a convolution reverb per note would be ruinous.

Voices are pooled and reused, with oldest-voice stealing past a per-instrument
polyphony cap (start at 8).

Starting node set for v1: `oscillator` (sine/square/saw/triangle plus
`PeriodicWave`), `noise`, `gain`, `biquad` (LP/HP/BP/notch, cutoff + Q), `adsr`,
`lfo`, `waveshaper`, `delay`, `reverb`, `pan`, `output`.

### Hierarchical view

The same graph, two renderings — a free-form canvas, and a collapsed
signal-chain list (source → filter → amp → fx) for simple instruments. The list
is a *projection* of the graph, offered only when the topology is linear. Build
the canvas first; the list view is a phase-5 nicety, not a second data model.

---

## 4. Porting the prototype

`Note`, `Scale`, `Melody`, and `random_pattern` port to TypeScript nearly
unchanged and are the right foundation. Fix these on the way in:

1. **`mod()` is wrong for exact multiples.** `mod(-4, 4)` returns `4`, not `0`.
   Consequence: in `Scale.getNote`, any degree ≤ −8 in a 7-note scale indexes
   `pattern[7]`, which is `undefined`, so the frequency becomes `NaN` — silence.
   Verified: degree −7 is fine, −8 and below are broken. The prototype's default
   bounds of −5..5 hide it. Fix: `((a % b) + b) % b`.
2. **The downward scale walk consumes the wrong step sizes.** Descending from
   degree 0, `Scale.getNote` starts at `pattern[0]` when it should start at
   `pattern[length - 1]` — the interval between degree −1 and degree 0. So
   degree −1 of C major comes out as B♭ rather than B. It is right at −2, −7 and
   other points where the wrong multiset happens to sum the same, which is why
   the prototype sounds plausible. Fix: index the cumulative table by
   `mod(degree, size)` and add `floor(degree / size)` octaves.
3. **`harmonic_minor` sums to 13 semitones,** not 12: `[2,1,2,2,1,3,2]` should be
   `[2,1,2,2,1,3,1]`. Every octave of that scale drifts a semitone sharp. A test
   that each pattern spans an octave catches the whole class.
4. **`Melody.add` pushes to `this.played_notes`,** which never exists — it throws.
5. **`Melody.clone` iterates the empty local `notes` array** instead of `this.notes`, so it always returns an empty melody.
6. **`Scale.getNote` is O(n) per lookup** — precompute a cumulative-semitone table per scale.
7. `Note.frequency` hardcodes 16.352 Hz (C0) — replace with the `tuning.ts`
   function so the A4 reference and the octave division become parameters.
8. `setInterval` playback → the lookahead scheduler.

---

## 5. UI decisions worth making up front

- **Grid rendering.** DOM, not canvas — keyboard focus, accessibility, and text
  selection all come free. Memoize rows; virtualize only past ~64 visible rows.
  The playhead highlight must not be React state: set a CSS variable on the grid
  container and let one selector paint the active row.
- **Keyboard entry.** Tracker convention: `Z S X D C V G B H N J M` for the lower
  chromatic octave, `Q 2 W 3 E R 5 T 6 Y 7 U` for the upper. Arrows move, Tab
  crosses tracks, Space toggles play, Delete clears. In degree mode, number keys
  enter degrees directly.
- **Follow mode.** Auto-scroll keeping the playing row centered, toggleable —
  editing while playing is the whole point of a tracker, and auto-scroll fights it.
- **Theme.** Inherits the site's light/dark. Trackers are traditionally dense and
  monospaced; here that reads as deliberate rather than as a style break.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| Background-tab timer throttling stalls playback | Worker-based clock (§2) |
| Mobile Safari autoplay lock / silent switch | `AudioContext` created and resumed only inside a real user gesture; a visible "click to start audio" state |
| CPU load with many voices × complex graphs | Voice pooling, polyphony cap, shared FX; a node-count readout in the editor |
| React re-renders stuttering audio | Audio never depends on render; the 60 Hz path bypasses React entirely |
| Scope creep from three different inspirations | Ship the phases in order; the grid is the product, everything else is depth |
| The graph editor swallowing the schedule | React Flow rather than hand-rolled |

---

## 7. Phases

Each phase ends with something you can hear or use.

**Phase 1 — Engine skeleton. ✅ done.** `AudioEngine`, worker clock, lookahead
`Scheduler`, `tuning.ts`, ported `Note` / `Scale` with the §4 fixes. Verified
through a **scratch harness, not a route** — a standalone
`public/aria-scratch/index.html` plus a one-line esbuild bundle of `lib/` and
`audio/`. `public/` is served statically and sits outside the app tree, so no
`/programs/aria` route exists until phase 3 and the harness deletes cleanly. It
plays a metronome at a settable BPM and logs step changes.
*Deliverable: a rock-solid clock.*

**Phase 2 — Voices.** `Voice` (osc → filter → ADSR gain → master), `VoicePool`, a
hardcoded default instrument. Wire the prototype's melody generator to the
scheduler. *Deliverable: the current prototype's behavior, on the new engine, in
tune and in time.*

**Phase 3 — Tracker grid.** `Song` model, pattern grid with keyboard entry and
navigation, transport bar, per-track mute/solo, loop, follow mode, localStorage
autosave, multi-track playback. *Deliverable: the actual tracker.*

**Phase 4 — Generation.** A `GeneratorPanel` per track: scale, key, degree range,
note count, rest density, rhythm, seed. Re-roll live without stopping the loop;
"keep" commits generated notes into the pattern as editable steps.
*Deliverable: the Sonic Pi character.*

**Phase 5 — Instrument graph.** Node registry, `InstrumentGraph` compiler, React
Flow editor, node inspector, the per-voice/shared split, preset save/load,
hierarchical list view. *Deliverable: the SunVox character.*

**Phase 6 — Visualization and polish.** Oscilloscope, spectrum, per-track meters,
pattern minimap. Order list / song arrangement. JSON import/export.
`OfflineAudioContext` WAV bounce. Program icon (`/program-icons/aria.svg`), an
entry in `programs/page.tsx`, a README section.

**Stretch, in rough priority:** Web MIDI input · MIDI file export · effect-column
commands (arpeggio, portamento, retrigger) · microtonal scale division · URL
sharing of a single pattern.

**Live coding is a confirmed stretch goal, not core.** If it happens, it is a
small per-track expression field over a constrained DSL that calls the phase-4
generator API — never a JS `eval`. The design constraint this places on phase 4:
keep `generate.ts` a set of pure, seeded, individually callable functions with
plain arguments, so a DSL can later sit on top of exactly what the UI panel
drives. No other phase needs to accommodate it.

---

## 8. Phase 1 results

Measured in the harness at `/aria-scratch/`, 120 and 180 bpm, sixteenth-note steps:

| | |
|---|---|
| Step interval | 125.000 ms at 120 bpm, 83.333333 ms at 180 bpm — **0 deviation** |
| Late steps | **0** of 339 scheduled over 41 s |
| Minimum schedule lead | 50 ms, never eroded |
| Timer source | worker |
| Ported-logic assertions | 31 / 31 |

Zero deviation is structural rather than lucky: step times accumulate in the
audio clock's own float seconds, so the timer's only job is to refill the window
before it drains, and it never came within 50 ms of failing to.

One bug surfaced during testing and is fixed. `getPlayingStep()` was the only
thing retiring entries from the scheduled-step queue, and it is polled from
`requestAnimationFrame` — which browsers pause in a hidden tab. Backgrounding
the tab therefore left the queue growing for as long as playback continued.
Draining now also happens on every tick; the queue holds 0–1 entries with the UI
polling nothing at all, matching the 0.8-step lookahead.

**Deviation from the plan:** `clock.worker.ts` compiles its worker body from a
string into a Blob URL instead of being a separate bundler entry point. That way
one code path serves both Turbopack and the plain esbuild bundle the harness
uses, with no bundler configuration either side. It falls back to a main-thread
timer if `Worker` or `Blob` is unavailable, and `usesWorkerClock` reports which.

Files: `lib/{math,tuning,note,scale}.ts`, `audio/{AudioEngine,clock.worker,Scheduler}.ts`,
harness in `__scratch__/harness.ts` + `public/aria-scratch/`, built by `npm run aria:scratch`.

## 9. Next steps

1. **Phase 2:** `Voice` (osc → filter → ADSR gain → master), `VoicePool` with
   stealing, and the prototype's melody generator on the new engine.
2. `npm i @xyflow/react` before phase 5.
3. Delete `__scratch__/` and `public/aria-scratch/` at phase 3, when the real
   route replaces them.
