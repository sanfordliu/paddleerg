export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

export function getStravaConfig() {
  return {
    clientId: requireEnv('STRAVA_CLIENT_ID'),
    clientSecret: requireEnv('STRAVA_CLIENT_SECRET'),
    redirectUri:
      process.env.STRAVA_REDIRECT_URI?.trim() || 'http://localhost:8788/strava/callback',
    clientReturnUrl: process.env.CLIENT_RETURN_URL?.trim() || 'http://localhost:8081',
    scopes: process.env.STRAVA_SCOPES?.trim() || 'activity:write,read',
  };
}

export function getCorsOrigins(): string[] | true {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw || raw === '*') return true;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}
