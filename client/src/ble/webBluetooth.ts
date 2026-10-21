import {
  CROSS_TRAINER_DATA,
  FTMS_SERVICE,
  KNOWN_CHARACTERISTICS,
  ROWER_DATA,
  normalizeUuid,
} from './constants';
import { bytesToHex } from './ftms';
import type {
  BleAdapter,
  BleDeviceInfo,
  ConnectionLostHandler,
  GattServiceInfo,
  NotificationEvent,
} from './types';

type NotifyHandler = (event: NotificationEvent) => void;

const FTMS_NOTIFY_CHARS = new Set([
  normalizeUuid(ROWER_DATA),
  normalizeUuid(CROSS_TRAINER_DATA),
]);

const REMEMBERED_DEVICE_KEY = 'paddleerg-ble-device';

function characteristicProperties(c: BluetoothRemoteGATTCharacteristic): string[] {
  const p = c.properties;
  const out: string[] = [];
  if (p.read) out.push('read');
  if (p.write) out.push('write');
  if (p.writeWithoutResponse) out.push('writeWithoutResponse');
  if (p.notify) out.push('notify');
  if (p.indicate) out.push('indicate');
  return out;
}

function readRemembered(): BleDeviceInfo | null {
  try {
    const raw = localStorage.getItem(REMEMBERED_DEVICE_KEY);
    if (!raw) {
      // Migrate legacy id-only key
      const legacy = localStorage.getItem('paddleerg-ble-device-id');
      if (!legacy) return null;
      return { id: legacy, name: null };
    }
    const parsed = JSON.parse(raw) as { id?: string; name?: string | null };
    if (!parsed?.id) return null;
    return { id: parsed.id, name: parsed.name ?? null };
  } catch {
    return null;
  }
}

function writeRemembered(info: BleDeviceInfo | null) {
  try {
    localStorage.removeItem('paddleerg-ble-device-id');
    if (info) localStorage.setItem(REMEMBERED_DEVICE_KEY, JSON.stringify(info));
    else localStorage.removeItem(REMEMBERED_DEVICE_KEY);
  } catch {
    // ignore quota / private mode
  }
}

export function createWebBluetoothAdapter(): BleAdapter {
  let device: BluetoothDevice | null = null;
  let server: BluetoothRemoteGATTServer | null = null;
  let notifyHandler: NotifyHandler | null = null;
  let connectionLostHandler: ConnectionLostHandler | null = null;
  let intentionalDisconnect = false;
  const boundChars: BluetoothRemoteGATTCharacteristic[] = [];
  let disconnectListener: (() => void) | null = null;

  let autoReconnectActive = false;
  let autoReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let autoReconnectAttempt = 0;
  let autoReconnectCallback: ((device: BleDeviceInfo) => void) | null = null;
  let connectInFlight = false;

  const onCharacteristicValueChanged = (ev: Event) => {
    const target = ev.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value || !notifyHandler) return;
    const bytes = new Uint8Array(
      value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)
    );
    notifyHandler({
      serviceUuid: target.service?.uuid ?? '',
      characteristicUuid: target.uuid,
      value: bytes,
      hex: bytesToHex(bytes),
      receivedAt: Date.now(),
    });
  };

  function clearDisconnectListener() {
    if (device && disconnectListener) {
      device.removeEventListener('gattserverdisconnected', disconnectListener);
    }
    disconnectListener = null;
  }

  function stopAutoReconnectInternal() {
    autoReconnectActive = false;
    autoReconnectCallback = null;
    autoReconnectAttempt = 0;
    if (autoReconnectTimer) {
      clearTimeout(autoReconnectTimer);
      autoReconnectTimer = null;
    }
  }

  function handleUnexpectedDisconnect() {
    server = null;
    boundChars.length = 0;
    notifyHandler = null;
    // Keep `device` so we can gatt.connect() again without a chooser.
    if (!intentionalDisconnect) connectionLostHandler?.();
  }

  function deviceInfo(bt: BluetoothDevice): BleDeviceInfo {
    return { id: bt.id, name: bt.name ?? null };
  }

  /**
   * Establish GATT + verify FTMS. Does NOT stop the auto-reconnect loop —
   * callers must stop it only after a successful handoff to afterConnected.
   * Stopping here previously aborted retries on the first failed gatt.connect().
   */
  async function finishConnect(btDevice: BluetoothDevice): Promise<BleDeviceInfo> {
    intentionalDisconnect = false;
    clearDisconnectListener();
    device = btDevice;
    writeRemembered(deviceInfo(btDevice));
    disconnectListener = handleUnexpectedDisconnect;
    device.addEventListener('gattserverdisconnected', disconnectListener);

    if (!device.gatt) {
      throw new Error('Bluetooth device has no GATT server');
    }
    if (!device.gatt.connected) {
      server = await device.gatt.connect();
    } else {
      server = device.gatt;
    }

    try {
      await server.getPrimaryService(FTMS_SERVICE);
    } catch {
      intentionalDisconnect = true;
      try {
        server.disconnect();
      } catch {}
      clearDisconnectListener();
      // Keep remembered device — user may power-cycle a valid FTMS later.
      device = btDevice;
      server = null;
      intentionalDisconnect = false;
      throw new Error('Not an FTMS machine (missing service 00001826-…).');
    }
    return deviceInfo(device);
  }

  /**
   * Web Bluetooth only allows silent reconnect while we still hold the
   * BluetoothDevice from this page session. Persistent getDevices() never
   * shipped in stable Chrome, so after a refresh the user must Choose Device.
   */
  async function attemptGattReconnect(): Promise<BleDeviceInfo | null> {
    if (!device?.gatt) return null;
    if (connectInFlight) return null;
    connectInFlight = true;
    try {
      if (device.gatt.connected && server) {
        try {
          await server.getPrimaryService(FTMS_SERVICE);
          return deviceInfo(device);
        } catch {
          // Stale GATT cache — fall through to full reconnect.
        }
      }
      return await finishConnect(device);
    } finally {
      connectInFlight = false;
    }
  }

  function notifyReconnected(info: BleDeviceInfo) {
    if (!autoReconnectActive) return;
    const cb = autoReconnectCallback;
    stopAutoReconnectInternal();
    cb?.(info);
  }

  function scheduleAutoReconnect() {
    if (!autoReconnectActive) return;
    // Cap delay at 8s so we keep probing while the Whipr boots.
    const delayMs = Math.min(8_000, 750 * 2 ** Math.min(autoReconnectAttempt, 3));
    autoReconnectTimer = setTimeout(() => {
      void (async () => {
        if (!autoReconnectActive) return;
        try {
          const info = await attemptGattReconnect();
          if (info) {
            notifyReconnected(info);
            return;
          }
        } catch {
          // Device still offline / out of range — keep trying.
        }
        autoReconnectAttempt += 1;
        scheduleAutoReconnect();
      })();
    }, delayMs);
  }

  return {
    isAvailable() {
      return typeof navigator !== 'undefined' && !!navigator.bluetooth;
    },

    async requestFtmsDevice() {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth is not available. Use Chrome or Edge.');
      }
      stopAutoReconnectInternal();
      const btDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [FTMS_SERVICE],
      });
      return finishConnect(btDevice);
    },

    async reconnectRememberedDevice() {
      try {
        return await attemptGattReconnect();
      } catch {
        return null;
      }
    },

    startAutoReconnect(onReconnected) {
      stopAutoReconnectInternal();
      // Only same-session BluetoothDevice objects can reconnect without a chooser.
      if (!device) return;
      autoReconnectActive = true;
      autoReconnectCallback = onReconnected;
      autoReconnectAttempt = 0;
      void (async () => {
        if (!autoReconnectActive) return;
        try {
          const info = await attemptGattReconnect();
          if (info) {
            notifyReconnected(info);
            return;
          }
        } catch {
          // Device still offline — keep trying.
        }
        autoReconnectAttempt = 1;
        scheduleAutoReconnect();
      })();
    },

    stopAutoReconnect() {
      stopAutoReconnectInternal();
    },

    hasLiveDevice() {
      return !!device;
    },

    hasRememberedDevice() {
      return !!device || !!readRemembered();
    },

    getRememberedDeviceInfo() {
      if (device) return deviceInfo(device);
      return readRemembered();
    },

    async disconnect() {
      intentionalDisconnect = true;
      stopAutoReconnectInternal();
      await this.stopNotifications();
      clearDisconnectListener();
      if (device?.gatt?.connected) device.gatt.disconnect();
      device = null;
      server = null;
      writeRemembered(null);
      intentionalDisconnect = false;
    },

    async discover() {
      if (!server) throw new Error('Not connected');
      const services = await server.getPrimaryServices();
      const result: GattServiceInfo[] = [];
      for (const service of services) {
        const chars = await service.getCharacteristics();
        result.push({
          uuid: normalizeUuid(service.uuid),
          characteristics: chars.map((c) => ({
            uuid: normalizeUuid(c.uuid),
            name: KNOWN_CHARACTERISTICS[normalizeUuid(c.uuid)],
            properties: characteristicProperties(c),
          })),
        });
      }
      return result;
    },

    async startNotifications(onNotification) {
      if (!server) throw new Error('Not connected');
      await this.stopNotifications();
      notifyHandler = onNotification;
      const service = await server.getPrimaryService(FTMS_SERVICE);
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        if (!FTMS_NOTIFY_CHARS.has(normalizeUuid(char.uuid))) continue;
        if (!char.properties.notify && !char.properties.indicate) continue;
        char.addEventListener('characteristicvaluechanged', onCharacteristicValueChanged);
        await char.startNotifications();
        boundChars.push(char);
      }
      if (boundChars.length === 0) {
        throw new Error('Connected, but no FTMS rower/cross-trainer data characteristic found.');
      }
    },

    async stopNotifications() {
      for (const char of boundChars) {
        try {
          char.removeEventListener('characteristicvaluechanged', onCharacteristicValueChanged);
          await char.stopNotifications();
        } catch {}
      }
      boundChars.length = 0;
      notifyHandler = null;
    },

    getConnectedDevice() {
      return device?.gatt?.connected ? deviceInfo(device) : null;
    },

    isLinkConnected() {
      return !!device?.gatt?.connected;
    },

    setConnectionLostHandler(handler) {
      connectionLostHandler = handler;
    },
  };
}
