import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  buildDefaultHrZones,
  buildDefaultTargets,
  type AthleteGender,
  type AthleteProfileInput,
  type FitnessLevel,
} from '@/src/metrics/bandDefaults';
import {
  TARGET_METRIC_IDS,
  emptyTargetConfig,
  type HrZonesConfig,
  type TargetConfig,
  type TargetMetricId,
} from '@/src/metrics/bands';
import type { StravaSportType } from '@/src/strava/config';

export type { AthleteGender, FitnessLevel };

export interface AthleteProfile {
  birthYear: number | null;
  gender: AthleteGender | null;
  fitnessLevel: FitnessLevel;
}

type TargetsMap = Partial<Record<TargetMetricId, TargetConfig>>;

interface AthleteState {
  profile: AthleteProfile;
  /** Directional targets for SPM, pace, power. */
  bands: TargetsMap;
  hrZones: HrZonesConfig;
  setProfile: (partial: Partial<AthleteProfile>) => void;
  setTarget: (id: TargetMetricId, config: TargetConfig) => void;
  resetTarget: (id: TargetMetricId, sportType: StravaSportType) => void;
  setHrZones: (config: HrZonesConfig) => void;
  resetHrZones: () => void;
  /** Apply suggested defaults; overwrite only non–userModified unless force. */
  applyDefaults: (sportType: StravaSportType, force?: boolean) => void;
  getTarget: (id: TargetMetricId) => TargetConfig;
}

const DEFAULT_PROFILE: AthleteProfile = {
  birthYear: null,
  gender: null,
  fitnessLevel: 'intermediate',
};

const INITIAL_SPORT: StravaSportType = 'StandUpPaddling';

function profileInput(profile: AthleteProfile): AthleteProfileInput {
  return {
    birthYear: profile.birthYear,
    gender: profile.gender,
    fitnessLevel: profile.fitnessLevel,
  };
}

function mergeTargets(
  current: TargetsMap,
  suggested: Record<TargetMetricId, TargetConfig>,
  force: boolean
): TargetsMap {
  const next: TargetsMap = { ...current };
  for (const id of TARGET_METRIC_IDS) {
    const existing = current[id];
    if (!force && existing?.userModified) continue;
    next[id] = { ...suggested[id], userModified: false };
  }
  return next;
}

type LegacyBand = {
  enabled?: boolean;
  greenLo?: number | null;
  greenHi?: number | null;
  yellowLo?: number | null;
  userModified?: boolean;
};

/** v1 stored symmetric green/yellow bands; v2 stores targets + HR zones. */
function migrateV1Bands(bands: Record<string, LegacyBand> | undefined): TargetsMap {
  const out: TargetsMap = {};
  if (!bands) return out;
  for (const id of TARGET_METRIC_IDS) {
    const b = bands[id];
    if (!b) continue;
    const near =
      b.greenLo != null && b.yellowLo != null ? Math.max(0, b.greenLo - b.yellowLo) : null;
    out[id] = {
      enabled: !!b.enabled,
      lo: b.greenLo ?? null,
      hi: b.greenHi ?? null,
      nearMargin: near,
      userModified: !!b.userModified,
    };
  }
  return out;
}

export const useAthleteStore = create<AthleteState>()(
  persist(
    (set, get) => ({
      profile: { ...DEFAULT_PROFILE },
      bands: buildDefaultTargets(INITIAL_SPORT, profileInput(DEFAULT_PROFILE)),
      hrZones: buildDefaultHrZones(),

      setProfile(partial) {
        set({ profile: { ...get().profile, ...partial } });
      },

      setTarget(id, config) {
        set({ bands: { ...get().bands, [id]: { ...config, userModified: true } } });
      },

      resetTarget(id, sportType) {
        const suggested = buildDefaultTargets(sportType, profileInput(get().profile));
        set({ bands: { ...get().bands, [id]: { ...suggested[id], userModified: false } } });
      },

      setHrZones(config) {
        set({ hrZones: { ...config, userModified: true } });
      },

      resetHrZones() {
        set({ hrZones: buildDefaultHrZones() });
      },

      applyDefaults(sportType, force = false) {
        const suggested = buildDefaultTargets(sportType, profileInput(get().profile));
        const { hrZones } = get();
        set({
          bands: mergeTargets(get().bands, suggested, force),
          hrZones: force || !hrZones.userModified ? buildDefaultHrZones() : hrZones,
        });
      },

      getTarget(id) {
        return get().bands[id] ?? emptyTargetConfig();
      },
    }),
    {
      name: 'paddleerg-athlete',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ profile: s.profile, bands: s.bands, hrZones: s.hrZones }),
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as {
          profile?: AthleteProfile;
          bands?: Record<string, LegacyBand>;
          hrZones?: HrZonesConfig;
        };
        if (version < 2) {
          return {
            profile: p.profile,
            bands: migrateV1Bands(p.bands),
            hrZones: buildDefaultHrZones(),
          };
        }
        return p;
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<AthleteState> | undefined;
        const profile = { ...DEFAULT_PROFILE, ...(p?.profile ?? {}) };
        const defaults = buildDefaultTargets(INITIAL_SPORT, profileInput(profile));
        return {
          ...current,
          profile,
          bands: { ...defaults, ...(p?.bands ?? {}) },
          hrZones: { ...buildDefaultHrZones(), ...(p?.hrZones ?? {}) },
        };
      },
    }
  )
);
