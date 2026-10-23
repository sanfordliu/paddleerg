import { normalizeUuid, shortUuid, ROWER_DATA } from '@/src/ble/constants';

describe('ble constants', () => {
  test('normalizeUuid expands short forms', () => {
    expect(normalizeUuid('2ad1')).toBe(ROWER_DATA);
    expect(normalizeUuid('00002ad1')).toBe(ROWER_DATA);
    expect(normalizeUuid(ROWER_DATA.toUpperCase())).toBe(ROWER_DATA);
  });

  test('shortUuid collapses SIG uuids', () => {
    expect(shortUuid(ROWER_DATA)).toBe('2ad1');
    expect(shortUuid('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toBe(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    );
  });
});
