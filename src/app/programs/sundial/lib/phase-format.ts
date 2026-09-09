// Formatting helpers for the phase-list info panels shared by all clock sections.

/** Format a Date as an exact, unambiguous date + time string, e.g. "Sep 8, 2026, 2:32:07 PM" */
export function formatExactDateTime(date: Date, use24h: boolean): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const datePart = `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  const timePart = use24h
    ? `${h.toString().padStart(2, '0')}:${m}:${s}`
    : `${h % 12 || 12}:${m}:${s} ${h >= 12 ? 'PM' : 'AM'}`;
  return `${datePart}, ${timePart}`;
}

/** Format a duration (ms, assumed non-negative) as a compact "Xd Yh" / "Xh Ym" / "Xm Ys" / "Xs" string */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0)    return `${days}d ${hours}h`;
  if (hours > 0)   return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
