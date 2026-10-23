import {
  defaultHrZonesConfig,
  emptyTargetConfig,
  evaluateHrZone,
  evaluateTarget,
  hrZoneRanges,
  isBandableMetricId,
  isLowerHarder,
  isTargetConfigured,
  isTargetMetricId,
  targetError,
  zonePctError,
} from '@/src/metrics/bands';

describe('bands helpers', () => {
  test('type guards', () => {
    expect(isTargetMetricId('spm')).toBe(true);
    expect(isTargetMetricId('heartRate')).toBe(false);
    expect(isBandableMetricId('heartRate')).toBe(true);
    expect(isBandableMetricId('elapsed')).toBe(false);
    expect(isLowerHarder('pace')).toBe(true);
    expect(isLowerHarder('spm')).toBe(false);
  });

  test('targetError and isTargetConfigured', () => {
    expect(targetError({ lo: null, hi: 10, nearMargin: 1 })).toMatch(/low and high/i);
    expect(targetError({ lo: 5, hi: 3, nearMargin: 1 })).toMatch(/less than or equal/i);
    expect(targetError({ lo: 5, hi: 10, nearMargin: -1 })).toMatch(/near margin/i);
    expect(targetError({ lo: 5, hi: 10, nearMargin: 2 })).toBeNull();
    expect(isTargetConfigured(undefined)).toBe(false);
    expect(isTargetConfigured({ ...emptyTargetConfig(), enabled: true, lo: 5, hi: 10, nearMargin: 1 })).toBe(
      true
    );
  });

  test('evaluateTarget for SPM (higher is harder)', () => {
    const cfg = { enabled: true, lo: 36, hi: 44, nearMargin: 4, userModified: false };
    expect(evaluateTarget(null, cfg, 'spm')).toBeNull();
    expect(evaluateTarget(40, cfg, 'spm')).toEqual({ side: 'in', far: false });
    expect(evaluateTarget(34, cfg, 'spm')).toEqual({ side: 'under', far: false });
    expect(evaluateTarget(30, cfg, 'spm')).toEqual({ side: 'under', far: true });
    expect(evaluateTarget(46, cfg, 'spm')).toEqual({ side: 'over', far: false });
    expect(evaluateTarget(50, cfg, 'spm')).toEqual({ side: 'over', far: true });
  });

  test('evaluateTarget for pace (lower is harder)', () => {
    const cfg = { enabled: true, lo: 140, hi: 160, nearMargin: 10, userModified: false };
    expect(evaluateTarget(150, cfg, 'pace')).toEqual({ side: 'in', far: false });
    // Faster than target (lower seconds) = over
    expect(evaluateTarget(130, cfg, 'pace')).toEqual({ side: 'over', far: false });
    expect(evaluateTarget(120, cfg, 'pace')).toEqual({ side: 'over', far: true });
    // Slower = under
    expect(evaluateTarget(165, cfg, 'pace')).toEqual({ side: 'under', far: false });
    expect(evaluateTarget(180, cfg, 'pace')).toEqual({ side: 'under', far: true });
  });

  test('HR zone pct validation and evaluation', () => {
    expect(zonePctError([50, 60, 70, 80])).toMatch(/all zone/i);
    expect(zonePctError([50, 60, 70, 70, 90])).toMatch(/above the previous/i);
    expect(zonePctError([-1, 60, 70, 80, 90])).toMatch(/0 and 100/i);
    expect(zonePctError([50, 60, 70, 80, 90])).toBeNull();

    const cfg = defaultHrZonesConfig();
    const ranges = hrZoneRanges(cfg, 200);
    expect(ranges[0]).toEqual({ zone: 1, lo: 100, hi: 120 });
    expect(ranges[4]).toEqual({ zone: 5, lo: 180, hi: null });

    expect(evaluateHrZone(null, cfg, 200)).toBeNull();
    expect(evaluateHrZone(90, cfg, 200)).toBeNull(); // below 50%
    expect(evaluateHrZone(105, cfg, 200)).toBe(1);
    expect(evaluateHrZone(125, cfg, 200)).toBe(2);
    expect(evaluateHrZone(145, cfg, 200)).toBe(3);
    expect(evaluateHrZone(165, cfg, 200)).toBe(4);
    expect(evaluateHrZone(185, cfg, 200)).toBe(5);
    expect(evaluateHrZone(150, { ...cfg, enabled: false }, 200)).toBeNull();
  });
});
