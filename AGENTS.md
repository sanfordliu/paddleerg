# paddleerg monorepo

- **`client/`** — Expo / React Native app. See [`client/AGENTS.md`](client/AGENTS.md) for Expo conventions.
- **`server/`** — Strava OAuth API (Express; also serves the web export in production). Secrets only in `server/.env` or Lightsail env (never client / `EXPO_PUBLIC_*`).
- **`infra/lightsail/`** — Terraform + `deploy.sh` for AWS Lightsail Containers (`paddleerg`).

```bash
npm install
npm run dev              # client :8081 + server :8788
npm run typecheck
npm run deploy:lightsail # after IAM + terraform.tfvars
```

Never put `STRAVA_CLIENT_SECRET` in the client or any `EXPO_PUBLIC_*` variable.
