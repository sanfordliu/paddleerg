import type { BleAdapter } from './types';

export function createNativeBleAdapter(): BleAdapter {
  const unavailable = () => {
    throw new Error(
      'Native BLE is not wired yet. Use Chrome on Mac for Web Bluetooth, or implement react-native-ble-plx in a development build.'
    );
  };
  return {
    isAvailable: () => false,
    requestFtmsDevice: async () => unavailable(),
    reconnectRememberedDevice: async () => null,
    startAutoReconnect: () => {},
    stopAutoReconnect: () => {},
    hasLiveDevice: () => false,
    hasRememberedDevice: () => false,
    getRememberedDeviceInfo: () => null,
    disconnect: async () => {},
    discover: async () => unavailable(),
    startNotifications: async () => unavailable(),
    stopNotifications: async () => {},
    getConnectedDevice: () => null,
    isLinkConnected: () => false,
    setConnectionLostHandler: () => {},
  };
}
