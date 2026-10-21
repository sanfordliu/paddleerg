import type { LiveMetrics } from '@/src/ble/types';

export type MetricId =
  | 'elapsed'
  | 'distance'
  | 'spm'
  | 'pace'
  | 'avgPace'
  | 'strokes'
  | 'power'
  | 'avgPower'
  | 'calories'
  | 'heartRate'
  | 'resistance';

export interface MetricDef {
  id: MetricId;
  label: string;
  unit: string;
  getValue: (m: LiveMetrics) => number | undefined;
  format: (value: number | undefined) => string;
}

export function formatDuration(totalSeconds: number | undefined): string {
  if (totalSeconds == null || Number.isNaN(totalSeconds)) return '—';
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function formatPace(secondsPer500m: number | undefined): string {
  if (secondsPer500m == null || !Number.isFinite(secondsPer500m) || secondsPer500m <= 0) {
    return '—';
  }
  const s = Math.round(secondsPer500m);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export const METRIC_CATALOG: MetricDef[] = [
  {
    id: 'elapsed',
    label: 'Time',
    unit: '',
    getValue: (m) => m.elapsedSeconds,
    format: formatDuration,
  },
  {
    id: 'distance',
    label: 'Distance',
    unit: 'm',
    getValue: (m) => m.distanceMeters,
    format: (v) => (v == null ? '—' : String(Math.round(v))),
  },
  {
    id: 'spm',
    label: 'SPM',
    unit: '/min',
    getValue: (m) => m.strokeRateSpm,
    format: (v) => (v == null ? '—' : v.toFixed(v % 1 === 0 ? 0 : 1)),
  },
  {
    id: 'pace',
    label: 'Pace',
    unit: '/500m',
    getValue: (m) => m.instantaneousPaceSecondsPer500m,
    format: formatPace,
  },
  {
    id: 'avgPace',
    label: 'Avg Pace',
    unit: '/500m',
    getValue: (m) => m.averagePaceSecondsPer500m,
    format: formatPace,
  },
  {
    id: 'strokes',
    label: 'Strokes',
    unit: '',
    getValue: (m) => m.strokeCount,
    format: (v) => (v == null ? '—' : String(v)),
  },
  {
    id: 'power',
    label: 'Power',
    unit: 'W',
    getValue: (m) => m.instantaneousPowerWatts,
    format: (v) => (v == null ? '—' : String(Math.round(v))),
  },
  {
    id: 'avgPower',
    label: 'Avg Power',
    unit: 'W',
    getValue: (m) => m.averagePowerWatts,
    format: (v) => (v == null ? '—' : String(Math.round(v))),
  },
  {
    id: 'calories',
    label: 'Calories',
    unit: 'kcal',
    getValue: (m) => m.totalEnergyKcal,
    format: (v) => (v == null ? '—' : String(Math.round(v))),
  },
  {
    id: 'heartRate',
    label: 'Heart Rate',
    unit: 'bpm',
    getValue: (m) => m.heartRateBpm,
    format: (v) => (v == null ? '—' : String(v)),
  },
  {
    id: 'resistance',
    label: 'Resistance',
    unit: '',
    getValue: (m) => m.resistanceLevel,
    format: (v) => (v == null ? '—' : String(v)),
  },
];

export const DEFAULT_TILE_IDS: MetricId[] = [
  'elapsed',
  'distance',
  'spm',
  'pace',
  'strokes',
  'power',
];

export function getMetricDef(id: MetricId): MetricDef {
  const def = METRIC_CATALOG.find((m) => m.id === id);
  if (!def) throw new Error(`Unknown metric: ${id}`);
  return def;
}
