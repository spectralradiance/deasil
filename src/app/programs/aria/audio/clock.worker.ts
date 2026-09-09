/**
 * A bare interval ticker that runs off the main thread.
 *
 * Why this exists: browsers clamp main-thread `setInterval` to roughly one
 * second in a backgrounded tab. A lookahead scheduler driven by a main-thread
 * timer therefore stops refilling its window the moment you switch tabs, and
 * playback stutters or dies. Worker timers are not clamped the same way.
 *
 * The worker body is a string compiled into a Blob URL rather than a separate
 * entry point, so this file needs no bundler configuration and behaves the same
 * under Turbopack and under a plain esbuild bundle for the scratch harness.
 */

const WORKER_SOURCE = `
let timer = null;
let interval = 25;

function restart() {
  if (timer !== null) clearInterval(timer);
  timer = setInterval(function () { self.postMessage('tick'); }, interval);
}

self.onmessage = function (event) {
  const message = event.data;
  if (message.command === 'start') {
    if (typeof message.interval === 'number') interval = message.interval;
    restart();
  } else if (message.command === 'interval') {
    interval = message.interval;
    if (timer !== null) restart();
  } else if (message.command === 'stop') {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }
};
`;

export interface ClockTicker {
  start(): void;
  stop(): void;
  setInterval(intervalMs: number): void;
  dispose(): void;
  /** False when the environment forced the main-thread fallback. */
  readonly usesWorker: boolean;
}

function createWorkerTicker(intervalMs: number, onTick: () => void): ClockTicker | null {
  if (typeof Worker === 'undefined' || typeof Blob === 'undefined') return null;
  let url: string;
  let worker: Worker;
  try {
    url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'application/javascript' }));
    worker = new Worker(url);
  } catch {
    return null;
  }

  let interval = intervalMs;
  worker.onmessage = () => onTick();

  return {
    usesWorker: true,
    start: () => worker.postMessage({ command: 'start', interval }),
    stop: () => worker.postMessage({ command: 'stop' }),
    setInterval: (ms: number) => {
      interval = ms;
      worker.postMessage({ command: 'interval', interval: ms });
    },
    dispose: () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    },
  };
}

function createFallbackTicker(intervalMs: number, onTick: () => void): ClockTicker {
  let timer: ReturnType<typeof setInterval> | null = null;
  let interval = intervalMs;

  const restart = () => {
    if (timer !== null) clearInterval(timer);
    timer = setInterval(onTick, interval);
  };

  return {
    usesWorker: false,
    start: restart,
    stop: () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    },
    setInterval: (ms: number) => {
      interval = ms;
      if (timer !== null) restart();
    },
    dispose: () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    },
  };
}

/** Builds a worker-backed ticker, falling back to a main-thread timer. */
export function createClockTicker(intervalMs: number, onTick: () => void): ClockTicker {
  return createWorkerTicker(intervalMs, onTick) ?? createFallbackTicker(intervalMs, onTick);
}
