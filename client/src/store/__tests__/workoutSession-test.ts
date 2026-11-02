import {
  elapsedFromStart,
  finishSession,
  idleSessionReset,
  pauseSession,
  resumeSession,
  withWorkoutElapsed,
} from '@/src/store/workoutSession';

describe('workoutSession', () => {
  const now = Date.parse('2026-01-01T12:10:00.000Z');
  const startedAt = Date.parse('2026-01-01T12:00:00.000Z');

  test('elapsedFromStart uses wall clock seconds', () => {
    expect(elapsedFromStart(startedAt, now)).toBe(600);
    expect(elapsedFromStart(null, now)).toBe(0);
  });

  test('withWorkoutElapsed only overrides while active', () => {
    expect(
      withWorkoutElapsed({ elapsedSeconds: 1, instantaneousPowerWatts: 100 }, 'active', startedAt, now)
    ).toEqual({ elapsedSeconds: 600, instantaneousPowerWatts: 100 });
    expect(
      withWorkoutElapsed({ elapsedSeconds: 42, instantaneousPowerWatts: 100 }, 'paused', startedAt, now)
    ).toEqual({ elapsedSeconds: 42, instantaneousPowerWatts: 100 });
  });

  test('pauseSession freezes elapsed from startedAt', () => {
    const paused = pauseSession(
      {
        phase: 'active',
        startedAt,
        metrics: { instantaneousPowerWatts: 120, elapsedSeconds: 10 },
        samples: [{ t: startedAt, metrics: { instantaneousPowerWatts: 120 } }],
      },
      now
    );
    expect(paused).toEqual({
      phase: 'paused',
      metrics: { instantaneousPowerWatts: 120, elapsedSeconds: 600 },
    });
    expect(pauseSession({ phase: 'paused', startedAt, metrics: {}, samples: [] }, now)).toBeNull();
  });

  test('resumeSession rebases startedAt so elapsed stays correct', () => {
    const resumed = resumeSession(
      {
        phase: 'paused',
        startedAt,
        metrics: { elapsedSeconds: 600, instantaneousPowerWatts: 90 },
        samples: [],
      },
      now
    );
    expect(resumed).toEqual({
      phase: 'active',
      startedAt: now - 600_000,
      metrics: { elapsedSeconds: 600, instantaneousPowerWatts: 90 },
    });
    expect(elapsedFromStart(resumed!.startedAt, now)).toBe(600);
  });

  test('finishSession from paused does not inflate duration with wall gap', () => {
    const finished = finishSession(
      {
        phase: 'paused',
        startedAt,
        metrics: { elapsedSeconds: 300, distanceMeters: 1000 },
        samples: [{ t: startedAt, metrics: { distanceMeters: 1000 } }],
      },
      now
    );
    expect(finished).not.toBeNull();
    expect(finished!.metrics.elapsedSeconds).toBe(300);
    expect(finished!.lastSavedSummary.endedAt - finished!.lastSavedSummary.startedAt).toBe(
      300_000
    );
    expect(finished!.lastSavedSummary.samples).toHaveLength(1);
  });

  test('finishSession from active uses wall elapsed', () => {
    const finished = finishSession(
      {
        phase: 'active',
        startedAt,
        metrics: { elapsedSeconds: 1 },
        samples: [],
      },
      now
    );
    expect(finished!.metrics.elapsedSeconds).toBe(600);
    expect(finished!.lastSavedSummary.startedAt).toBe(startedAt);
    expect(finished!.lastSavedSummary.endedAt).toBe(startedAt + 600_000);
  });

  test('idleSessionReset clears progress and optionally keeps HR', () => {
    expect(idleSessionReset(null)).toEqual({
      phase: 'idle',
      startedAt: null,
      samples: [],
      lastSavedSummary: null,
      metrics: {},
      error: null,
    });
    expect(idleSessionReset(142).metrics).toEqual({ heartRateBpm: 142 });
  });
});
