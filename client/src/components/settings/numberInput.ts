import { formatPace } from '@/src/metrics/catalog';

export function parseNum(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function numStr(n: number | null | undefined): string {
  return n == null ? '' : String(n);
}

/** Accepts "m:ss" or plain seconds. */
export function parsePace(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(/^(\d+):([0-5]?\d)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  return parseNum(t);
}

export function paceStr(seconds: number | null | undefined): string {
  if (seconds == null) return '';
  const out = formatPace(seconds);
  return out === '—' ? '' : out;
}
