export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'reconnecting'
  | 'connected'
  | 'error';

export interface BleDeviceInfo {
  id: string;
  name: string | null;
}

export interface GattCharacteristicInfo {
  uuid: string;
  name?: string;
  properties: string[];
}

export interface GattServiceInfo {
  uuid: string;
  characteristics: GattCharacteristicInfo[];
}

export interface NotificationEvent {
  serviceUuid?: string;
  characteristicUuid: string;
  value: Uint8Array;
  hex?: string;
  receivedAt?: number;
}

export interface LiveMetrics {
  elapsedSeconds?: number;
  distanceMeters?: number;
  strokeRateSpm?: number;
  strokeCount?: number;
  averagePaceSecondsPer500m?: number;
  instantaneousPaceSecondsPer500m?: number;
  instantaneousPowerWatts?: number;
  averagePowerWatts?: number;
  totalEnergyKcal?: number;
  heartRateBpm?: number;
  resistanceLevel?: number;
  rawFlags?: number;
}

export interface WorkoutSample {
  t: number;
  metrics: LiveMetrics;
}

export type ConnectionLostHandler = () => void;

export interface BleAdapter {
  isAvailable(): boolean;
  requestFtmsDevice(): Promise<BleDeviceInfo>;
  /** Reconnect to the in-memory / previously permitted device, or null if none. */
  reconnectRememberedDevice(): Promise<BleDeviceInfo | null>;
  /**
   * Keep retrying GATT connect until success or stopAutoReconnect().
   * Calls onReconnected once a link is restored.
   */
  startAutoReconnect(onReconnected: (device: BleDeviceInfo) => void): void;
  stopAutoReconnect(): void;
  /** True only while this page still holds a BluetoothDevice (same browsing session). */
  hasLiveDevice(): boolean;
  hasRememberedDevice(): boolean;
  getRememberedDeviceInfo(): BleDeviceInfo | null;
  disconnect(): Promise<void>;
  discover(): Promise<GattServiceInfo[]>;
  startNotifications(onNotification: (event: NotificationEvent) => void): Promise<void>;
  stopNotifications(): Promise<void>;
  getConnectedDevice(): BleDeviceInfo | null;
  isLinkConnected(): boolean;
  setConnectionLostHandler(handler: ConnectionLostHandler | null): void;
}
