import { Router } from 'express';
import { randomBytes } from 'crypto';
import { getStravaConfig } from '../strava/config';
import {
  buildAuthorizeUrl,
  exchangeAuthorizationCode,
  refreshAccessToken,
} from '../strava/oauth';
import { createSession, takeSession } from '../strava/sessions';

export const stravaRouter = Router();

stravaRouter.get('/strava/authorize', (req, res) => {
  try {
    const state =
      typeof req.query.state === 'string' && req.query.state
        ? req.query.state
        : randomBytes(16).toString('hex');
    const url = buildAuthorizeUrl(state);
    res.redirect(302, url);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

stravaRouter.get('/strava/callback', async (req, res) => {
  const { clientReturnUrl } = getStravaConfig();
  const returnBase = `${clientReturnUrl.replace(/\/$/, '')}/strava-callback`;

  if (typeof req.query.error === 'string' && req.query.error) {
    const params = new URLSearchParams({ error: req.query.error });
    res.redirect(302, `${returnBase}?${params.toString()}`);
    return;
  }

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  if (!code) {
    const params = new URLSearchParams({ error: 'missing_code' });
    res.redirect(302, `${returnBase}?${params.toString()}`);
    return;
  }

  try {
    const tokens = await exchangeAuthorizationCode(code);
    const sid = createSession(tokens);
    const params = new URLSearchParams({ sid });
    if (typeof req.query.state === 'string' && req.query.state) {
      params.set('state', req.query.state);
    }
    res.redirect(302, `${returnBase}?${params.toString()}`);
  } catch (e) {
    const params = new URLSearchParams({
      error: e instanceof Error ? e.message : String(e),
    });
    res.redirect(302, `${returnBase}?${params.toString()}`);
  }
});

stravaRouter.get('/strava/session/:sid', (req, res) => {
  const tokens = takeSession(req.params.sid);
  if (!tokens) {
    res.status(404).json({ error: 'Session not found or already used' });
    return;
  }
  res.json(tokens);
});

stravaRouter.post('/strava/token', async (req, res) => {
  const { grant_type, refresh_token } = req.body ?? {};
  if (grant_type !== 'refresh_token') {
    res.status(400).json({
      error: 'grant_type must be refresh_token (authorization_code is handled via /strava/callback)',
    });
    return;
  }
  if (!refresh_token || typeof refresh_token !== 'string') {
    res.status(400).json({ error: 'refresh_token required' });
    return;
  }
  try {
    const tokens = await refreshAccessToken(refresh_token);
    res.json(tokens);
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : String(e) });
  }
});
