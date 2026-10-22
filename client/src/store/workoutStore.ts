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

export type WorkoutPhase = 'idle' | 'active' | 'finished';

export interface NotificationLogEntry extends NotificationEvent {
  parsed: LiveMetrics | null;
  hex: string;
  receivedAt: number;
}

const SAMPLE_INTERVAL_MS = 1000;
const MAX_NOTIFICATION_LOG = 24;

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
  /** After page load or drop: keep trying the last permitted Whipr. */
  beginAutoReconnect: () => void;
  disconnect: () => Promise<void>;
  disconnectHr: () => Promise<void>;
  startWorkout: () => void;
  stopWorkout: () => void;
  clearSaved: () => void;
  clearError: () => void;
  clearNotificationLog: () => void;
}

type Set = (partial: Partial<WorkoutState> | ((s: WorkoutState) => Partial<WorkoutState>)) => void;
type Get = () => WorkoutState;

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
  if (state.phase !== 'active') return {};
  const endedAt = Date.now();
  return {
    phase: 'finished',
    startedAt: null,
    lastSavedSummary: {
      startedAt: state.startedAt ?? endedAt,
      endedAt,
      metrics: { ...state.metrics },
      samples: [...state.samples],
    },
  };
}

function beginAutoReconnectInternal(set: Set, get: Get) {
  const adapter = getBleAdapter();
  // Silent reconnect requires an in-memory BluetoothDevice (same page session).
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
      beginAutoReconnectInternal(set, get);
    });
  });
}

function onConnectionLost(set: Set, get: Get) {
  clearConnectionHandler();
  const state = get();
  if (state.connection === 'disconnected' && !state.device) return;

  const remembered = getBleAdapter().getRememberedDeviceInfo() ?? state.device;
  set({
    connection: 'reconnecting',
    device: remembered,
    error: null,
    gattServices: [],
    ...finishActiveWorkout(get),
  });
  beginAutoReconnectInternal(set, get);
}

function onHrConnectionLost(set: Set, get: Get) {
  clearHrConnectionHandler();
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
  });
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
      const metrics = metricsWithHr(
        merged,
        state.hrBpm,
        state.hrConnection === 'connected'
      );
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
  set({ connection: 'connected', device, error: null });
}

async function afterHrConnected(set: Set, get: Get, device: BleDeviceInfo) {
  const adapter = getHrBleAdapter();
  set({ hrConnection: 'connecting', hrDevice: device, error: null });

  await adapter.startNotifications((bpm) => {
    set((state) => {
      const metrics = { ...state.metrics, heartRateBpm: bpm };
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
        beginAutoReconnectInternal(set, get);
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
      try {
        await adapter.disconnect();
      } catch {}
      set({
        hrConnection: 'disconnected',
        hrDevice: null,
        hrBpm: null,
        error: mapConnectError(e),
      });
    }
  },

  beginAutoReconnect() {
    const { connection } = get();
    if (connection === 'connected' || connection === 'connecting') return;
    // Page load / HMR: only auto-retry if this tab still owns the BluetoothDevice.
    if (!getBleAdapter().hasLiveDevice()) {
      const remembered = getBleAdapter().getRememberedDeviceInfo();
      if (remembered && connection === 'disconnected') {
        set({ device: remembered });
      }
      return;
    }
    beginAutoReconnectInternal(set, get);
  },

  async disconnect() {
    clearConnectionHandler();
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
    set({
      phase: 'active',
      startedAt: Date.now(),
      samples: [],
      metrics:
        hrConnection === 'connected' && hrBpm != null ? { heartRateBpm: hrBpm } : {},
      lastSavedSummary: null,
    });
  },

  stopWorkout() {
    set(finishActiveWorkout(get));
  },

  clearSaved() {
    set({ lastSavedSummary: null, phase: 'idle', startedAt: null, samples: [] });
  },

  clearError() {
    set({ error: null });
  },

  clearNotificationLog() {
    set({ notificationLog: [] });
  },
}));
