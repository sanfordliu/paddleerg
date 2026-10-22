import type { StravaSportType } from '@/src/strava/config';
import {
  BANDABLE_METRIC_IDS,
  emptyBandConfig,
  type BandableMetricId,
  type MetricBandConfig,
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

function rangeAround(
  mid: number,
  greenHalf: number,
  yellowHalf: number
): Pick<MetricBandConfig, 'greenLo' | 'greenHi' | 'yellowLo' | 'yellowHi'> {
  return {
    greenLo: Math.round(mid - greenHalf),
    greenHi: Math.round(mid + greenHalf),
    yellowLo: Math.round(mid - yellowHalf),
    yellowHi: Math.round(mid + yellowHalf),
  };
}

function enabledBand(
  ranges: Pick<MetricBandConfig, 'greenLo' | 'greenHi' | 'yellowLo' | 'yellowHi'>
): MetricBandConfig {
  return {
    enabled: true,
    ...ranges,
    userModified: false,
  };
}

/**
 * Build suggested bands for all bandable metrics from sport + athlete profile.
 * Numbers are approximate recreational targets scaled by fitness level.
 */
export function buildDefaultBands(
  sportType: StravaSportType,
  profile: AthleteProfileInput
): Record<BandableMetricId, MetricBandConfig> {
  const targets = SPORT_TARGETS[sportType] ?? SPORT_TARGETS.StandUpPaddling;
  const scale = FITNESS_SCALE[profile.fitnessLevel] ?? 1;
  const age = ageFromBirthYear(profile.birthYear);
  const maxHr = estimatedMaxHr(age);

  // Gender nudges power slightly; SPM/pace stay sport-led.
  const genderPower =
    profile.gender === 'female' ? 0.9 : profile.gender === 'male' ? 1.05 : 1;

  const spmMid = targets.spm * (0.95 + 0.05 * scale);
  // Faster athletes → lower pace seconds
  const paceMid = targets.paceSec / scale;
  const powerMid = targets.power * scale * genderPower;

  const hrGreenLo = Math.round(maxHr * 0.6);
  const hrGreenHi = Math.round(maxHr * 0.8);
  const hrYellowLo = Math.round(maxHr * 0.5);
  const hrYellowHi = Math.round(maxHr * 0.9);

  const out = {} as Record<BandableMetricId, MetricBandConfig>;
  for (const id of BANDABLE_METRIC_IDS) {
    out[id] = emptyBandConfig();
  }

  out.spm = enabledBand(rangeAround(spmMid, 4, 8));
  out.pace = enabledBand(rangeAround(paceMid, 10, 20));
  out.avgPace = enabledBand(rangeAround(paceMid, 10, 20));
  out.power = enabledBand(rangeAround(powerMid, powerMid * 0.12, powerMid * 0.25));
  out.avgPower = enabledBand(rangeAround(powerMid, powerMid * 0.12, powerMid * 0.25));
  out.heartRate = enabledBand({
    greenLo: hrGreenLo,
    greenHi: hrGreenHi,
    yellowLo: hrYellowLo,
    yellowHi: hrYellowHi,
  });

  return out;
}
