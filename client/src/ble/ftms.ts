import type { LiveMetrics } from './types';
import { CROSS_TRAINER_DATA, ROWER_DATA, normalizeUuid } from './constants';

export function bytesToHex(data: Uint8Array): string {
  return Array.from(data).map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

const ROWER = normalizeUuid(ROWER_DATA);
const CROSS_TRAINER = normalizeUuid(CROSS_TRAINER_DATA);

/** Parse FTMS Rower Data (0x2AD1). Spec: Fitness Machine Service 1.0. */
export function parseRowerData(data: Uint8Array): LiveMetrics {
  if (data.length < 2) return {};

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;
  const flags = view.getUint16(offset, true);
  offset += 2;
  const metrics: LiveMetrics = { rawFlags: flags };

  if ((flags & 0x0001) === 0 && offset + 3 <= data.length) {
    metrics.strokeRateSpm = view.getUint8(offset) / 2;
    offset += 1;
    metrics.strokeCount = view.getUint16(offset, true);
    offset += 2;
  }
  if (flags & 0x0002 && offset + 1 <= data.length) offset += 1;
  if (flags & 0x0004 && offset + 3 <= data.length) {
    metrics.distanceMeters =
      view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);
    offset += 3;
  }
  if (flags & 0x0008 && offset + 2 <= data.length) {
    metrics.instantaneousPaceSecondsPer500m = view.getUint16(offset, true);
    offset += 2;
  }
  if (flags & 0x0010 && offset + 2 <= data.length) {
    metrics.averagePaceSecondsPer500m = view.getUint16(offset, true);
    offset += 2;
  }
  if (flags & 0x0020 && offset + 2 <= data.length) {
    metrics.instantaneousPowerWatts = view.getInt16(offset, true);
    offset += 2;
  }
  if (flags & 0x0040 && offset + 2 <= data.length) {
    metrics.averagePowerWatts = view.getInt16(offset, true);
    offset += 2;
  }
  if (flags & 0x0080 && offset + 2 <= data.length) {
    metrics.resistanceLevel = view.getInt16(offset, true);
    offset += 2;
  }
  if (flags & 0x0100 && offset + 5 <= data.length) {
    metrics.totalEnergyKcal = view.getUint16(offset, true);
    offset += 5;
  }
  if (flags & 0x0200 && offset + 1 <= data.length) {
    metrics.heartRateBpm = view.getUint8(offset);
    offset += 1;
  }
  if (flags & 0x0400 && offset + 1 <= data.length) offset += 1;
  if (flags & 0x0800 && offset + 2 <= data.length) {
    metrics.elapsedSeconds = view.getUint16(offset, true);
  }

  return metrics;
}

/** Best-effort Cross Trainer parse when Rower Data is absent. */
export function parseCrossTrainerData(data: Uint8Array): LiveMetrics {
  if (data.length < 3) return {};
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const flags = view.getUint8(0) | (view.getUint8(1) << 8) | (view.getUint8(2) << 16);
  let offset = 3;
  const metrics: LiveMetrics = { rawFlags: flags };

  if ((flags & 0x0001) === 0 && offset + 2 <= data.length) offset += 2;
  if (flags & 0x0002 && offset + 2 <= data.length) offset += 2;
  if (flags & 0x0004 && offset + 3 <= data.length) {
    metrics.distanceMeters =
      view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);
  }

  return metrics;
}

export function parseFtmsNotification(
  characteristicUuid: string,
  data: Uint8Array
): LiveMetrics | null {
  const uuid = normalizeUuid(characteristicUuid);
  if (uuid === ROWER) return parseRowerData(data);
  if (uuid === CROSS_TRAINER) return parseCrossTrainerData(data);
  return null;
}
