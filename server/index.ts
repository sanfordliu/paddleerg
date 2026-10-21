/**
 * Minimal Strava OAuth token proxy.
 * Keeps client_secret off the device. Run: npm run strava-proxy
 *
 * Required env (server/.env or process env):
 *   STRAVA_CLIENT_ID
 *   STRAVA_CLIENT_SECRET
 *   STRAVA_REDIRECT_URI (must match the Strava app callback)
 */
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();
const PORT = Number(process.env.STRAVA_PROXY_PORT || 8787);

app.use(cors({ origin: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'paddleerg-strava-proxy' });
});

app.post('/strava/token', async (req, res) => {
  const clientId = process.env.STRAVA_CLIENT_ID || process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const redirectUri =
    process.env.STRAVA_REDIRECT_URI ||
    process.env.EXPO_PUBLIC_STRAVA_REDIRECT_URI ||
    'http://localhost:8081/strava-callback';

  if (!clientId || !clientSecret) {
    res.status(500).json({
      error:
        'Server missing STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET. Copy server/.env.example to server/.env',
    });
    return;
  }

  const { grant_type, code, refresh_token } = req.body ?? {};
  if (grant_type !== 'authorization_code' && grant_type !== 'refresh_token') {
    res.status(400).json({ error: 'grant_type must be authorization_code or refresh_token' });
    return;
  }

  const body = new URLSearchParams({
    client_id: String(clientId),
    client_secret: String(clientSecret),
    grant_type,
  });

  if (grant_type === 'authorization_code') {
    if (!code) {
      res.status(400).json({ error: 'code required' });
      return;
    }
    body.set('code', String(code));
    body.set('redirect_uri', redirectUri);
  } else {
    if (!refresh_token) {
      res.status(400).json({ error: 'refresh_token required' });
      return;
    }
    body.set('refresh_token', String(refresh_token));
  }

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json(data);
      return;
    }
    res.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      athlete: data.athlete,
    });
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`paddleerg Strava proxy listening on http://localhost:${PORT}`);
});
