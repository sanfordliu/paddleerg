import type { StravaSportType } from '@/src/strava/config';
import {
  TARGET_METRIC_IDS,
  defaultHrZonesConfig,
  type HrZonesConfig,
  type TargetConfig,
  type TargetMetricId,
} from '@/src/metrics/bands';

export type AthleteGender = 'female' | 'male' | 'other';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export interface AthleteProfileInput {
  birthYear: number | null;
  gender: AthleteGender | null;
  fitnessLevel: FitnessLevel;
}

/** Heuristic coaching defaults — not medical advice. */
type SportTargets = {
  /** Mid SPM */
  spm: number;
  /** Mid pace seconds / 500m (lower = faster) */
  paceSec: number;
  /** Mid watts */
  power: number;
};

const SPORT_TARGETS: Record<StravaSportType, SportTargets> = {
  StandUpPaddling: { spm: 40, paceSec: 150, power: 90 },
  Rowing: { spm: 24, paceSec: 120, power: 160 },
  Canoeing: { spm: 45, paceSec: 140, power: 110 },
  Kayaking: { spm: 55, paceSec: 130, power: 120 },
};

const FITNESS_SCALE: Record<FitnessLevel, number> = {
  beginner: 0.85,
  intermediate: 1,
  advanced: 1.15,
};

export function ageFromBirthYear(birthYear: number | null, now = new Date()): number | null {
  if (birthYear == null || birthYear < 1900 || birthYear > now.getFullYear()) return null;
  return Math.max(10, Math.min(100, now.getFullYear() - birthYear));
}

/** Tanaka formula estimate of max HR. */
export function estimatedMaxHr(age: number | null): number {
  const a = age ?? 35;
  return Math.round(208 - 0.7 * a);
}

export function resolveMaxHr(cfg: HrZonesConfig, birthYear: number | null): number {
  return cfg.maxHr ?? estimatedMaxHr(ageFromBirthYear(birthYear));
}

function targetAround(mid: number, half: number, near: number): TargetConfig {
  return {
    enabled: true,
    lo: Math.round(mid - half),
    hi: Math.round(mid + half),
    nearMargin: Math.max(1, Math.round(near)),
    userModified: false,
  };
}

/**
 * Suggested targets for all directional metrics from sport + athlete profile.
 * Numbers are approximate recreational targets scaled by fitness level.
 */
export function buildDefaultTargets(
  sportType: StravaSportType,
  profile: AthleteProfileInput
): Record<TargetMetricId, TargetConfig> {
  const targets = SPORT_TARGETS[sportType] ?? SPORT_TARGETS.StandUpPaddling;
  const scale = FITNESS_SCALE[profile.fitnessLevel] ?? 1;

  // Gender nudges power slightly; SPM/pace stay sport-led.
  const genderPower =
    profile.gender === 'female' ? 0.9 : profile.gender === 'male' ? 1.05 : 1;

  const spmMid = targets.spm * (0.95 + 0.05 * scale);
  // Faster athletes → lower pace seconds
  const paceMid = targets.paceSec / scale;
  const powerMid = targets.power * scale * genderPower;

  const out = {} as Record<TargetMetricId, TargetConfig>;
  for (const id of TARGET_METRIC_IDS) {
    if (id === 'spm') out[id] = targetAround(spmMid, 4, 4);
    else if (id === 'pace' || id === 'avgPace') out[id] = targetAround(paceMid, 10, 10);
    else out[id] = targetAround(powerMid, powerMid * 0.12, powerMid * 0.13);
  }
  return out;
}

export function buildDefaultHrZones(): HrZonesConfig {
  return defaultHrZonesConfig();
}
