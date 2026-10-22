import { HEART_RATE_MEASUREMENT, HEART_RATE_SERVICE, normalizeUuid } from './constants';
import { parseHeartRateMeasurement } from './heartRate';
import type { HrBleAdapter } from './types';
import { WebBluetoothSession } from './webBluetoothSession';

const HR_MEASUREMENT = normalizeUuid(HEART_RATE_MEASUREMENT);
const REMEMBERED_HR_KEY = 'paddleerg-ble-hr-device';

class HrWebBluetoothSession extends WebBluetoothSession implements HrBleAdapter {
  private bpmHandler: ((bpm: number) => void) | null = null;
  private boundChar: BluetoothRemoteGATTCharacteristic | null = null;

  private readonly onCharacteristicValueChanged = (ev: Event) => {
    const target = ev.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value || !this.bpmHandler) return;
    const bytes = new Uint8Array(
      value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)
    );
    const bpm = parseHeartRateMeasurement(bytes);
    if (bpm != null) this.bpmHandler(bpm);
  };

  protected rememberStorageKey(): string | null {
    return REMEMBERED_HR_KEY;
  }

  protected requiredServiceUuid(): string {
    return HEART_RATE_SERVICE;
  }

  protected missingServiceMessage(): string {
    return 'Not a heart rate monitor (missing service 0000180d-…).';
  }

  protected clearNotificationBindings(): void {
    this.boundChar = null;
    this.bpmHandler = null;
  }

  protected async stopNotificationsInternal(): Promise<void> {
    if (this.boundChar) {
      try {
        this.boundChar.removeEventListener(
          'characteristicvaluechanged',
          this.onCharacteristicValueChanged
        );
        await this.boundChar.stopNotifications();
      } catch {}
    }
    this.clearNotificationBindings();
  }

  async requestHeartRateDevice() {
    return this.requestFilteredDevice(HEART_RATE_SERVICE);
  }

  async startNotifications(onBpm: (bpm: number) => void): Promise<void> {
    if (!this.server) throw new Error('Not connected');
    await this.stopNotificationsInternal();
    this.bpmHandler = onBpm;
    const service = await this.server.getPrimaryService(HEART_RATE_SERVICE);
    const char = await service.getCharacteristic(HR_MEASUREMENT);
    if (!char.properties.notify && !char.properties.indicate) {
      throw new Error('Heart rate characteristic does not support notifications.');
    }
    char.addEventListener('characteristicvaluechanged', this.onCharacteristicValueChanged);
    await char.startNotifications();
    this.boundChar = char;
  }

  async stopNotifications(): Promise<void> {
    await this.stopNotificationsInternal();
  }
}

export function createHrWebBluetoothAdapter(): HrBleAdapter {
  return new HrWebBluetoothSession();
}
