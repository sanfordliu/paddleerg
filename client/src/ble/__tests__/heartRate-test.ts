import { HEART_RATE_MEASUREMENT } from '@/src/ble/constants';
import { parseHeartRateMeasurement, parseHeartRateNotification } from '@/src/ble/heartRate';

describe('heart rate parser', () => {
  test('uint8 bpm', () => {
    expect(parseHeartRateMeasurement(new Uint8Array([0x00, 72]))).toBe(72);
  });

  test('uint16 bpm when flag set', () => {
    expect(parseHeartRateMeasurement(new Uint8Array([0x01, 0x2c, 0x01]))).toBe(300);
  });

  test('rejects short or zero', () => {
    expect(parseHeartRateMeasurement(new Uint8Array([0x00]))).toBeNull();
    expect(parseHeartRateMeasurement(new Uint8Array([0x00, 0]))).toBeNull();
    expect(parseHeartRateMeasurement(new Uint8Array([0x01, 0x2c]))).toBeNull();
  });

  test('notification filters by characteristic uuid', () => {
    const data = new Uint8Array([0x00, 80]);
    expect(parseHeartRateNotification(HEART_RATE_MEASUREMENT, data)).toBe(80);
    expect(parseHeartRateNotification('2a37', data)).toBe(80);
    expect(parseHeartRateNotification('2ad1', data)).toBeNull();
  });
});
