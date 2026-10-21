import { randomBytes } from 'crypto';
import type { StravaTokens } from './oauth';

const TTL_MS = 5 * 60 * 1000;

interface SessionEntry {
  tokens: StravaTokens;
  expiresAt: number;
}

const sessions = new Map<string, SessionEntry>();

function prune() {
  const now = Date.now();
  for (const [id, entry] of sessions) {
    if (entry.expiresAt <= now) sessions.delete(id);
  }
}

/** Store tokens under a one-time sid for client handoff. */
export function createSession(tokens: StravaTokens): string {
  prune();
  const sid = randomBytes(24).toString('hex');
  sessions.set(sid, { tokens, expiresAt: Date.now() + TTL_MS });
  return sid;
}

/** Consume a session once; returns null if missing/expired. */
export function takeSession(sid: string): StravaTokens | null {
  prune();
  const entry = sessions.get(sid);
  if (!entry) return null;
  sessions.delete(sid);
  if (entry.expiresAt <= Date.now()) return null;
  return entry.tokens;
}
