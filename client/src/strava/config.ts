/**
 * Public client config only. Strava client secret and OAuth authorize
 * live on the server (@paddleerg/server).
 *
 * - Local: set EXPO_PUBLIC_API_URL=http://localhost:8788 in client/.env
 * - Same-origin production (Lightsail): set EXPO_PUBLIC_API_URL= (empty) at build time
 * - Unset: defaults to local Express
 */
function resolveApiUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  if (raw === undefined) return 'http://localhost:8788';
  return raw.trim().replace(/\/$/, '');
}

export const API_URL = resolveApiUrl();

/** Join API_URL with a path. Empty API_URL yields a same-origin absolute path. */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${p}`;
}

/** API sport_type values + UI labels */
export const STRAVA_SPORT_OPTIONS = [
  { value: 'StandUpPaddling', label: 'Stand Up Paddling' },
  { value: 'Rowing', label: 'Rowing' },
  { value: 'Canoeing', label: 'Canoeing' },
  { value: 'Kayaking', label: 'Kayaking' },
] as const;

export type StravaSportType = (typeof STRAVA_SPORT_OPTIONS)[number]['value'];

export function stravaAuthorizeUrl(state?: string): string {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  const qs = params.toString();
  return `${apiUrl('/strava/authorize')}${qs ? `?${qs}` : ''}`;
}
