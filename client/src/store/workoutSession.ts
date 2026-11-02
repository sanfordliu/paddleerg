import type { LiveMetrics, WorkoutSample } from '@/src/ble/types';

export type WorkoutPhase = 'idle' | 'active' | 'paused' | 'finished';

export interface WorkoutSummary {
  startedAt: number;
  endedAt: number;
  metrics: LiveMetrics;
  samples: WorkoutSample[];
}

export interface SessionSnapshot {
  phase: WorkoutPhase;
  startedAt: number | null;
  metrics: LiveMetrics;
  samples: WorkoutSample[];
}

export function isInProgress(phase: WorkoutPhase): boolean {
  return phase === 'active' || phase === 'paused';
}

export function elapsedFromStart(startedAt: number | null, now = Date.now()): number {
  if (startedAt == null) return 0;
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

/** Prefer app workout clock over FTMS machine elapsed while a session is active. */
export function withWorkoutElapsed(
  metrics: LiveMetrics,
  phase: WorkoutPhase,
  startedAt: number | null,
  now = Date.now()
): LiveMetrics {
  if (phase !== 'active' || startedAt == null) return metrics;
  return { ...metrics, elapsedSeconds: elapsedFromStart(startedAt, now) };
}

export function finishSession(
  state: SessionSnapshot,
  now = Date.now()
): {
  phase: 'finished';
  startedAt: null;
  metrics: LiveMetrics;
  lastSavedSummary: WorkoutSummary;
} | null {
  if (!isInProgress(state.phase)) return null;
  const elapsedSeconds =
    state.phase === 'paused'
      ? (state.metrics.elapsedSeconds ?? 0)
      : elapsedFromStart(state.startedAt, now);
  const startedAt = state.startedAt ?? now - elapsedSeconds * 1000;
  // Prefer elapsed over wall clock so a disconnect pause does not inflate Strava duration.
  const endedAt = startedAt + elapsedSeconds * 1000;
  const metrics = { ...state.metrics, elapsedSeconds };
  return {
    phase: 'finished',
    startedAt: null,
    metrics,
    lastSavedSummary: {
      startedAt,
      endedAt,
      metrics: { ...metrics },
      samples: [...state.samples],
    },
  };
}

/** Keep samples / elapsed; stop the clock until ERG is back and user resumes. */
export function pauseSession(
  state: SessionSnapshot,
  now = Date.now()
): {
  phase: 'paused';
  metrics: LiveMetrics;
} | null {
  if (state.phase !== 'active') return null;
  const elapsedSeconds = elapsedFromStart(state.startedAt, now);
  return {
    phase: 'paused',
    metrics: { ...state.metrics, elapsedSeconds },
  };
}

export function resumeSession(
  state: SessionSnapshot,
  now = Date.now()
): {
  phase: 'active';
  startedAt: number;
  metrics: LiveMetrics;
} | null {
  if (state.phase !== 'paused') return null;
  const elapsed = state.metrics.elapsedSeconds ?? 0;
  const startedAt = now - elapsed * 1000;
  return {
    phase: 'active',
    startedAt,
    metrics: { ...state.metrics, elapsedSeconds: elapsed },
  };
}

export function idleSessionReset(keepHrBpm: number | null): {
  phase: 'idle';
  startedAt: null;
  samples: [];
  lastSavedSummary: null;
  metrics: LiveMetrics;
  error: null;
} {
  return {
    phase: 'idle',
    startedAt: null,
    samples: [],
    lastSavedSummary: null,
    metrics: keepHrBpm != null ? { heartRateBpm: keepHrBpm } : {},
    error: null,
  };
}
