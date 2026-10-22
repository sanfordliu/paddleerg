import type { HrBleAdapter } from './types';

export function createNativeHrBleAdapter(): HrBleAdapter {
  const unavailable = () => {
    throw new Error(
      'Native BLE heart rate is not wired yet. Use Chrome on Mac for Web Bluetooth.'
    );
  };
  return {
    isAvailable: () => false,
    requestHeartRateDevice: async () => unavailable(),
    disconnect: async () => {},
    startNotifications: async () => unavailable(),
    stopNotifications: async () => {},
    getConnectedDevice: () => null,
    isLinkConnected: () => false,
    setConnectionLostHandler: () => {},
  };
}
