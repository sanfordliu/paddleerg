import type { MetricId } from '@/src/metrics/catalog';

/** Metrics colored by a directional target range (Wahoo-style). */
export const TARGET_METRIC_IDS = ['spm', 'pace', 'avgPace', 'power', 'avgPower'] as const;
export type TargetMetricId = (typeof TARGET_METRIC_IDS)[number];

/** Every metric that has zone or target coloring (targets + heart-rate zones). */
export const BANDABLE_METRIC_IDS = [...TARGET_METRIC_IDS, 'heartRate'] as const;
export type BandableMetricId = (typeof BANDABLE_METRIC_IDS)[number];

export function isTargetMetricId(id: MetricId | string): id is TargetMetricId {
  return (TARGET_METRIC_IDS as readonly string[]).includes(id);
}

export function isBandableMetricId(id: MetricId | string): id is BandableMetricId {
  return (BANDABLE_METRIC_IDS as readonly string[]).includes(id);
}

/** Pace is seconds per 500m: a lower number means more effort. */
export function isLowerHarder(id: TargetMetricId): boolean {
  return id === 'pace' || id === 'avgPace';
}

// ---------------------------------------------------------------------------
// Directional targets
// ---------------------------------------------------------------------------

export interface TargetConfig {
  enabled: boolean;
  /** Inclusive target range in the metric's native unit. */
  lo: number | null;
  hi: number | null;
  /** Distance outside the range that still counts as "near". */
  nearMargin: number | null;
  /** When true, profile/sport changes will not overwrite this target. */
  userModified: boolean;
}

export type TargetSide = 'in' | 'under' | 'over';

export interface TargetResult {
  /** Relative to effort: "over" always means working harder than the target. */
  side: TargetSide;
  far: boolean;
}

export function emptyTargetConfig(): TargetConfig {
  return { enabled: false, lo: null, hi: null, nearMargin: null, userModified: false };
}

export function targetError(cfg: Pick<TargetConfig, 'lo' | 'hi' | 'nearMargin'>): string | null {
  const { lo, hi, nearMargin } = cfg;
  if (lo == null || hi == null) return 'Enter a low and high value.';
  if (lo > hi) return 'Low must be less than or equal to high.';
  if (nearMargin == null || nearMargin < 0) return 'Near margin must be zero or more.';
  return null;
}

export function isTargetConfigured(cfg: TargetConfig | undefined | null): cfg is TargetConfig {
  return !!cfg?.enabled && targetError(cfg) == null;
}

export function evaluateTarget(
  value: number | undefined | null,
  cfg: TargetConfig | undefined | null,
  id: TargetMetricId
): TargetResult | null {
  if (value == null || !Number.isFinite(value) || !isTargetConfigured(cfg)) return null;
  const lo = cfg.lo!;
  const hi = cfg.hi!;
  const near = cfg.nearMargin!;
  if (value >= lo && value <= hi) return { side: 'in', far: false };
  const below = value < lo;
  const distance = below ? lo - value : value - hi;
  const harder = isLowerHarder(id) ? below : !below;
  return { side: harder ? 'over' : 'under', far: distance > near };
}

// ---------------------------------------------------------------------------
// Heart-rate intensity zones (Garmin-style)
// ---------------------------------------------------------------------------

export type HrZone = 1 | 2 | 3 | 4 | 5;

export const HR_ZONE_NAMES: Record<HrZone, string> = {
  1: 'Warm-up',
  2: 'Easy',
  3: 'Aerobic',
  4: 'Threshold',
  5: 'Max',
};

export const DEFAULT_ZONE_LOWER_PCT: readonly number[] = [50, 60, 70, 80, 90];

export interface HrZonesConfig {
  enabled: boolean;
  /** Null means "estimate from age". */
  maxHr: number | null;
  /** Lower bound of zones 1–5 as percent of max HR, ascending. */
  zoneLowerPct: number[];
  userModified: boolean;
}

export function defaultHrZonesConfig(): HrZonesConfig {
  return {
    enabled: true,
    maxHr: null,
    zoneLowerPct: [...DEFAULT_ZONE_LOWER_PCT],
    userModified: false,
  };
}

export function zonePctError(pcts: readonly number[]): string | null {
  if (pcts.length !== 5 || pcts.some((p) => !Number.isFinite(p))) return 'Enter all zone values.';
  for (let i = 1; i < pcts.length; i++) {
    if (pcts[i] <= pcts[i - 1]) return 'Each zone must start above the previous one.';
  }
  if (pcts[0] < 0 || pcts[4] > 100) return 'Zones must be between 0 and 100%.';
  return null;
}

export interface HrZoneRange {
  zone: HrZone;
  lo: number;
  /** Exclusive upper bpm; null for zone 5. */
  hi: number | null;
}

export function hrZoneRanges(cfg: HrZonesConfig, maxHr: number): HrZoneRange[] {
  const bpm = cfg.zoneLowerPct.map((p) => Math.round((maxHr * p) / 100));
  return bpm.map((lo, i) => ({
    zone: (i + 1) as HrZone,
    lo,
    hi: i < bpm.length - 1 ? bpm[i + 1] : null,
  }));
}

export function evaluateHrZone(
  bpm: number | undefined | null,
  cfg: HrZonesConfig | undefined | null,
  maxHr: number
): HrZone | null {
  if (bpm == null || !Number.isFinite(bpm) || !cfg?.enabled) return null;
  if (zonePctError(cfg.zoneLowerPct)) return null;
  const pct = (bpm / maxHr) * 100;
  let zone: HrZone | null = null;
  cfg.zoneLowerPct.forEach((lower, i) => {
    if (pct >= lower) zone = (i + 1) as HrZone;
  });
  return zone;
}
