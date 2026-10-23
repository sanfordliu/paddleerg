import { apiUrl } from './config';

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname?: string; lastname?: string };
}

/** Redeem a one-time OAuth handoff sid from the server callback. */
export async function redeemSession(sid: string): Promise<StravaTokens> {
  const res = await fetch(apiUrl(`/strava/session/${encodeURIComponent(sid)}`));
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Session redeem failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function refreshTokens(refreshToken: string): Promise<StravaTokens> {
  const res = await fetch(apiUrl('/strava/token'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function uploadActivity(options: {
  accessToken: string;
  tcx: string;
  name: string;
  sportType: string;
  description?: string;
  externalId?: string;
}): Promise<{ id: number; status: string; activity_id: number | null }> {
  const form = new FormData();
  const blob = new Blob([options.tcx], { type: 'application/xml' });
  form.append('file', blob, 'paddleerg.tcx');
  form.append('data_type', 'tcx');
  form.append('name', options.name);
  form.append('sport_type', options.sportType);
  form.append('trainer', '1');
  const description = options.description?.trim();
  if (description) form.append('description', description);
  if (options.externalId) form.append('external_id', options.externalId);

  const res = await fetch('https://www.strava.com/api/v3/uploads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${options.accessToken}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function pollUpload(
  accessToken: string,
  uploadId: number,
  maxAttempts = 20
): Promise<{ activity_id: number | null; status: string; error?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetch(`https://www.strava.com/api/v3/uploads/${uploadId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) continue;
    const data = await res.json();
    if (data.activity_id || data.error) {
      return {
        activity_id: data.activity_id ?? null,
        status: data.status,
        error: data.error,
      };
    }
  }
  return { activity_id: null, status: 'timeout' };
}
