import { formatDuration, formatPace, getMetricDef, METRIC_CATALOG } from '@/src/metrics/catalog';
import type { LiveMetrics } from '@/src/ble/types';

const sample: LiveMetrics = {
  elapsedSeconds: 125,
  distanceMeters: 500.6,
  strokeRateSpm: 22.5,
  instantaneousPaceSecondsPer500m: 120,
  averagePaceSecondsPer500m: 125,
  strokeCount: 40,
  instantaneousPowerWatts: 180,
  averagePowerWatts: 160,
  totalEnergyKcal: 55.2,
  heartRateBpm: 142,
  resistanceLevel: 3,
};

describe('metric catalog', () => {
  test('formatDuration', () => {
    expect(formatDuration(undefined)).toBe('—');
    expect(formatDuration(Number.NaN)).toBe('—');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  test('formatPace', () => {
    expect(formatPace(undefined)).toBe('—');
    expect(formatPace(0)).toBe('—');
    expect(formatPace(-1)).toBe('—');
    expect(formatPace(150)).toBe('2:30');
  });

  test('every catalog entry formats empty and live values', () => {
    expect(METRIC_CATALOG.length).toBeGreaterThan(5);
    for (const def of METRIC_CATALOG) {
      expect(getMetricDef(def.id)).toBe(def);
      expect(def.format(undefined)).toBe('—');
      const value = def.getValue(sample);
      expect(value).toBeDefined();
      expect(def.format(value)).not.toBe('—');
    }
  });

  test('spm formats integers without decimals', () => {
    const spm = getMetricDef('spm');
    expect(spm.format(22)).toBe('22');
    expect(spm.format(22.5)).toBe('22.5');
  });
});
