import { Platform } from 'react-native';
import type { BleAdapter, HrBleAdapter } from './types';
import { createWebBluetoothAdapter } from './webBluetooth';
import { createNativeBleAdapter } from './nativeStub';
import { createHrWebBluetoothAdapter } from './hrWebBluetooth';
import { createNativeHrBleAdapter } from './hrNativeStub';

let singleton: BleAdapter | null = null;
let hrSingleton: HrBleAdapter | null = null;

export function getBleAdapter(): BleAdapter {
  if (!singleton) {
    singleton = Platform.OS === 'web' ? createWebBluetoothAdapter() : createNativeBleAdapter();
  }
  return singleton;
}

export function getHrBleAdapter(): HrBleAdapter {
  if (!hrSingleton) {
    hrSingleton =
      Platform.OS === 'web' ? createHrWebBluetoothAdapter() : createNativeHrBleAdapter();
  }
  return hrSingleton;
}

export function isWebBluetoothSupported(): boolean {
  return Platform.OS === 'web' && typeof navigator !== 'undefined' && !!navigator.bluetooth;
}
