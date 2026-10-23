import { apiUrl, API_URL, stravaAuthorizeUrl } from '@/src/strava/config';

describe('strava client config', () => {
  test('apiUrl joins base and path', () => {
    expect(apiUrl('/strava/token')).toBe(`${API_URL}/strava/token`);
    expect(apiUrl('strava/token')).toBe(`${API_URL}/strava/token`);
  });

  test('stravaAuthorizeUrl includes optional state', () => {
    expect(stravaAuthorizeUrl()).toBe(`${API_URL}/strava/authorize`);
    expect(stravaAuthorizeUrl('abc')).toContain('state=abc');
  });
});
