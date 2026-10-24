# paddleerg

Companion app for **FTMS** paddle ergs and other Fitness Machine Service devices. Connect over Bluetooth, optionally pair a BLE heart-rate strap, watch live metrics on a customizable tile board (with optional coaching zones/targets), save a session, and upload it to **Strava**.

Monorepo:

| Package | Role |
|---|---|
| [`client/`](client/) | Expo / React Native app (web today; iOS/Android later) |
| [`server/`](server/) | Strava OAuth + secrets (Express; serves the web export in production) |
| [`infra/lightsail/`](infra/lightsail/) | Terraform + deploy script for AWS Lightsail Containers |

**Primary client target today:** Mac **Chrome** / **Edge** via [Web Bluetooth](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API).

## What works now

- Scan / connect to an FTMS machine; auto-reconnect when the device comes back online
- Live metric tiles (reorder, add, remove) via Settings → Display
- Heart-rate zones and directional targets on Settings → Athlete
- Start / stop session recording and share-to-Strava (TCX built on the client)
- Server-owned Strava OAuth (authorize → callback → one-time session handoff → refresh)
- Production deploy on AWS Lightsail (auto on push to `main`)

## What’s still left to do

- Native BLE + Expo development builds for iPhone / Android
- Full-viewport responsive metric board polish

## Quick start (local)

```bash
git clone https://github.com/sanfordliu/paddleerg.git
cd paddleerg
npm install
cp client/.env.example client/.env
cp server/.env.example server/.env
# Edit server/.env: set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET
npm run dev
```

Then open **http://localhost:8081** (Chrome or Edge).

| Service | URL |
|---|---|
| Client | http://localhost:8081 |
| Server health | http://localhost:8788/health |

`npm run web` / `npm run server` start each package alone.

## Strava setup (local)

| Strava form field | Local value |
|---|---|
| **Website** | `https://github.com/sanfordliu/paddleerg` |
| **Authorization Callback Domain** | `localhost` |

OAuth redirect URI (server, not the Expo app):

`http://localhost:8788/strava/callback`

**Secrets stay on the server only:**

```bash
# server/.env
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=http://localhost:8788/strava/callback
CLIENT_RETURN_URL=http://localhost:8081
CORS_ORIGINS=http://localhost:8081
PORT=8788
```

```bash
# client/.env
EXPO_PUBLIC_API_URL=http://localhost:8788
```

### Connect flow

1. App opens `GET {API}/strava/authorize`
2. Strava redirects to `GET {API}/strava/callback`
3. Server exchanges the code (with client secret) and stores tokens under a one-time `sid`
4. Browser returns to `{CLIENT_RETURN_URL}/strava-callback?sid=…`
5. App calls `GET {API}/strava/session/:sid` once and saves athlete tokens locally
6. Uploads go **client → Strava**; token refresh goes through the server

## Deploy to AWS Lightsail

Production is a single **Lightsail Container Service** named `paddleerg` in `us-east-1`. One container runs Express and serves the Expo web export on the same origin (default HTTPS URL like `https://paddleerg.<id>.us-east-1.cs.amazonlightsail.com`). No separate OAuth proxy.

**Pushing to `main` deploys automatically** via GitHub Actions (test → Lightsail image roll).

### 1. IAM (required once)

There is no AWS-managed Lightsail full-access policy. Create a customer policy
`LightsailFullAccessPolicy` with `Action: "lightsail:*"` and attach it to the
deploy IAM user (local CLI and the GitHub Actions access key). Step-by-step:
[`infra/lightsail/iam-setup.md`](infra/lightsail/iam-setup.md).

Verify locally:

```bash
./infra/lightsail/verify-iam.sh
```

### 2. First-time service create (local, once)

```bash
cp infra/lightsail/terraform.tfvars.example infra/lightsail/terraform.tfvars
# Set strava_client_id and strava_client_secret
npm run deploy:lightsail
```

Requires Docker, AWS CLI, Terraform, and `lightsailctl`. This creates the container
service and the first deployment.

### 3. GitHub Actions → production

Add these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Purpose |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user with Lightsail access |
| `AWS_SECRET_ACCESS_KEY` | Matching secret |
| `STRAVA_CLIENT_ID` | Strava API client id |
| `STRAVA_CLIENT_SECRET` | Strava API client secret (server only) |

Workflows:

- [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — on push to `main` (and manual `workflow_dispatch`): typecheck + test, then `infra/lightsail/deploy-image.sh`
- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — PRs / non-main branches: typecheck + test only

CI deploys **images only** (no Terraform state in Actions). Day-to-day: merge to `main`.

Manual image deploy with the same script:

```bash
export STRAVA_CLIENT_ID=...
export STRAVA_CLIENT_SECRET=...
npm run deploy:lightsail:image
```

### 4. Strava production callback

```bash
terraform -chdir=infra/lightsail output strava_callback_domain
terraform -chdir=infra/lightsail output service_url
```

In the Strava API application settings, set **Authorization Callback Domain** to the hostname from `strava_callback_domain` (no `https://`, no path).

Health check:

```bash
curl -sS "$(terraform -chdir=infra/lightsail output -raw service_url)/health"
```

**Secrets:** never put `STRAVA_CLIENT_SECRET` in the client or any `EXPO_PUBLIC_*` variable. Production builds use an empty `EXPO_PUBLIC_API_URL` so API calls stay same-origin.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Client web + server |
| `npm run web` | Client only (`:8081`) |
| `npm run server` | Server only (`:8788`) |
| `npm run lint` | Client lint |
| `npm run typecheck` | Client + server |
| `npm run test` | Jest with coverage (client + server) |
| `npm run test:ftms` | Legacy FTMS fixture script |
| `npm run deploy:lightsail` | First-time Terraform create + deploy |
| `npm run deploy:lightsail:image` | Image-only Lightsail roll (CI path) |

Coverage floors (enforced by Jest): **60%** global on collected logic files; **80%** on `client/src/metrics/**`, `client/src/ble/ftms.ts`, and `server/src/strava/**`.

## Layout

```text
client/            Expo Router, BLE, UI, TCX builder
server/            Express API (src/app.ts) + Lambda entry (src/lambda.ts)
infra/lightsail/   Terraform + deploy.sh for Lightsail Containers
Dockerfile         Multi-stage web export + Express image
```

## License

Private / personal project unless otherwise noted.
