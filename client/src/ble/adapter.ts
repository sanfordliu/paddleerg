import { Platform } from 'react-native';
import type { BleAdapter } from './types';
import { createWebBluetoothAdapter } from './webBluetooth';
import { createNativeBleAdapter } from './nativeStub';

let singleton: BleAdapter | null = null;

export function getBleAdapter(): BleAdapter {
  if (!singleton) {
    singleton = Platform.OS === 'web' ? createWebBluetoothAdapter() : createNativeBleAdapter();
  }
  return singleton;
}

export function isWebBluetoothSupported(): boolean {
  return Platform.OS === 'web' && typeof navigator !== 'undefined' && !!navigator.bluetooth;
}
