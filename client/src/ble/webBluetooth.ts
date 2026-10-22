import {
  CROSS_TRAINER_DATA,
  FTMS_SERVICE,
  KNOWN_CHARACTERISTICS,
  ROWER_DATA,
  normalizeUuid,
} from './constants';
import { bytesToHex } from './ftms';
import type { BleAdapter, GattServiceInfo, NotificationEvent } from './types';
import { WebBluetoothSession } from './webBluetoothSession';

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

class FtmsWebBluetoothSession extends WebBluetoothSession implements BleAdapter {
  private notifyHandler: NotifyHandler | null = null;
  private readonly boundChars: BluetoothRemoteGATTCharacteristic[] = [];

  private readonly onCharacteristicValueChanged = (ev: Event) => {
    const target = ev.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value || !this.notifyHandler) return;
    const bytes = new Uint8Array(
      value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)
    );
    this.notifyHandler({
      serviceUuid: target.service?.uuid ?? '',
      characteristicUuid: target.uuid,
      value: bytes,
      hex: bytesToHex(bytes),
      receivedAt: Date.now(),
    });
  };

  protected rememberStorageKey(): string | null {
    return REMEMBERED_DEVICE_KEY;
  }

  protected requiredServiceUuid(): string {
    return FTMS_SERVICE;
  }

  protected missingServiceMessage(): string {
    return 'Not an FTMS machine (missing service 00001826-…).';
  }

  protected clearNotificationBindings(): void {
    this.boundChars.length = 0;
    this.notifyHandler = null;
  }

  protected async stopNotificationsInternal(): Promise<void> {
    for (const char of this.boundChars) {
      try {
        char.removeEventListener('characteristicvaluechanged', this.onCharacteristicValueChanged);
        await char.stopNotifications();
      } catch {}
    }
    this.clearNotificationBindings();
  }

  async requestFtmsDevice() {
    // Migrate legacy id-only key once
    try {
      const legacy = localStorage.getItem('paddleerg-ble-device-id');
      if (legacy && !localStorage.getItem(REMEMBERED_DEVICE_KEY)) {
        localStorage.setItem(
          REMEMBERED_DEVICE_KEY,
          JSON.stringify({ id: legacy, name: null })
        );
        localStorage.removeItem('paddleerg-ble-device-id');
      }
    } catch {}
    return this.requestFilteredDevice(FTMS_SERVICE);
  }

  async discover(): Promise<GattServiceInfo[]> {
    if (!this.server) throw new Error('Not connected');
    const services = await this.server.getPrimaryServices();
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
  }

  async startNotifications(onNotification: NotifyHandler): Promise<void> {
    if (!this.server) throw new Error('Not connected');
    await this.stopNotificationsInternal();
    this.notifyHandler = onNotification;
    const service = await this.server.getPrimaryService(FTMS_SERVICE);
    const chars = await service.getCharacteristics();
    for (const char of chars) {
      if (!FTMS_NOTIFY_CHARS.has(normalizeUuid(char.uuid))) continue;
      if (!char.properties.notify && !char.properties.indicate) continue;
      char.addEventListener('characteristicvaluechanged', this.onCharacteristicValueChanged);
      await char.startNotifications();
      this.boundChars.push(char);
    }
    if (this.boundChars.length === 0) {
      throw new Error('Connected, but no FTMS rower/cross-trainer data characteristic found.');
    }
  }

  async stopNotifications(): Promise<void> {
    await this.stopNotificationsInternal();
  }
}

export function createWebBluetoothAdapter(): BleAdapter {
  return new FtmsWebBluetoothSession();
}
