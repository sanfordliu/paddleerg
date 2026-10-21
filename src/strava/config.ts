/**
 * Public Strava client ID can live in the app.
 * Client secret must only be used by the token proxy server.
 *
 * Set EXPO_PUBLIC_STRAVA_CLIENT_ID and EXPO_PUBLIC_STRAVA_REDIRECT_URI
 * (and optionally EXPO_PUBLIC_STRAVA_PROXY_URL) in .env.
 */
export const STRAVA_CLIENT_ID =
  process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID?.trim() || '';

export const STRAVA_REDIRECT_URI =
  process.env.EXPO_PUBLIC_STRAVA_REDIRECT_URI?.trim() ||
  'http://localhost:8081/strava-callback';

export const STRAVA_PROXY_URL =
  process.env.EXPO_PUBLIC_STRAVA_PROXY_URL?.trim() || 'http://localhost:8787';

/** API sport_type values + UI labels */
export const STRAVA_SPORT_OPTIONS = [
  { value: 'StandUpPaddling', label: 'Stand Up Paddling' },
  { value: 'Rowing', label: 'Rowing' },
  { value: 'Canoeing', label: 'Canoeing' },
  { value: 'Kayaking', label: 'Kayaking' },
] as const;

export type StravaSportType = (typeof STRAVA_SPORT_OPTIONS)[number]['value'];

export function stravaAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: STRAVA_REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:write,read',
    state,
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}
