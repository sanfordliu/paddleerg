import { CROSS_TRAINER_DATA, ROWER_DATA } from '@/src/ble/constants';
import {
  bytesToHex,
  parseCrossTrainerData,
  parseFtmsNotification,
  parseRowerData,
} from '@/src/ble/ftms';

describe('ftms parsers', () => {
  test('bytesToHex', () => {
    expect(bytesToHex(new Uint8Array([0x0a, 0xff]))).toBe('0a ff');
  });

  test('parseRowerData from known fixture', () => {
    // flags = 0x082C = bits 2,3,5,11 — distance, inst pace, inst power, elapsed
    const flags = 0x082c;
    const bytes = new Uint8Array([
      flags & 0xff,
      (flags >> 8) & 0xff,
      40, // stroke rate raw => 20.0 SPM
      0x10,
      0x00, // stroke count 16
      0xe8,
      0x03,
      0x00, // distance 1000 m
      0x78,
      0x00, // pace 120 s /500m
      0x64,
      0x00, // power 100 W
      0x2c,
      0x01, // elapsed 300 s
    ]);

    const parsed = parseRowerData(bytes);
    expect(parsed.strokeRateSpm).toBe(20);
    expect(parsed.strokeCount).toBe(16);
    expect(parsed.distanceMeters).toBe(1000);
    expect(parsed.instantaneousPaceSecondsPer500m).toBe(120);
    expect(parsed.instantaneousPowerWatts).toBe(100);
    expect(parsed.elapsedSeconds).toBe(300);
  });

  test('parseRowerData returns empty for short payload', () => {
    expect(parseRowerData(new Uint8Array([1]))).toEqual({});
  });

  test('parseRowerData optional average/resistance/energy/hr fields', () => {
    // More complete flag set: stroke present (bit0 clear), avg pace, avg power,
    // resistance, total energy, HR, elapsed.
    // bits: 0 clear, 4 avg pace, 6 avg power, 7 resistance, 8 energy, 9 HR, 11 elapsed
    const flags = 0x0bd0; // 0x0800|0x0200|0x0100|0x0080|0x0040|0x0010
    const bytes = new Uint8Array([
      flags & 0xff,
      (flags >> 8) & 0xff,
      30, // stroke rate raw => 15
      0x05,
      0x00, // strokes 5
      0x64,
      0x00, // avg pace 100
      0x50,
      0x00, // avg power 80
      0x02,
      0x00, // resistance 2
      0x2c,
      0x01, // total energy 300
      0x00,
      0x00,
      0x00, // energy remainder (5 bytes total for energy block)
      0x4b, // HR 75
      0x2c,
      0x01, // elapsed 300
    ]);
    const parsed = parseRowerData(bytes);
    expect(parsed.strokeRateSpm).toBe(15);
    expect(parsed.averagePaceSecondsPer500m).toBe(100);
    expect(parsed.averagePowerWatts).toBe(80);
    expect(parsed.resistanceLevel).toBe(2);
    expect(parsed.totalEnergyKcal).toBe(300);
    expect(parsed.heartRateBpm).toBe(75);
    expect(parsed.elapsedSeconds).toBe(300);
  });

  test('parseCrossTrainerData reads distance when flagged', () => {
    // flags bit2 set in 24-bit flags; then skip speed (bit0 clear adds 2), skip cadence (bit1), distance
    const flags = 0x0004;
    const bytes = new Uint8Array([
      flags & 0xff,
      (flags >> 8) & 0xff,
      (flags >> 16) & 0xff,
      0xe8,
      0x03,
      0x00, // 1000 m
    ]);
    // bit0 clear means skip 2 bytes of instantaneous speed first
    const withSpeedSkip = new Uint8Array([
      flags & 0xff,
      (flags >> 8) & 0xff,
      (flags >> 16) & 0xff,
      0,
      0, // speed skip
      0xe8,
      0x03,
      0x00,
    ]);
    expect(parseCrossTrainerData(new Uint8Array([1, 2]))).toEqual({});
    expect(parseCrossTrainerData(withSpeedSkip).distanceMeters).toBe(1000);
    expect(parseCrossTrainerData(bytes).distanceMeters).toBeUndefined();
  });

  test('parseFtmsNotification routes by characteristic', () => {
    const flags = 0x0800;
    const rower = new Uint8Array([flags & 0xff, (flags >> 8) & 0xff, 0x2c, 0x01]);
    expect(parseFtmsNotification(ROWER_DATA, rower)?.elapsedSeconds).toBe(300);
    expect(parseFtmsNotification('2ad1', rower)?.elapsedSeconds).toBe(300);
    expect(parseFtmsNotification(CROSS_TRAINER_DATA, new Uint8Array([0, 0, 0]))).toEqual({
      rawFlags: 0,
    });
    expect(parseFtmsNotification('00002a37-0000-1000-8000-00805f9b34fb', rower)).toBeNull();
  });
});
