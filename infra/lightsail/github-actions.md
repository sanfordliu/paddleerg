# GitHub Actions → Lightsail production

Pushing to `main` runs [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml):
typecheck + Jest, then an image roll with `deploy-image.sh`.

## One-time GitHub setup

1. Add repository secrets (Settings → Secrets and variables → Actions):

| Secret | Notes |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user with `lightsail:*` (same policy as local deploy) |
| `AWS_SECRET_ACCESS_KEY` | Matching secret access key |
| `STRAVA_CLIENT_ID` | From Strava API settings |
| `STRAVA_CLIENT_SECRET` | Server-only; never `EXPO_PUBLIC_*` |

2. Ensure the Lightsail service `paddleerg` already exists (`npm run deploy:lightsail` once locally).

## Local parity

```bash
export STRAVA_CLIENT_ID=...
export STRAVA_CLIENT_SECRET=...
npm run deploy:lightsail:image
```
