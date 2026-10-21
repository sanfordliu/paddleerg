/**
 * Public client config only. Strava client secret and OAuth authorize
 * live on the server (@paddleerg/server).
 *
 * Set EXPO_PUBLIC_API_URL in client/.env (e.g. http://localhost:8788).
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://localhost:8788';

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
  return `${API_URL}/strava/authorize${qs ? `?${qs}` : ''}`;
}
