export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

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
  disconnect(): Promise<void>;
  discover(): Promise<GattServiceInfo[]>;
  startNotifications(onNotification: (event: NotificationEvent) => void): Promise<void>;
  stopNotifications(): Promise<void>;
  getConnectedDevice(): BleDeviceInfo | null;
  isLinkConnected(): boolean;
  setConnectionLostHandler(handler: ConnectionLostHandler | null): void;
}
