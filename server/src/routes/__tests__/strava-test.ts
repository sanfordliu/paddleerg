import request from 'supertest';
import { createApp } from '../../app';
import * as oauth from '../../strava/oauth';
import { createSession } from '../../strava/sessions';

describe('strava routes', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.STRAVA_CLIENT_ID = 'cid';
    process.env.STRAVA_CLIENT_SECRET = 'csecret';
    process.env.STRAVA_REDIRECT_URI = 'http://api.test/strava/callback';
    process.env.CLIENT_RETURN_URL = 'http://app.test';
    process.env.CORS_ORIGINS = 'http://app.test';
  });

  afterEach(() => {
    process.env = { ...prev };
    jest.restoreAllMocks();
  });

  test('GET /strava/authorize redirects to Strava', async () => {
    const res = await request(createApp()).get('/strava/authorize?state=abc');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('https://www.strava.com/oauth/authorize');
    expect(res.headers.location).toContain('state=abc');
  });

  test('GET /strava/authorize returns 500 when env missing', async () => {
    delete process.env.STRAVA_CLIENT_ID;
    const res = await request(createApp()).get('/strava/authorize');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/STRAVA_CLIENT_ID/);
  });

  test('callback with error query redirects to client', async () => {
    const res = await request(createApp()).get('/strava/callback?error=access_denied');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://app.test/strava-callback?error=access_denied');
  });

  test('callback without code redirects with missing_code', async () => {
    const res = await request(createApp()).get('/strava/callback');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('missing_code');
  });

  test('callback exchanges code and redirects with sid', async () => {
    jest.spyOn(oauth, 'exchangeAuthorizationCode').mockResolvedValue({
      access_token: 'a',
      refresh_token: 'r',
      expires_at: 1,
    });
    const res = await request(createApp()).get('/strava/callback?code=xyz&state=s1');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/^http:\/\/app\.test\/strava-callback\?sid=.+&state=s1$/);
  });

  test('callback maps exchange failures', async () => {
    jest.spyOn(oauth, 'exchangeAuthorizationCode').mockRejectedValue(new Error('nope'));
    const res = await request(createApp()).get('/strava/callback?code=xyz');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('error=nope');
  });

  test('session redeem is one-time', async () => {
    const sid = createSession({ access_token: 'a', refresh_token: 'r', expires_at: 1 });
    const app = createApp();
    const ok = await request(app).get(`/strava/session/${sid}`);
    expect(ok.status).toBe(200);
    expect(ok.body.access_token).toBe('a');
    const again = await request(app).get(`/strava/session/${sid}`);
    expect(again.status).toBe(404);
  });

  test('token refresh validates body and proxies', async () => {
    const app = createApp();
    expect((await request(app).post('/strava/token').send({})).status).toBe(400);
    expect(
      (await request(app).post('/strava/token').send({ grant_type: 'refresh_token' })).status
    ).toBe(400);

    jest.spyOn(oauth, 'refreshAccessToken').mockResolvedValue({
      access_token: 'a2',
      refresh_token: 'r2',
      expires_at: 2,
    });
    const ok = await request(app)
      .post('/strava/token')
      .send({ grant_type: 'refresh_token', refresh_token: 'r' });
    expect(ok.status).toBe(200);
    expect(ok.body.access_token).toBe('a2');

    jest.spyOn(oauth, 'refreshAccessToken').mockRejectedValue(new Error('down'));
    const bad = await request(app)
      .post('/strava/token')
      .send({ grant_type: 'refresh_token', refresh_token: 'r' });
    expect(bad.status).toBe(502);
  });
});
