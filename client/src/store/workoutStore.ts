import { create } from 'zustand';
import { getBleAdapter, getHrBleAdapter } from '@/src/ble/adapter';
import { parseFtmsNotification, bytesToHex } from '@/src/ble/ftms';
import type {
  BleDeviceInfo,
  ConnectionState,
  GattServiceInfo,
  LiveMetrics,
  NotificationEvent,
  WorkoutSample,
} from '@/src/ble/types';

export type WorkoutPhase = 'idle' | 'active' | 'paused' | 'finished';

export interface NotificationLogEntry extends NotificationEvent {
  parsed: LiveMetrics | null;
  hex: string;
  receivedAt: number;
}

const SAMPLE_INTERVAL_MS = 1000;
const MAX_NOTIFICATION_LOG = 24;

let workoutTimer: ReturnType<typeof setInterval> | null = null;

function clearWorkoutTimer() {
  if (workoutTimer) {
    clearInterval(workoutTimer);
    workoutTimer = null;
  }
}

function elapsedFromStart(startedAt: number | null): number {
  if (startedAt == null) return 0;
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

/** Prefer app workout clock over FTMS machine elapsed while a session is active. */
function withWorkoutElapsed(metrics: LiveMetrics, phase: WorkoutPhase, startedAt: number | null): LiveMetrics {
  if (phase !== 'active' || startedAt == null) return metrics;
  return { ...metrics, elapsedSeconds: elapsedFromStart(startedAt) };
}

function isInProgress(phase: WorkoutPhase): boolean {
  return phase === 'active' || phase === 'paused';
}

interface WorkoutSummary {
  startedAt: number;
  endedAt: number;
  metrics: LiveMetrics;
  samples: WorkoutSample[];
}

interface WorkoutState {
  connection: ConnectionState;
  device: BleDeviceInfo | null;
  hrConnection: ConnectionState;
  hrDevice: BleDeviceInfo | null;
  /** Latest BPM from a dedicated HR strap; wins over FTMS-embedded HR. */
  hrBpm: number | null;
  error: string | null;
  metrics: LiveMetrics;
  phase: WorkoutPhase;
  startedAt: number | null;
  samples: WorkoutSample[];
  gattServices: GattServiceInfo[];
  notificationLog: NotificationLogEntry[];
  lastSavedSummary: WorkoutSummary | null;

  chooseFtmsDevice: () => Promise<void>;
  chooseHrDevice: () => Promise<void>;
  /** After page load or drop: keep trying last permitted ERG / HR devices. */
  beginAutoReconnect: () => void;
  disconnect: () => Promise<void>;
  disconnectHr: () => Promise<void>;
  startWorkout: () => void;
  /** Continue a workout paused by an unexpected ERG drop (or after manual pause). */
  resumeWorkout: () => void;
  stopWorkout: () => void;
  clearSaved: () => void;
  clearError: () => void;
  clearNotificationLog: () => void;
}

type Set = (partial: Partial<WorkoutState> | ((s: WorkoutState) => Partial<WorkoutState>)) => void;
type Get = () => WorkoutState;

function startWorkoutTimer(set: Set, get: Get) {
  clearWorkoutTimer();
  const tick = () => {
    const { phase, startedAt } = get();
    if (phase !== 'active' || startedAt == null) {
      clearWorkoutTimer();
      return;
    }
    const elapsedSeconds = elapsedFromStart(startedAt);
    set((state) => ({
      metrics: { ...state.metrics, elapsedSeconds },
    }));
  };
  tick();
  workoutTimer = setInterval(tick, 1000);
}

function clearConnectionHandler() {
  getBleAdapter().setConnectionLostHandler(null);
}

function clearHrConnectionHandler() {
  getHrBleAdapter().setConnectionLostHandler(null);
}

function metricsWithHr(base: LiveMetrics, hrBpm: number | null, hrConnected: boolean): LiveMetrics {
  if (hrConnected && hrBpm != null) return { ...base, heartRateBpm: hrBpm };
  return base;
}

function finishActiveWorkout(get: Get): Partial<WorkoutState> {
  const state = get();
  if (!isInProgress(state.phase)) return {};
  clearWorkoutTimer();
  const elapsedSeconds =
    state.phase === 'paused'
      ? (state.metrics.elapsedSeconds ?? 0)
      : elapsedFromStart(state.startedAt);
  const startedAt = state.startedAt ?? Date.now() - elapsedSeconds * 1000;
  // Prefer elapsed over wall clock so a disconnect pause does not inflate Strava duration.
  const endedAt = startedAt + elapsedSeconds * 1000;
  const metrics = { ...state.metrics, elapsedSeconds };
  return {
    phase: 'finished',
    startedAt: null,
    metrics,
    lastSavedSummary: {
      startedAt,
      endedAt,
      metrics: { ...metrics },
      samples: [...state.samples],
    },
  };
}

/** Keep samples / elapsed; stop the clock until ERG is back and user resumes. */
function pauseActiveWorkout(get: Get): Partial<WorkoutState> {
  const state = get();
  if (state.phase !== 'active') return {};
  clearWorkoutTimer();
  const elapsedSeconds = elapsedFromStart(state.startedAt);
  return {
    phase: 'paused',
    // Keep startedAt so finish/resume can recover wall-clock start; timer is stopped.
    metrics: { ...state.metrics, elapsedSeconds },
  };
}

function beginErgAutoReconnectInternal(set: Set, get: Get) {
  const adapter = getBleAdapter();
  if (!adapter.hasLiveDevice()) {
    const remembered = adapter.getRememberedDeviceInfo();
    set({
      connection: 'disconnected',
      device: remembered,
      error: remembered
        ? `Previously connected to ${remembered.name || 'your Whipr'}. Tap Connect ERG to choose it again (browsers cannot reconnect after a refresh).`
        : null,
    });
    return;
  }

  const remembered = adapter.getRememberedDeviceInfo() ?? get().device;
  set({
    connection: 'reconnecting',
    device: remembered,
    error: null,
  });

  adapter.startAutoReconnect((device) => {
    void afterConnected(set, get, device).catch((e) => {
      const message = e instanceof Error ? e.message : String(e);
      set({
        connection: 'reconnecting',
        error: message,
        device: adapter.getRememberedDeviceInfo() ?? device,
      });
      beginErgAutoReconnectInternal(set, get);
    });
  });
}

function beginHrAutoReconnectInternal(set: Set, get: Get) {
  const adapter = getHrBleAdapter();
  if (!adapter.hasLiveDevice()) {
    const remembered = adapter.getRememberedDeviceInfo();
    set({
      hrConnection: 'disconnected',
      hrDevice: remembered,
      hrBpm: null,
      error: remembered
        ? `Previously connected to ${remembered.name || 'your HR monitor'}. Tap Connect HR to choose it again (browsers cannot reconnect after a refresh).`
        : get().error,
    });
    return;
  }

  const remembered = adapter.getRememberedDeviceInfo() ?? get().hrDevice;
  set({
    hrConnection: 'reconnecting',
    hrDevice: remembered,
    error: null,
  });

  adapter.startAutoReconnect((device) => {
    void afterHrConnected(set, get, device).catch((e) => {
      const message = e instanceof Error ? e.message : String(e);
      set({
        hrConnection: 'reconnecting',
        error: message,
        hrDevice: adapter.getRememberedDeviceInfo() ?? device,
      });
      beginHrAutoReconnectInternal(set, get);
    });
  });
}

function onConnectionLost(set: Set, get: Get) {
  clearConnectionHandler();
  const state = get();
  if (state.connection === 'disconnected' && !state.device) return;

  const remembered = getBleAdapter().getRememberedDeviceInfo() ?? state.device;
  const wasInProgress = isInProgress(state.phase);
  const pausePatch = pauseActiveWorkout(get);
  set({
    connection: 'reconnecting',
    device: remembered,
    error: wasInProgress
      ? 'ERG disconnected. Reconnect to resume your workout — do not stop unless you want to save/share.'
      : null,
    gattServices: [],
    ...pausePatch,
  });
  beginErgAutoReconnectInternal(set, get);
}

function onHrConnectionLost(set: Set, get: Get) {
  clearHrConnectionHandler();
  const state = get();
  if (state.hrConnection === 'disconnected' && !state.hrDevice) return;

  const remembered = getHrBleAdapter().getRememberedDeviceInfo() ?? state.hrDevice;
  const next = { ...state.metrics };
  if (state.hrBpm != null && next.heartRateBpm === state.hrBpm) {
    delete next.heartRateBpm;
  }
  set({
    hrConnection: 'reconnecting',
    hrDevice: remembered,
    hrBpm: null,
    metrics: next,
    error: null,
  });
  beginHrAutoReconnectInternal(set, get);
}

async function afterConnected(set: Set, get: Get, device: BleDeviceInfo) {
  const adapter = getBleAdapter();
  adapter.stopAutoReconnect();
  set({ connection: 'connecting', error: null, device });

  let services: GattServiceInfo[] = [];
  try {
    services = await adapter.discover();
  } catch {
    // Discover is debug-only; connect can still proceed.
  }
  set({ gattServices: services, notificationLog: [] });

  await adapter.startNotifications((event) => {
    const parsed = parseFtmsNotification(event.characteristicUuid, event.value);
    const hex = event.hex ?? bytesToHex(event.value);
    const receivedAt = event.receivedAt ?? Date.now();
    set((state) => {
      const merged = parsed ? { ...state.metrics, ...parsed } : state.metrics;
      const withHr = metricsWithHr(
        merged,
        state.hrBpm,
        state.hrConnection === 'connected'
      );
      const metrics = withWorkoutElapsed(withHr, state.phase, state.startedAt);
      let samples = state.samples;
      if (state.phase === 'active' && parsed) {
        const last = samples[samples.length - 1];
        const now = Date.now();
        if (!last || now - last.t >= SAMPLE_INTERVAL_MS) {
          samples = [...samples, { t: now, metrics: { ...metrics } }];
        }
      }
      const entry: NotificationLogEntry = { ...event, parsed, hex, receivedAt };
      return {
        metrics,
        samples,
        notificationLog: [entry, ...state.notificationLog].slice(0, MAX_NOTIFICATION_LOG),
      };
    });
  });

  adapter.setConnectionLostHandler(() => onConnectionLost(set, get));
  const { phase } = get();
  set({
    connection: 'connected',
    device,
    error:
      phase === 'paused'
        ? 'ERG reconnected. Tap play to resume your workout, or stop to save/share.'
        : null,
  });
}

async function afterHrConnected(set: Set, get: Get, device: BleDeviceInfo) {
  const adapter = getHrBleAdapter();
  adapter.stopAutoReconnect();
  set({ hrConnection: 'connecting', hrDevice: device, error: null });

  await adapter.startNotifications((bpm) => {
    set((state) => {
      const metrics = withWorkoutElapsed(
        { ...state.metrics, heartRateBpm: bpm },
        state.phase,
        state.startedAt
      );
      let samples = state.samples;
      if (state.phase === 'active') {
        const last = samples[samples.length - 1];
        const now = Date.now();
        if (!last || now - last.t >= SAMPLE_INTERVAL_MS) {
          samples = [...samples, { t: now, metrics: { ...metrics } }];
        }
      }
      return { hrBpm: bpm, metrics, samples, hrConnection: 'connected' as const };
    });
  });

  adapter.setConnectionLostHandler(() => onHrConnectionLost(set, get));
  set({ hrConnection: 'connected', hrDevice: device, error: null });
}

function mapConnectError(e: unknown): string | null {
  const message = e instanceof Error ? e.message : String(e);
  const name = e && typeof e === 'object' && 'name' in e ? String((e as { name: string }).name) : '';
  if (name === 'NotFoundError' || /^User cancelled/i.test(message)) return null;
  return message;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  connection: 'disconnected',
  device: null,
  hrConnection: 'disconnected',
  hrDevice: null,
  hrBpm: null,
  error: null,
  metrics: {},
  phase: 'idle',
  startedAt: null,
  samples: [],
  gattServices: [],
  notificationLog: [],
  lastSavedSummary: null,

  async chooseFtmsDevice() {
    const adapter = getBleAdapter();
    adapter.stopAutoReconnect();
    if (!adapter.isAvailable()) {
      set({
        error:
          'Bluetooth not available. On Mac use Chrome or Edge. On iOS/Android a native build is required.',
      });
      return;
    }
    try {
      set({ connection: 'connecting', error: null });
      const device = await adapter.requestFtmsDevice();
      await afterConnected(set, get, device);
    } catch (e) {
      clearConnectionHandler();
      if (adapter.hasLiveDevice()) {
        set({
          connection: 'reconnecting',
          error: mapConnectError(e),
          device: adapter.getRememberedDeviceInfo(),
        });
        beginErgAutoReconnectInternal(set, get);
      } else {
        set({
          connection: 'disconnected',
          error: mapConnectError(e),
          device: adapter.getRememberedDeviceInfo(),
        });
      }
    }
  },

  async chooseHrDevice() {
    const adapter = getHrBleAdapter();
    adapter.stopAutoReconnect();
    if (!adapter.isAvailable()) {
      set({
        error:
          'Bluetooth not available. On Mac use Chrome or Edge. On iOS/Android a native build is required.',
      });
      return;
    }
    try {
      set({ hrConnection: 'connecting', error: null });
      const device = await adapter.requestHeartRateDevice();
      await afterHrConnected(set, get, device);
    } catch (e) {
      clearHrConnectionHandler();
      if (adapter.hasLiveDevice()) {
        set({
          hrConnection: 'reconnecting',
          error: mapConnectError(e),
          hrDevice: adapter.getRememberedDeviceInfo(),
        });
        beginHrAutoReconnectInternal(set, get);
      } else {
        set({
          hrConnection: 'disconnected',
          hrDevice: adapter.getRememberedDeviceInfo(),
          hrBpm: null,
          error: mapConnectError(e),
        });
      }
    }
  },

  beginAutoReconnect() {
    const { connection, hrConnection } = get();

    if (connection !== 'connected' && connection !== 'connecting') {
      if (!getBleAdapter().hasLiveDevice()) {
        const remembered = getBleAdapter().getRememberedDeviceInfo();
        if (remembered && connection === 'disconnected') {
          set({ device: remembered });
        }
      } else {
        beginErgAutoReconnectInternal(set, get);
      }
    }

    if (hrConnection !== 'connected' && hrConnection !== 'connecting') {
      if (!getHrBleAdapter().hasLiveDevice()) {
        const remembered = getHrBleAdapter().getRememberedDeviceInfo();
        if (remembered && hrConnection === 'disconnected') {
          set({ hrDevice: remembered });
        }
      } else {
        beginHrAutoReconnectInternal(set, get);
      }
    }
  },

  async disconnect() {
    clearConnectionHandler();
    clearWorkoutTimer();
    getBleAdapter().stopAutoReconnect();
    try {
      await getBleAdapter().disconnect();
    } catch {}
    const { hrConnection, hrBpm } = get();
    set({
      connection: 'disconnected',
      device: null,
      phase: 'idle',
      startedAt: null,
      metrics:
        hrConnection === 'connected' && hrBpm != null ? { heartRateBpm: hrBpm } : {},
      gattServices: [],
      notificationLog: [],
      error: null,
    });
  },

  async disconnectHr() {
    clearHrConnectionHandler();
    getHrBleAdapter().stopAutoReconnect();
    try {
      await getHrBleAdapter().disconnect();
    } catch {}
    const { metrics, hrBpm } = get();
    const next = { ...metrics };
    if (hrBpm != null && next.heartRateBpm === hrBpm) {
      delete next.heartRateBpm;
    }
    set({
      hrConnection: 'disconnected',
      hrDevice: null,
      hrBpm: null,
      metrics: next,
      error: null,
    });
  },

  startWorkout() {
    const { hrConnection, hrBpm } = get();
    const startedAt = Date.now();
    set({
      phase: 'active',
      startedAt,
      samples: [],
      metrics: {
        elapsedSeconds: 0,
        ...(hrConnection === 'connected' && hrBpm != null ? { heartRateBpm: hrBpm } : {}),
      },
      lastSavedSummary: null,
      error: null,
    });
    startWorkoutTimer(set, get);
  },

  resumeWorkout() {
    const state = get();
    if (state.phase !== 'paused') return;
    const elapsed = state.metrics.elapsedSeconds ?? 0;
    const startedAt = Date.now() - elapsed * 1000;
    set({
      phase: 'active',
      startedAt,
      error: null,
      metrics: { ...state.metrics, elapsedSeconds: elapsed },
    });
    startWorkoutTimer(set, get);
  },

  stopWorkout() {
    set(finishActiveWorkout(get));
  },

  clearSaved() {
    clearWorkoutTimer();
    set({ lastSavedSummary: null, phase: 'idle', startedAt: null, samples: [] });
  },

  clearError() {
    set({ error: null });
  },

  clearNotificationLog() {
    set({ notificationLog: [] });
  },
}));
