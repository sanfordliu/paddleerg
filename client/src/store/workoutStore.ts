import { create } from 'zustand';
import { getBleAdapter } from '@/src/ble/adapter';
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
  error: string | null;
  metrics: LiveMetrics;
  phase: WorkoutPhase;
  startedAt: number | null;
  samples: WorkoutSample[];
  gattServices: GattServiceInfo[];
  notificationLog: NotificationLogEntry[];
  lastSavedSummary: WorkoutSummary | null;

  chooseFtmsDevice: () => Promise<void>;
  /** After page load or drop: keep trying the last permitted Whipr. */
  beginAutoReconnect: () => void;
  disconnect: () => Promise<void>;
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
  if (!adapter.hasRememberedDevice()) return;

  const remembered = adapter.getRememberedDeviceInfo();
  set({
    connection: 'reconnecting',
    device: remembered ?? get().device,
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
      // Keep hunting if setup failed transiently.
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
      const metrics = parsed ? { ...state.metrics, ...parsed } : state.metrics;
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

function mapConnectError(e: unknown): string | null {
  const message = e instanceof Error ? e.message : String(e);
  const name = e && typeof e === 'object' && 'name' in e ? String((e as { name: string }).name) : '';
  if (name === 'NotFoundError' || /^User cancelled/i.test(message)) return null;
  return message;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  connection: 'disconnected',
  device: null,
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
      const remembered = adapter.getRememberedDeviceInfo();
      if (remembered) {
        set({
          connection: 'reconnecting',
          error: mapConnectError(e),
          device: remembered,
        });
        beginAutoReconnectInternal(set, get);
      } else {
        set({ connection: 'disconnected', error: mapConnectError(e), device: null });
      }
    }
  },

  beginAutoReconnect() {
    const { connection } = get();
    if (connection === 'connected' || connection === 'connecting' || connection === 'reconnecting') {
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
    set({
      connection: 'disconnected',
      device: null,
      phase: 'idle',
      startedAt: null,
      metrics: {},
      gattServices: [],
      notificationLog: [],
      error: null,
    });
  },

  startWorkout() {
    set({ phase: 'active', startedAt: Date.now(), samples: [], metrics: {}, lastSavedSummary: null });
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
