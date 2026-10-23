import { getCorsOrigins, getStravaConfig, requireEnv } from '../config';

describe('strava config', () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  test('requireEnv throws when missing', () => {
    delete process.env.FOO_TEST;
    expect(() => requireEnv('FOO_TEST')).toThrow(/FOO_TEST/);
  });

  test('getStravaConfig reads env with defaults', () => {
    process.env.STRAVA_CLIENT_ID = 'id';
    process.env.STRAVA_CLIENT_SECRET = 'secret';
    delete process.env.STRAVA_REDIRECT_URI;
    delete process.env.CLIENT_RETURN_URL;
    delete process.env.STRAVA_SCOPES;
    expect(getStravaConfig()).toEqual({
      clientId: 'id',
      clientSecret: 'secret',
      redirectUri: 'http://localhost:8788/strava/callback',
      clientReturnUrl: 'http://localhost:8081',
      scopes: 'activity:write,read',
    });
  });

  test('getCorsOrigins', () => {
    delete process.env.CORS_ORIGINS;
    expect(getCorsOrigins()).toBe(true);
    process.env.CORS_ORIGINS = '*';
    expect(getCorsOrigins()).toBe(true);
    process.env.CORS_ORIGINS = 'http://a.com, http://b.com';
    expect(getCorsOrigins()).toEqual(['http://a.com', 'http://b.com']);
  });
});
