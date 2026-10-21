import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import {
  pollUpload,
  redeemSession,
  refreshTokens,
  uploadActivity,
  type StravaTokens,
} from '@/src/strava/api';
import {
  API_URL,
  STRAVA_SPORT_OPTIONS,
  stravaAuthorizeUrl,
  type StravaSportType,
} from '@/src/strava/config';
import { buildTcx } from '@/src/strava/tcx';
import type { LiveMetrics, WorkoutSample } from '@/src/ble/types';

const TOKEN_KEY = 'paddleerg-strava-tokens';
const STATE_KEY = 'paddleerg-strava-state';

async function saveTokens(tokens: StravaTokens | null) {
  const value = tokens ? JSON.stringify(tokens) : null;
  if (Platform.OS === 'web') {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
    return;
  }
  if (value) await SecureStore.setItemAsync(TOKEN_KEY, value);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function loadTokens(): Promise<StravaTokens | null> {
  try {
    const raw =
      Platform.OS === 'web'
        ? localStorage.getItem(TOKEN_KEY)
        : await SecureStore.getItemAsync(TOKEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StravaTokens;
  } catch {
    return null;
  }
}

interface StravaState {
  tokens: StravaTokens | null;
  sportType: StravaSportType;
  status: string | null;
  hydrate: () => Promise<void>;
  setSportType: (sport: StravaSportType) => void;
  beginOAuth: () => string;
  completeOAuthSession: (sid: string) => Promise<void>;
  logout: () => Promise<void>;
  clearStatus: () => void;
  setStatus: (status: string | null) => void;
  shareWorkout: (workout: {
    name: string;
    startedAt: number;
    endedAt: number;
    metrics: LiveMetrics;
    samples: WorkoutSample[];
  }) => Promise<number | null>;
}

async function ensureAccessToken(
  get: () => StravaState,
  set: (partial: Partial<StravaState>) => void
): Promise<string> {
  let tokens = get().tokens;
  if (!tokens) throw new Error('Not connected to Strava');
  const now = Math.floor(Date.now() / 1000);
  if (tokens.expires_at && tokens.expires_at < now + 60) {
    tokens = await refreshTokens(tokens.refresh_token);
    await saveTokens(tokens);
    set({ tokens });
  }
  return tokens.access_token;
}

export const useStravaStore = create<StravaState>((set, get) => ({
  tokens: null,
  sportType: 'StandUpPaddling',
  status: null,

  async hydrate() {
    set({ tokens: await loadTokens() });
  },

  setSportType(sport) {
    set({ sportType: sport });
  },

  beginOAuth() {
    if (!API_URL) {
      throw new Error('Missing EXPO_PUBLIC_API_URL. Point the client at the paddleerg server.');
    }
    const state = Math.random().toString(36).slice(2);
    if (Platform.OS === 'web') sessionStorage.setItem(STATE_KEY, state);
    return stravaAuthorizeUrl(state);
  },

  async completeOAuthSession(sid) {
    try {
      set({ status: 'Finishing Strava connection…' });
      const tokens = await redeemSession(sid);
      await saveTokens(tokens);
      set({ tokens, status: 'Connected to Strava' });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      set({ status: message });
      throw e;
    }
  },

  async logout() {
    await saveTokens(null);
    set({ tokens: null, status: 'Signed out' });
  },

  clearStatus() {
    set({ status: null });
  },

  setStatus(status) {
    set({ status });
  },

  async shareWorkout(workout) {
    set({ status: 'Uploading to Strava…' });
    try {
      const accessToken = await ensureAccessToken(get, set);
      const tcx = buildTcx({
        name: workout.name,
        sport: 'Other',
        startedAt: workout.startedAt,
        endedAt: workout.endedAt,
        metrics: workout.metrics,
        samples: workout.samples,
      });
      const upload = await uploadActivity({
        accessToken,
        tcx,
        name: workout.name,
        sportType: get().sportType,
        externalId: `paddleerg-${workout.startedAt}`,
      });
      const polled = await pollUpload(accessToken, upload.id);
      if (polled.error) {
        set({ status: `Upload error: ${polled.error}` });
        throw new Error(polled.error);
      }
      set({
        status: polled.activity_id
          ? `Uploaded activity #${polled.activity_id}`
          : `Upload status: ${polled.status}`,
      });
      return polled.activity_id;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!get().status?.startsWith('Upload error:')) {
        set({ status: `Upload error: ${message}` });
      }
      throw e;
    }
  },
}));

export { STRAVA_SPORT_OPTIONS };
