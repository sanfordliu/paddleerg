import { parseRowerData } from '../src/ble/ftms';

// Flags: stroke rate+count (bit0=0), distance, inst pace, inst power, elapsed
// flags = 0x082C = bits 2,3,5,11
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
console.log(parsed);

const ok =
  parsed.strokeRateSpm === 20 &&
  parsed.strokeCount === 16 &&
  parsed.distanceMeters === 1000 &&
  parsed.instantaneousPaceSecondsPer500m === 120 &&
  parsed.instantaneousPowerWatts === 100 &&
  parsed.elapsedSeconds === 300;

if (!ok) {
  console.error('FTMS parse test FAILED');
  process.exit(1);
}
console.log('FTMS parse test OK');
