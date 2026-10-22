import type { BleDeviceInfo, ConnectionLostHandler } from './types';

function deviceInfo(bt: BluetoothDevice): BleDeviceInfo {
  return { id: bt.id, name: bt.name ?? null };
}

function readRemembered(key: string): BleDeviceInfo | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string; name?: string | null };
    if (!parsed?.id) return null;
    return { id: parsed.id, name: parsed.name ?? null };
  } catch {
    return null;
  }
}

function writeRemembered(key: string, info: BleDeviceInfo | null) {
  try {
    if (info) localStorage.setItem(key, JSON.stringify(info));
    else localStorage.removeItem(key);
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Shared Web Bluetooth session: GATT connect, disconnect handling, and
 * same-page-session auto-reconnect. Subclasses supply the required service
 * and notification lifecycle.
 */
export abstract class WebBluetoothSession {
  protected device: BluetoothDevice | null = null;
  protected server: BluetoothRemoteGATTServer | null = null;
  protected connectionLostHandler: ConnectionLostHandler | null = null;
  protected intentionalDisconnect = false;

  private disconnectListener: (() => void) | null = null;
  private autoReconnectActive = false;
  private autoReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private autoReconnectAttempt = 0;
  private autoReconnectCallback: ((device: BleDeviceInfo) => void) | null = null;
  private connectInFlight = false;

  /** localStorage key for last-picked device metadata, or null to skip. */
  protected abstract rememberStorageKey(): string | null;
  protected abstract requiredServiceUuid(): string;
  protected abstract missingServiceMessage(): string;
  /** Drop notification listeners/handlers without touching GATT. */
  protected abstract clearNotificationBindings(): void;
  protected abstract stopNotificationsInternal(): Promise<void>;

  isAvailable(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.bluetooth;
  }

  protected assertBluetooth(): void {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth is not available. Use Chrome or Edge.');
    }
  }

  /**
   * Establish GATT + verify required service. Does NOT stop the auto-reconnect
   * loop — callers stop it after a successful handoff.
   */
  protected async finishConnect(btDevice: BluetoothDevice): Promise<BleDeviceInfo> {
    this.intentionalDisconnect = false;
    this.clearDisconnectListener();
    this.device = btDevice;
    const key = this.rememberStorageKey();
    if (key) writeRemembered(key, deviceInfo(btDevice));
    this.disconnectListener = () => this.handleUnexpectedDisconnect();
    this.device.addEventListener('gattserverdisconnected', this.disconnectListener);

    if (!this.device.gatt) {
      throw new Error('Bluetooth device has no GATT server');
    }
    if (!this.device.gatt.connected) {
      this.server = await this.device.gatt.connect();
    } else {
      this.server = this.device.gatt;
    }

    try {
      await this.server.getPrimaryService(this.requiredServiceUuid());
    } catch {
      this.intentionalDisconnect = true;
      try {
        this.server.disconnect();
      } catch {}
      this.clearDisconnectListener();
      // Keep device handle for possible later reconnect after power-cycle.
      this.device = btDevice;
      this.server = null;
      this.intentionalDisconnect = false;
      throw new Error(this.missingServiceMessage());
    }
    return deviceInfo(this.device);
  }

  protected async requestFilteredDevice(serviceUuid: string): Promise<BleDeviceInfo> {
    this.assertBluetooth();
    this.stopAutoReconnect();
    const btDevice = await navigator.bluetooth!.requestDevice({
      filters: [{ services: [serviceUuid] }],
      optionalServices: [serviceUuid],
    });
    return this.finishConnect(btDevice);
  }

  /**
   * Web Bluetooth only allows silent reconnect while we still hold the
   * BluetoothDevice from this page session.
   */
  protected async attemptGattReconnect(): Promise<BleDeviceInfo | null> {
    if (!this.device?.gatt) return null;
    if (this.connectInFlight) return null;
    this.connectInFlight = true;
    try {
      if (this.device.gatt.connected && this.server) {
        try {
          await this.server.getPrimaryService(this.requiredServiceUuid());
          return deviceInfo(this.device);
        } catch {
          // Stale GATT cache — fall through to full reconnect.
        }
      }
      return await this.finishConnect(this.device);
    } finally {
      this.connectInFlight = false;
    }
  }

  async reconnectRememberedDevice(): Promise<BleDeviceInfo | null> {
    try {
      return await this.attemptGattReconnect();
    } catch {
      return null;
    }
  }

  startAutoReconnect(onReconnected: (device: BleDeviceInfo) => void): void {
    this.stopAutoReconnectInternal();
    if (!this.device) return;
    this.autoReconnectActive = true;
    this.autoReconnectCallback = onReconnected;
    this.autoReconnectAttempt = 0;
    void (async () => {
      if (!this.autoReconnectActive) return;
      try {
        const info = await this.attemptGattReconnect();
        if (info) {
          this.notifyReconnected(info);
          return;
        }
      } catch {
        // Device still offline — keep trying.
      }
      this.autoReconnectAttempt = 1;
      this.scheduleAutoReconnect();
    })();
  }

  stopAutoReconnect(): void {
    this.stopAutoReconnectInternal();
  }

  hasLiveDevice(): boolean {
    return !!this.device;
  }

  hasRememberedDevice(): boolean {
    const key = this.rememberStorageKey();
    return !!this.device || (!!key && !!readRemembered(key));
  }

  getRememberedDeviceInfo(): BleDeviceInfo | null {
    if (this.device) return deviceInfo(this.device);
    const key = this.rememberStorageKey();
    return key ? readRemembered(key) : null;
  }

  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    this.stopAutoReconnectInternal();
    await this.stopNotificationsInternal();
    this.clearDisconnectListener();
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
    this.device = null;
    this.server = null;
    const key = this.rememberStorageKey();
    if (key) writeRemembered(key, null);
    this.intentionalDisconnect = false;
  }

  getConnectedDevice(): BleDeviceInfo | null {
    return this.device?.gatt?.connected ? deviceInfo(this.device) : null;
  }

  isLinkConnected(): boolean {
    return !!this.device?.gatt?.connected;
  }

  setConnectionLostHandler(handler: ConnectionLostHandler | null): void {
    this.connectionLostHandler = handler;
  }

  private clearDisconnectListener() {
    if (this.device && this.disconnectListener) {
      this.device.removeEventListener('gattserverdisconnected', this.disconnectListener);
    }
    this.disconnectListener = null;
  }

  private handleUnexpectedDisconnect() {
    this.server = null;
    this.clearNotificationBindings();
    // Keep `device` so we can gatt.connect() again without a chooser.
    if (!this.intentionalDisconnect) this.connectionLostHandler?.();
  }

  private stopAutoReconnectInternal() {
    this.autoReconnectActive = false;
    this.autoReconnectCallback = null;
    this.autoReconnectAttempt = 0;
    if (this.autoReconnectTimer) {
      clearTimeout(this.autoReconnectTimer);
      this.autoReconnectTimer = null;
    }
  }

  private notifyReconnected(info: BleDeviceInfo) {
    if (!this.autoReconnectActive) return;
    const cb = this.autoReconnectCallback;
    this.stopAutoReconnectInternal();
    cb?.(info);
  }

  private scheduleAutoReconnect() {
    if (!this.autoReconnectActive) return;
    const delayMs = Math.min(8_000, 750 * 2 ** Math.min(this.autoReconnectAttempt, 3));
    this.autoReconnectTimer = setTimeout(() => {
      void (async () => {
        if (!this.autoReconnectActive) return;
        try {
          const info = await this.attemptGattReconnect();
          if (info) {
            this.notifyReconnected(info);
            return;
          }
        } catch {
          // Device still offline / out of range — keep trying.
        }
        this.autoReconnectAttempt += 1;
        this.scheduleAutoReconnect();
      })();
    }, delayMs);
  }
}
