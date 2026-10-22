import { HEART_RATE_MEASUREMENT, normalizeUuid } from './constants';

const HR_MEASUREMENT = normalizeUuid(HEART_RATE_MEASUREMENT);

/**
 * Parse Heart Rate Measurement (0x2A37).
 * Spec: Heart Rate Service 1.0 — flags bit0 = UINT16 BPM, else UINT8.
 */
export function parseHeartRateMeasurement(data: Uint8Array): number | null {
  if (data.length < 2) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const flags = view.getUint8(0);
  const bpm =
    flags & 0x01
      ? data.length >= 3
        ? view.getUint16(1, true)
        : null
      : view.getUint8(1);
  if (bpm == null || bpm <= 0) return null;
  return bpm;
}

export function parseHeartRateNotification(
  characteristicUuid: string,
  data: Uint8Array
): number | null {
  if (normalizeUuid(characteristicUuid) !== HR_MEASUREMENT) return null;
  return parseHeartRateMeasurement(data);
}
