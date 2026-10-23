import {
  buildAuthorizeUrl,
  exchangeAuthorizationCode,
  refreshAccessToken,
} from '../oauth';

describe('strava oauth helpers', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.STRAVA_CLIENT_ID = 'cid';
    process.env.STRAVA_CLIENT_SECRET = 'csecret';
    process.env.STRAVA_REDIRECT_URI = 'http://localhost/strava/callback';
  });

  afterEach(() => {
    process.env = { ...prev };
    jest.restoreAllMocks();
  });

  test('buildAuthorizeUrl', () => {
    const url = new URL(buildAuthorizeUrl('st'));
    expect(url.origin + url.pathname).toBe('https://www.strava.com/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('state')).toBe('st');
    expect(url.searchParams.get('scope')).toBe('activity:write,read');
  });

  test('exchangeAuthorizationCode success', async () => {
    const fetchMock = jest.spyOn(global, 'fetch' as never).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'at',
        refresh_token: 'rt',
        expires_at: 99,
        athlete: { id: 7 },
      }),
    } as never);

    await expect(exchangeAuthorizationCode('code-1')).resolves.toEqual({
      access_token: 'at',
      refresh_token: 'rt',
      expires_at: 99,
      athlete: { id: 7 },
    });
    expect(fetchMock).toHaveBeenCalled();
  });

  test('refreshAccessToken maps Strava errors', async () => {
    jest.spyOn(global, 'fetch' as never).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'bad refresh' }),
    } as never);

    await expect(refreshAccessToken('rt')).rejects.toThrow(/bad refresh/);
  });

  test('token response missing fields', async () => {
    jest.spyOn(global, 'fetch' as never).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'only' }),
    } as never);

    await expect(exchangeAuthorizationCode('x')).rejects.toThrow(/missing fields/);
  });
});
