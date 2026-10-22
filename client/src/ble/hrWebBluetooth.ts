import { HEART_RATE_MEASUREMENT, HEART_RATE_SERVICE, normalizeUuid } from './constants';
import { parseHeartRateMeasurement } from './heartRate';
import type { BleDeviceInfo, ConnectionLostHandler, HrBleAdapter } from './types';

const HR_MEASUREMENT = normalizeUuid(HEART_RATE_MEASUREMENT);

export function createHrWebBluetoothAdapter(): HrBleAdapter {
  let device: BluetoothDevice | null = null;
  let server: BluetoothRemoteGATTServer | null = null;
  let bpmHandler: ((bpm: number) => void) | null = null;
  let connectionLostHandler: ConnectionLostHandler | null = null;
  let intentionalDisconnect = false;
  let boundChar: BluetoothRemoteGATTCharacteristic | null = null;
  let disconnectListener: (() => void) | null = null;

  const onCharacteristicValueChanged = (ev: Event) => {
    const target = ev.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value || !bpmHandler) return;
    const bytes = new Uint8Array(
      value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)
    );
    const bpm = parseHeartRateMeasurement(bytes);
    if (bpm != null) bpmHandler(bpm);
  };

  function clearDisconnectListener() {
    if (device && disconnectListener) {
      device.removeEventListener('gattserverdisconnected', disconnectListener);
    }
    disconnectListener = null;
  }

  function handleUnexpectedDisconnect() {
    server = null;
    boundChar = null;
    bpmHandler = null;
    if (!intentionalDisconnect) connectionLostHandler?.();
  }

  function deviceInfo(bt: BluetoothDevice): BleDeviceInfo {
    return { id: bt.id, name: bt.name ?? null };
  }

  return {
    isAvailable() {
      return typeof navigator !== 'undefined' && !!navigator.bluetooth;
    },

    async requestHeartRateDevice() {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth is not available. Use Chrome or Edge.');
      }
      await this.disconnect();
      intentionalDisconnect = false;
      const btDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HEART_RATE_SERVICE] }],
        optionalServices: [HEART_RATE_SERVICE],
      });

      clearDisconnectListener();
      device = btDevice;
      disconnectListener = handleUnexpectedDisconnect;
      device.addEventListener('gattserverdisconnected', disconnectListener);

      if (!device.gatt) {
        throw new Error('Bluetooth device has no GATT server');
      }
      server = device.gatt.connected ? device.gatt : await device.gatt.connect();

      try {
        await server.getPrimaryService(HEART_RATE_SERVICE);
      } catch {
        intentionalDisconnect = true;
        try {
          server.disconnect();
        } catch {}
        clearDisconnectListener();
        device = null;
        server = null;
        intentionalDisconnect = false;
        throw new Error('Not a heart rate monitor (missing service 0000180d-…).');
      }
      return deviceInfo(device);
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

    async startNotifications(onBpm) {
      if (!server) throw new Error('Not connected');
      await this.stopNotifications();
      bpmHandler = onBpm;
      const service = await server.getPrimaryService(HEART_RATE_SERVICE);
      const char = await service.getCharacteristic(HR_MEASUREMENT);
      if (!char.properties.notify && !char.properties.indicate) {
        throw new Error('Heart rate characteristic does not support notifications.');
      }
      char.addEventListener('characteristicvaluechanged', onCharacteristicValueChanged);
      await char.startNotifications();
      boundChar = char;
    },

    async stopNotifications() {
      if (boundChar) {
        try {
          boundChar.removeEventListener('characteristicvaluechanged', onCharacteristicValueChanged);
          await boundChar.stopNotifications();
        } catch {}
        boundChar = null;
      }
      bpmHandler = null;
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
