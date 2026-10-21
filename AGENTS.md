# paddleerg monorepo

- **`client/`** — Expo / React Native app. See [`client/AGENTS.md`](client/AGENTS.md) for Expo conventions.
- **`server/`** — Strava OAuth API (Express locally; `src/lambda.ts` for AWS later). Secrets only in `server/.env`.

```bash
npm install
npm run dev          # client :8081 + server :8788
npm run typecheck
```

Never put `STRAVA_CLIENT_SECRET` in the client or any `EXPO_PUBLIC_*` variable.
