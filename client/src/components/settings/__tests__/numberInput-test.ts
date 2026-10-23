import { numStr, parseNum, parsePace, paceStr } from '@/src/components/settings/numberInput';

describe('numberInput helpers', () => {
  test('parseNum / numStr', () => {
    expect(parseNum('')).toBeNull();
    expect(parseNum(' 12.5 ')).toBe(12.5);
    expect(parseNum('x')).toBeNull();
    expect(numStr(null)).toBe('');
    expect(numStr(3)).toBe('3');
  });

  test('parsePace accepts m:ss or seconds', () => {
    expect(parsePace('')).toBeNull();
    expect(parsePace('2:30')).toBe(150);
    expect(parsePace('150')).toBe(150);
    expect(parsePace('2:99')).toBeNull();
  });

  test('paceStr formats seconds', () => {
    expect(paceStr(null)).toBe('');
    expect(paceStr(150)).toBe('2:30');
    expect(paceStr(0)).toBe('');
  });
});
