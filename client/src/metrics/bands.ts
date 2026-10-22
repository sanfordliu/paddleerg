import type { MetricId } from '@/src/metrics/catalog';

export const BANDABLE_METRIC_IDS = [
  'spm',
  'pace',
  'avgPace',
  'power',
  'avgPower',
  'heartRate',
] as const;

export type BandableMetricId = (typeof BANDABLE_METRIC_IDS)[number];

export type BandColor = 'green' | 'yellow' | 'red';

export interface MetricBandConfig {
  enabled: boolean;
  /** Inclusive green [lo, hi]; yellow extends outward to yellowLo/yellowHi; else red. */
  greenLo: number | null;
  greenHi: number | null;
  yellowLo: number | null;
  yellowHi: number | null;
  /** When true, profile/sport changes will not overwrite this metric's bands. */
  userModified: boolean;
}

export function isBandableMetricId(id: MetricId): id is BandableMetricId {
  return (BANDABLE_METRIC_IDS as readonly string[]).includes(id);
}

export function emptyBandConfig(): MetricBandConfig {
  return {
    enabled: false,
    greenLo: null,
    greenHi: null,
    yellowLo: null,
    yellowHi: null,
    userModified: false,
  };
}

/** True when green/yellow bounds are complete enough to evaluate. */
export function isBandConfigured(config: MetricBandConfig | undefined | null): boolean {
  if (!config?.enabled) return false;
  const { greenLo, greenHi, yellowLo, yellowHi } = config;
  if (greenLo == null || greenHi == null || yellowLo == null || yellowHi == null) return false;
  if (!(yellowLo <= greenLo && greenLo <= greenHi && greenHi <= yellowHi)) return false;
  return true;
}

/**
 * Target-zone evaluation: green in [greenLo, greenHi], yellow in the outer
 * wings up to yellowLo/yellowHi, otherwise red. Returns null when banding is off.
 */
export function evaluateBand(
  value: number | undefined | null,
  config: MetricBandConfig | undefined | null
): BandColor | null {
  if (value == null || !Number.isFinite(value) || !isBandConfigured(config)) return null;
  const { greenLo, greenHi, yellowLo, yellowHi } = config!;
  if (value >= greenLo! && value <= greenHi!) return 'green';
  if (value >= yellowLo! && value <= yellowHi!) return 'yellow';
  return 'red';
}
