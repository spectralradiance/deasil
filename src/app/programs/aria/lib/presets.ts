import { presetGraph } from '../audio/graph-presets';
import { mod } from './math';
import {
  DEFAULT_GENERATOR, createLane, createPattern, createTrack, regenerateLiveLanes,
  type Lane, type Song, type StepSlot, type TrackGenerator,
} from './song';

/**
 * Whole songs to start from.
 *
 * Each one exists to put a different corner of the program on screen: a mode
 * you would not have picked, a tempo the default never reaches, patches wired
 * in ways the starting song does not use, generators set somewhere other than
 * the middle of their ranges. Loading one should feel like opening someone
 * else's session, not like a slightly different blank page.
 *
 * Two ways of writing a lane appear here, and the difference matters. A
 * **live** lane stores generator settings and no notes: its steps are rolled
 * from the seed, so the sliders in the generator panel are live controls over
 * something you can hear. An **authored** lane stores notes and turns the
 * generator off, because a riff written on purpose should survive a mode
 * change rather than be re-rolled by it. Basslines and pad stabs are authored;
 * leads, arpeggios and percussion are generated.
 */

export interface SongPreset {
  name: string;
  /** One line, shown beside the name in the picker. */
  description: string;
  build: () => Song;
}

/** A lane whose notes are rolled from its settings, and stay rolled. */
function live(stepCount: number, generator: Partial<TrackGenerator>): Lane {
  return createLane(stepCount, {
    generator: { ...DEFAULT_GENERATOR, ...generator, live: true },
  });
}

/**
 * A lane written by hand. `phrase` repeats to fill the pattern, so a four-step
 * figure can be given once. `null` is a rest.
 */
function authored(stepCount: number, phrase: (number | null)[]): Lane {
  const steps: StepSlot[] = Array.from({ length: stepCount }, (_, i) => {
    const degree = phrase[mod(i, Math.max(1, phrase.length))];
    return degree === null || degree === undefined ? null : { degree };
  });
  return createLane(stepCount, {
    steps,
    generator: { ...DEFAULT_GENERATOR, live: false },
  });
}

/** Every `n`th step carries `degree`, the rest rest. */
function pulse(stepCount: number, n: number, degree: number, offset = 0): (number | null)[] {
  return Array.from({ length: stepCount }, (_, i) => (mod(i - offset, n) === 0 ? degree : null));
}

/**
 * Materialises the live lanes so a freshly loaded preset already holds notes.
 * Without it a live lane would sit empty until something nudged the generator,
 * which reads as a song that failed to load.
 */
function rolled(song: Song): Song {
  return regenerateLiveLanes(song);
}

// ---- the presets ------------------------------------------------------------

/** Synthwave: a driving sub, a brass lead over it, arcade arpeggios on top. */
function neonGrid(): Song {
  const steps = 16;
  const tracks = [
    createTrack('lead', 'brass', { gate: 0.9, polyphony: 4 }),
    createTrack('arp', 'arcade', { gate: 0.5, level: 0.5, polyphony: 4 }),
    createTrack('sub', 'sub', { gate: 0.95, level: 0.85, polyphony: 1 }),
    createTrack('hat', 'hat', { gate: 0.3, level: 0.35, polyphony: 2 }),
  ];
  const [lead, arp, sub, hat] = tracks.map((t) => t.id);
  const ids = tracks.map((t) => t.id);

  const a = createPattern('A', steps, ids, {
    [lead]: live(steps, { pitch: 'walk', rhythm: 'euclidean', pulses: 5, low: 0, high: 7, stepwise: 0.85, seed: 7714 }),
    [arp]: live(steps, { pitch: 'arpeggio', rhythm: 'every', low: 7, high: 14, seed: 31 }),
    [sub]: authored(steps, [-7, null, null, -7, null, -7, null, null]),
    [hat]: live(steps, { pitch: 'drone', rhythm: 'euclidean', pulses: 11, low: 0, high: 0, seed: 5 }),
  });
  const b = createPattern('B', steps, ids, {
    [lead]: live(steps, { pitch: 'walk', rhythm: 'euclidean', pulses: 7, rotation: 2, low: 2, high: 10, stepwise: 0.7, seed: 90210 }),
    [arp]: live(steps, { pitch: 'arpeggio', rhythm: 'every', low: 5, high: 12, seed: 31 }),
    [sub]: authored(steps, [-5, null, null, -5, null, -3, null, null]),
    [hat]: live(steps, { pitch: 'drone', rhythm: 'euclidean', pulses: 13, low: 0, high: 0, seed: 5 }),
  });

  return rolled({
    bpm: 118,
    stepsPerBeat: 4,
    key: 'C3',
    scaleName: 'aeolian',
    tracks,
    patterns: [a, b],
    order: [a.id, a.id, b.id, a.id],
    instruments: {
      brass: presetGraph('brass'),
      arcade: presetGraph('arcade'),
      sub: presetGraph('sub'),
      hat: presetGraph('hat'),
    },
  });
}

/** Ambient, slow, and long: 32 steps at 64bpm is nearly half a minute a pattern. */
function rainOnGlass(): Song {
  const steps = 32;
  const tracks = [
    createTrack('bells', 'bell', { gate: 4, level: 0.5, polyphony: 6 }),
    createTrack('harp', 'harp', { gate: 2, level: 0.45, polyphony: 6 }),
    createTrack('drone', 'drone', { gate: 8, level: 0.4, polyphony: 2 }),
    createTrack('air', 'choir', { gate: 6, level: 0.35, polyphony: 3 }),
  ];
  const [bells, harp, drone, air] = tracks.map((t) => t.id);
  const ids = tracks.map((t) => t.id);

  const a = createPattern('A', steps, ids, {
    // Sparse and wide: a lydian fourth landing at random is the whole mood.
    [bells]: live(steps, { pitch: 'walk', rhythm: 'random', density: 0.18, low: 3, high: 12, stepwise: 0.35, seed: 611 }),
    [harp]: live(steps, { pitch: 'walk', rhythm: 'random', density: 0.3, low: -2, high: 9, stepwise: 0.9, seed: 20422 }),
    [drone]: authored(steps, [0, ...new Array<null>(15).fill(null)]),
    [air]: authored(steps, [4, ...new Array<null>(15).fill(null), 2, ...new Array<null>(15).fill(null)]),
  });
  const b = createPattern('B', steps, ids, {
    [bells]: live(steps, { pitch: 'walk', rhythm: 'random', density: 0.22, low: 5, high: 14, stepwise: 0.3, seed: 8890 }),
    [harp]: live(steps, { pitch: 'walk', rhythm: 'random', density: 0.26, low: -4, high: 7, stepwise: 0.9, seed: 1234 }),
    [drone]: authored(steps, [-3, ...new Array<null>(15).fill(null)]),
    [air]: authored(steps, [1, ...new Array<null>(15).fill(null), 5, ...new Array<null>(15).fill(null)]),
  });

  return rolled({
    bpm: 64,
    stepsPerBeat: 4,
    key: 'D3',
    scaleName: 'lydian',
    tracks,
    patterns: [a, b],
    order: [a.id, b.id],
    instruments: {
      bell: presetGraph('bell'),
      harp: presetGraph('harp'),
      drone: presetGraph('drone'),
      choir: presetGraph('choir'),
    },
  });
}

/**
 * Four euclidean rhythms at coprime pulse counts over the same 16 steps. The
 * pattern they make together takes far longer than 16 steps to repeat, which is
 * the entire argument for the euclidean generator.
 */
function tessellate(): Song {
  const steps = 16;
  const tracks = [
    createTrack('kick', 'kick', { gate: 0.5, level: 0.9, polyphony: 1 }),
    createTrack('snare', 'snare', { gate: 0.4, level: 0.55, polyphony: 2 }),
    createTrack('hat', 'hat', { gate: 0.25, level: 0.3, polyphony: 3 }),
    createTrack('wood', 'marimba', { gate: 0.8, level: 0.6, polyphony: 4 }),
  ];
  const [kick, snare, hat, wood] = tracks.map((t) => t.id);
  const ids = tracks.map((t) => t.id);

  // 5, 7, 11 and 3 against 16: tresillo-family necklaces that drift apart.
  const a = createPattern('A', steps, ids, {
    [kick]: live(steps, { pitch: 'drone', rhythm: 'euclidean', pulses: 5, low: -7, high: -7, seed: 1 }),
    [snare]: live(steps, { pitch: 'drone', rhythm: 'euclidean', pulses: 3, rotation: 4, low: 0, high: 0, seed: 2 }),
    [hat]: live(steps, { pitch: 'drone', rhythm: 'euclidean', pulses: 11, low: 0, high: 0, seed: 3 }),
    [wood]: live(steps, { pitch: 'walk', rhythm: 'euclidean', pulses: 7, low: 0, high: 7, stepwise: 0.95, seed: 4488 }),
  });
  const b = createPattern('B', steps, ids, {
    [kick]: live(steps, { pitch: 'drone', rhythm: 'euclidean', pulses: 7, low: -7, high: -7, seed: 1 }),
    [snare]: live(steps, { pitch: 'drone', rhythm: 'euclidean', pulses: 5, rotation: 2, low: 0, high: 0, seed: 2 }),
    [hat]: live(steps, { pitch: 'drone', rhythm: 'euclidean', pulses: 13, low: 0, high: 0, seed: 3 }),
    [wood]: live(steps, { pitch: 'arpeggio', rhythm: 'euclidean', pulses: 9, low: -3, high: 7, seed: 77 }),
  });

  return rolled({
    bpm: 132,
    stepsPerBeat: 4,
    key: 'E3',
    scaleName: 'phrygian',
    tracks,
    patterns: [a, b],
    order: [a.id, a.id, b.id, b.id],
    instruments: {
      kick: presetGraph('kick'),
      snare: presetGraph('snare'),
      hat: presetGraph('hat'),
      marimba: presetGraph('marimba'),
    },
  });
}

/** Dub: a wobbling bass with all the space above it left deliberately empty. */
function deepCurrent(): Song {
  const steps = 16;
  const tracks = [
    createTrack('wobble', 'wobble', { gate: 1.6, level: 0.7, polyphony: 2 }),
    createTrack('sub', 'sub', { gate: 0.9, level: 0.8, polyphony: 1 }),
    createTrack('stab', 'organ', { gate: 0.6, level: 0.4, polyphony: 4 }),
    createTrack('tick', 'hat', { gate: 0.2, level: 0.28, polyphony: 2 }),
  ];
  const [wobble, sub, stab, tick] = tracks.map((t) => t.id);
  const ids = tracks.map((t) => t.id);

  const a = createPattern('A', steps, ids, {
    [wobble]: live(steps, { pitch: 'walk', rhythm: 'euclidean', pulses: 3, low: -7, high: -3, stepwise: 1, seed: 5150 }),
    [sub]: authored(steps, pulse(steps, 8, -7)),
    // Off the beat, which is the only thing that makes a stab a stab.
    [stab]: authored(steps, pulse(steps, 8, 4, 6)),
    [tick]: live(steps, { pitch: 'drone', rhythm: 'euclidean', pulses: 7, rotation: 1, low: 0, high: 0, seed: 9 }),
  });
  const b = createPattern('B', steps, ids, {
    [wobble]: live(steps, { pitch: 'walk', rhythm: 'euclidean', pulses: 5, rotation: 3, low: -9, high: -2, stepwise: 0.9, seed: 4040 }),
    [sub]: authored(steps, pulse(steps, 8, -5)),
    [stab]: authored(steps, pulse(steps, 8, 2, 6)),
    [tick]: live(steps, { pitch: 'drone', rhythm: 'euclidean', pulses: 9, rotation: 1, low: 0, high: 0, seed: 9 }),
  });

  return rolled({
    bpm: 88,
    stepsPerBeat: 4,
    key: 'A2',
    scaleName: 'dorian',
    tracks,
    patterns: [a, b],
    order: [a.id, a.id, a.id, b.id],
    instruments: {
      wobble: presetGraph('wobble'),
      sub: presetGraph('sub'),
      organ: presetGraph('organ'),
      hat: presetGraph('hat'),
    },
  });
}

/** Everything slow and sustained, in a mode that refuses to resolve. */
function cathedral(): Song {
  const steps = 16;
  const tracks = [
    createTrack('organ', 'organ', { gate: 3.5, level: 0.55, polyphony: 6 }),
    createTrack('choir', 'choir', { gate: 6, level: 0.45, polyphony: 4 }),
    createTrack('strings', 'strings', { gate: 5, level: 0.4, polyphony: 4 }),
    createTrack('bell', 'bell', { gate: 4, level: 0.35, polyphony: 3 }),
  ];
  const [organ, choir, strings, bell] = tracks.map((t) => t.id);
  const ids = tracks.map((t) => t.id);

  const a = createPattern('A', steps, ids, {
    [organ]: authored(steps, [0, null, null, null, 4, null, null, null, 2, null, null, null, 6, null, null, null]),
    [choir]: authored(steps, [4, ...new Array<null>(7).fill(null), 6, ...new Array<null>(7).fill(null)]),
    [strings]: authored(steps, [-3, ...new Array<null>(15).fill(null)]),
    [bell]: live(steps, { pitch: 'walk', rhythm: 'random', density: 0.16, low: 7, high: 14, stepwise: 0.4, seed: 1618 }),
  });
  const b = createPattern('B', steps, ids, {
    [organ]: authored(steps, [3, null, null, null, 0, null, null, null, 5, null, null, null, 1, null, null, null]),
    [choir]: authored(steps, [1, ...new Array<null>(7).fill(null), 3, ...new Array<null>(7).fill(null)]),
    [strings]: authored(steps, [-5, ...new Array<null>(15).fill(null)]),
    [bell]: live(steps, { pitch: 'walk', rhythm: 'random', density: 0.2, low: 5, high: 12, stepwise: 0.4, seed: 2718 }),
  });

  return rolled({
    bpm: 58,
    stepsPerBeat: 4,
    key: 'G2',
    scaleName: 'mixolydian',
    tracks,
    patterns: [a, b],
    order: [a.id, b.id, a.id, b.id],
    instruments: {
      organ: presetGraph('organ'),
      choir: presetGraph('choir'),
      strings: presetGraph('strings'),
      bell: presetGraph('bell'),
    },
  });
}

/** Fast, dry and mechanical: four arpeggios at different registers. */
function clockwork(): Song {
  const steps = 16;
  const tracks = [
    createTrack('high', 'marimba', { gate: 0.5, level: 0.5, polyphony: 4 }),
    createTrack('mid', 'pluck', { gate: 0.6, level: 0.55, polyphony: 4 }),
    createTrack('low', 'harp', { gate: 0.9, level: 0.5, polyphony: 4 }),
    createTrack('sub', 'sub', { gate: 0.8, level: 0.75, polyphony: 1 }),
  ];
  const [high, mid, low, sub] = tracks.map((t) => t.id);
  const ids = tracks.map((t) => t.id);

  const a = createPattern('A', steps, ids, {
    [high]: live(steps, { pitch: 'arpeggio', rhythm: 'every', low: 7, high: 14, seed: 11 }),
    [mid]: live(steps, { pitch: 'arpeggio', rhythm: 'euclidean', pulses: 11, low: 2, high: 9, seed: 12 }),
    [low]: live(steps, { pitch: 'arpeggio', rhythm: 'euclidean', pulses: 5, low: -5, high: 2, seed: 13 }),
    [sub]: authored(steps, pulse(steps, 4, -7)),
  });
  const b = createPattern('B', steps, ids, {
    [high]: live(steps, { pitch: 'arpeggio', rhythm: 'every', low: 9, high: 16, seed: 11 }),
    [mid]: live(steps, { pitch: 'arpeggio', rhythm: 'euclidean', pulses: 13, low: 4, high: 11, seed: 12 }),
    [low]: live(steps, { pitch: 'arpeggio', rhythm: 'euclidean', pulses: 7, low: -3, high: 4, seed: 13 }),
    [sub]: authored(steps, pulse(steps, 4, -5)),
  });

  return rolled({
    bpm: 150,
    stepsPerBeat: 4,
    key: 'C3',
    scaleName: 'minor_pentatonic',
    tracks,
    patterns: [a, b],
    order: [a.id, a.id, b.id, a.id],
    instruments: {
      marimba: presetGraph('marimba'),
      pluck: presetGraph('pluck'),
      harp: presetGraph('harp'),
      sub: presetGraph('sub'),
    },
  });
}

/**
 * A 12-step pattern at three steps to the beat, so everything lands in four
 * groups of three rather than four of four. Nothing else here is in 3.
 */
function waltzForNobody(): Song {
  const steps = 12;
  const tracks = [
    createTrack('lead', 'harp', { gate: 1.4, level: 0.6, polyphony: 5 }),
    createTrack('pad', 'strings', { gate: 4, level: 0.4, polyphony: 4 }),
    createTrack('bass', 'sub', { gate: 1, level: 0.75, polyphony: 1 }),
    createTrack('glint', 'bell', { gate: 2, level: 0.3, polyphony: 3 }),
  ];
  const [lead, pad, bass, glint] = tracks.map((t) => t.id);
  const ids = tracks.map((t) => t.id);

  const a = createPattern('A', steps, ids, {
    [lead]: live(steps, { pitch: 'walk', rhythm: 'euclidean', pulses: 7, low: 0, high: 9, stepwise: 0.85, seed: 3141 }),
    [pad]: authored(steps, [0, null, null, null, null, null, 4, null, null, null, null, null]),
    // One-two-three: root on the downbeat, nothing on the other two.
    [bass]: authored(steps, pulse(steps, 3, -7)),
    [glint]: live(steps, { pitch: 'walk', rhythm: 'random', density: 0.22, low: 7, high: 14, stepwise: 0.5, seed: 2653 }),
  });
  const b = createPattern('B', steps, ids, {
    [lead]: live(steps, { pitch: 'walk', rhythm: 'euclidean', pulses: 5, rotation: 1, low: -2, high: 7, stepwise: 0.9, seed: 5897 }),
    [pad]: authored(steps, [5, null, null, null, null, null, 1, null, null, null, null, null]),
    [bass]: authored(steps, pulse(steps, 3, -5)),
    [glint]: live(steps, { pitch: 'walk', rhythm: 'random', density: 0.18, low: 5, high: 12, stepwise: 0.5, seed: 9323 }),
  });

  return rolled({
    bpm: 96,
    stepsPerBeat: 3,
    key: 'F3',
    scaleName: 'harmonic_minor',
    tracks,
    patterns: [a, b],
    order: [a.id, a.id, b.id, a.id],
    instruments: {
      harp: presetGraph('harp'),
      strings: presetGraph('strings'),
      sub: presetGraph('sub'),
      bell: presetGraph('bell'),
    },
  });
}

/**
 * Six degrees to the octave instead of seven, so every interval is the same
 * size and no note is the root. Deliberately unsettled.
 */
function noFloor(): Song {
  const steps = 16;
  const tracks = [
    createTrack('drift', 'drone', { gate: 6, level: 0.4, polyphony: 3 }),
    createTrack('ping', 'bell', { gate: 3, level: 0.4, polyphony: 4 }),
    createTrack('grit', 'wobble', { gate: 1.2, level: 0.45, polyphony: 2 }),
    createTrack('dust', 'hat', { gate: 0.3, level: 0.25, polyphony: 3 }),
  ];
  const [drift, ping, grit, dust] = tracks.map((t) => t.id);
  const ids = tracks.map((t) => t.id);

  const a = createPattern('A', steps, ids, {
    [drift]: authored(steps, [0, ...new Array<null>(15).fill(null)]),
    [ping]: live(steps, { pitch: 'walk', rhythm: 'random', density: 0.35, low: 2, high: 11, stepwise: 0.25, seed: 424242 }),
    [grit]: live(steps, { pitch: 'walk', rhythm: 'euclidean', pulses: 5, low: -8, high: -4, stepwise: 0.8, seed: 1701 }),
    [dust]: live(steps, { pitch: 'drone', rhythm: 'random', density: 0.45, low: 0, high: 0, seed: 88 }),
  });

  return rolled({
    bpm: 76,
    stepsPerBeat: 4,
    key: 'B2',
    scaleName: 'whole_tone',
    tracks,
    patterns: [a],
    order: [a.id, a.id],
    instruments: {
      drone: presetGraph('drone'),
      bell: presetGraph('bell'),
      wobble: presetGraph('wobble'),
      hat: presetGraph('hat'),
    },
  });
}

export const SONG_PRESETS: SongPreset[] = [
  { name: 'neon grid', description: 'Synthwave. Brass lead over a driving sub, arcade arpeggios on top.', build: neonGrid },
  { name: 'rain on glass', description: 'Ambient lydian at 64bpm, 32 steps to the pattern.', build: rainOnGlass },
  { name: 'tessellate', description: 'Four euclidean rhythms at coprime pulse counts, drifting apart.', build: tessellate },
  { name: 'deep current', description: 'Dub. A wobbling bass and a lot of deliberate space.', build: deepCurrent },
  { name: 'cathedral', description: 'Slow mixolydian chorale — organ, choir, strings, distant bells.', build: cathedral },
  { name: 'clockwork', description: 'Fast, dry pentatonic arpeggios stacked across four registers.', build: clockwork },
  { name: 'waltz for nobody', description: 'Three steps to the beat, harmonic minor, 12-step patterns.', build: waltzForNobody },
  { name: 'no floor', description: 'Whole-tone drift: every interval equal, no note the root.', build: noFloor },
];

export function findSongPreset(name: string): SongPreset | undefined {
  return SONG_PRESETS.find((p) => p.name === name);
}
