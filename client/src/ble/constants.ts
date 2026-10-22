export const FTMS_SERVICE = '00001826-0000-1000-8000-00805f9b34fb';
export const FITNESS_MACHINE_FEATURE = '00002acc-0000-1000-8000-00805f9b34fb';
export const ROWER_DATA = '00002ad1-0000-1000-8000-00805f9b34fb';
export const CROSS_TRAINER_DATA = '00002ace-0000-1000-8000-00805f9b34fb';

/** Bluetooth SIG Heart Rate Profile */
export const HEART_RATE_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
export const HEART_RATE_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';

export const KNOWN_CHARACTERISTICS: Record<string, string> = {
  [FITNESS_MACHINE_FEATURE]: 'Fitness Machine Feature',
  [ROWER_DATA]: 'Rower Data',
  [CROSS_TRAINER_DATA]: 'Cross Trainer Data',
  [HEART_RATE_MEASUREMENT]: 'Heart Rate Measurement',
};

export function normalizeUuid(uuid: string): string {
  const u = uuid.toLowerCase().replace(/-/g, '');
  if (u.length === 4) return `0000${u}-0000-1000-8000-00805f9b34fb`;
  if (u.length === 8) return `${u}-0000-1000-8000-00805f9b34fb`;
  if (uuid.includes('-')) return uuid.toLowerCase();
  return `${u.slice(0, 8)}-${u.slice(8, 12)}-${u.slice(12, 16)}-${u.slice(16, 20)}-${u.slice(20)}`;
}

export function shortUuid(uuid: string): string {
  const n = normalizeUuid(uuid).replace(/-/g, '');
  if (n.startsWith('0000') && n.endsWith('00001000800000805f9b34fb')) return n.slice(4, 8);
  return normalizeUuid(uuid);
}
