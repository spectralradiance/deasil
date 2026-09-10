/**
 * Euclidean modulo: the result always carries the sign of `b`.
 *
 * The prototype's version (`a < 0 ? b + a % b : a % b`) returns `b` rather than
 * `0` for exact negative multiples — `mod(-4, 4)` gave `4`, which then indexed
 * one past the end of a scale pattern and produced a `NaN` frequency.
 */
export function mod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

/** Constrain `value` to the inclusive range [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
