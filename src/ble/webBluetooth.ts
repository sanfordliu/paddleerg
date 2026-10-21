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

export function createWebBluetoothAdapter(): BleAdapter {
  let device: BluetoothDevice | null = null;
  let server: BluetoothRemoteGATTServer | null = null;
  let notifyHandler: NotifyHandler | null = null;
  let connectionLostHandler: ConnectionLostHandler | null = null;
  let intentionalDisconnect = false;
  const boundChars: BluetoothRemoteGATTCharacteristic[] = [];
  let disconnectListener: (() => void) | null = null;

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

  function handleUnexpectedDisconnect() {
    server = null;
    boundChars.length = 0;
    notifyHandler = null;
    if (!intentionalDisconnect) connectionLostHandler?.();
  }

  async function finishConnect(btDevice: BluetoothDevice): Promise<BleDeviceInfo> {
    intentionalDisconnect = false;
    clearDisconnectListener();
    device = btDevice;
    disconnectListener = handleUnexpectedDisconnect;
    device.addEventListener('gattserverdisconnected', disconnectListener);
    server = await device.gatt!.connect();
    try {
      await server.getPrimaryService(FTMS_SERVICE);
    } catch {
      intentionalDisconnect = true;
      try {
        server.disconnect();
      } catch {}
      clearDisconnectListener();
      device = null;
      server = null;
      intentionalDisconnect = false;
      throw new Error('Not an FTMS machine (missing service 00001826-…).');
    }
    return { id: device.id, name: device.name ?? null };
  }

  return {
    isAvailable() {
      return typeof navigator !== 'undefined' && !!navigator.bluetooth;
    },

    async requestFtmsDevice() {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth is not available. Use Chrome or Edge.');
      }
      const btDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [FTMS_SERVICE],
      });
      return finishConnect(btDevice);
    },

    async disconnect() {
      intentionalDisconnect = true;
      await this.stopNotifications();
      clearDisconnectListener();
      if (device?.gatt?.connected) device.gatt.disconnect();
      device = null;
      server = null;
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
      return device ? { id: device.id, name: device.name ?? null } : null;
    },

    isLinkConnected() {
      return !!device?.gatt?.connected;
    },

    setConnectionLostHandler(handler) {
      connectionLostHandler = handler;
    },
  };
}
