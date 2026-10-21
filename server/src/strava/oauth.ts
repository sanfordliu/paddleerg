import { getStravaConfig } from './config';

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname?: string; lastname?: string };
}

export function buildAuthorizeUrl(state: string): string {
  const { clientId, redirectUri, scopes } = getStravaConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: scopes,
    state,
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

async function postToken(body: URLSearchParams): Promise<StravaTokens> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = (await response.json()) as Record<string, unknown> & {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    athlete?: StravaTokens['athlete'];
    message?: string;
    errors?: unknown;
  };
  if (!response.ok) {
    const detail =
      typeof data.message === 'string'
        ? data.message
        : JSON.stringify(data.errors ?? data);
    throw new Error(`Strava token error ${response.status}: ${detail}`);
  }
  if (!data.access_token || !data.refresh_token || data.expires_at == null) {
    throw new Error('Strava token response missing fields');
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete: data.athlete,
  };
}

export async function exchangeAuthorizationCode(code: string): Promise<StravaTokens> {
  const { clientId, clientSecret, redirectUri } = getStravaConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
  return postToken(body);
}

export async function refreshAccessToken(refreshToken: string): Promise<StravaTokens> {
  const { clientId, clientSecret } = getStravaConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  return postToken(body);
}
