import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  buildDefaultBands,
  type AthleteGender,
  type AthleteProfileInput,
  type FitnessLevel,
} from '@/src/metrics/bandDefaults';
import {
  BANDABLE_METRIC_IDS,
  emptyBandConfig,
  type BandableMetricId,
  type MetricBandConfig,
} from '@/src/metrics/bands';
import type { StravaSportType } from '@/src/strava/config';

export type { AthleteGender, FitnessLevel };

export interface AthleteProfile {
  birthYear: number | null;
  gender: AthleteGender | null;
  fitnessLevel: FitnessLevel;
}

type BandsMap = Partial<Record<BandableMetricId, MetricBandConfig>>;

interface AthleteState {
  profile: AthleteProfile;
  bands: BandsMap;
  setProfile: (partial: Partial<AthleteProfile>) => void;
  setBand: (id: BandableMetricId, config: MetricBandConfig) => void;
  clearBand: (id: BandableMetricId) => void;
  /** Apply suggested defaults; overwrite only non–userModified unless force. */
  applyDefaults: (sportType: StravaSportType, force?: boolean) => void;
  getBand: (id: BandableMetricId) => MetricBandConfig;
}

const DEFAULT_PROFILE: AthleteProfile = {
  birthYear: null,
  gender: null,
  fitnessLevel: 'intermediate',
};

function profileInput(profile: AthleteProfile): AthleteProfileInput {
  return {
    birthYear: profile.birthYear,
    gender: profile.gender,
    fitnessLevel: profile.fitnessLevel,
  };
}

function mergeDefaults(
  current: BandsMap,
  suggested: Record<BandableMetricId, MetricBandConfig>,
  force: boolean
): BandsMap {
  const next: BandsMap = { ...current };
  for (const id of BANDABLE_METRIC_IDS) {
    const existing = current[id];
    if (!force && existing?.userModified) {
      next[id] = existing;
      continue;
    }
    next[id] = { ...suggested[id], userModified: false };
  }
  return next;
}

export const useAthleteStore = create<AthleteState>()(
  persist(
    (set, get) => ({
      profile: { ...DEFAULT_PROFILE },
      bands: {},

      setProfile(partial) {
        set({ profile: { ...get().profile, ...partial } });
      },

      setBand(id, config) {
        set({
          bands: {
            ...get().bands,
            [id]: { ...config, userModified: true },
          },
        });
      },

      clearBand(id) {
        set({
          bands: {
            ...get().bands,
            [id]: { ...emptyBandConfig(), userModified: true },
          },
        });
      },

      applyDefaults(sportType, force = false) {
        const suggested = buildDefaultBands(sportType, profileInput(get().profile));
        set({ bands: mergeDefaults(get().bands, suggested, force) });
      },

      getBand(id) {
        return get().bands[id] ?? emptyBandConfig();
      },
    }),
    {
      name: 'paddleerg-athlete',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ profile: s.profile, bands: s.bands }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AthleteState> | undefined;
        return {
          ...current,
          ...p,
          profile: { ...DEFAULT_PROFILE, ...(p?.profile ?? {}) },
          bands: p?.bands ?? {},
        };
      },
    }
  )
);
