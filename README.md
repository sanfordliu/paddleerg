# paddleerg

Companion app for the **Whipr** paddle erg. Connect over Bluetooth (FTMS) and optionally a BLE heart-rate strap, watch live metrics on a customizable tile board (with optional coaching zones/targets), save a session, and upload it to **Strava**.

Monorepo:

| Package | Role |
|---|---|
| [`client/`](client/) | Expo / React Native app (web today; iOS/Android later) |
| [`server/`](server/) | Strava OAuth + secrets (Express; serves the web export in production) |
| [`infra/lightsail/`](infra/lightsail/) | Terraform + deploy script for AWS Lightsail Containers |

**Primary client target today:** Mac **Chrome** / **Edge** via [Web Bluetooth](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API).

## What works now

- Scan / connect to an FTMS machine; auto-reconnect when the Whipr comes back online
- Live metric tiles (reorder, add, remove) via Settings → Display
- Heart-rate zones and directional targets on Settings → Athlete
- Start / stop session recording and share-to-Strava (TCX built on the client)
- Server-owned Strava OAuth (authorize → callback → one-time session handoff → refresh)

## What’s still left to do

- Grant Lightsail IAM to the deploy user and run the first production deploy (see below)
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

### 1. IAM (required once)

There is no AWS-managed Lightsail full-access policy. Create a customer policy
`LightsailFullAccessPolicy` with `Action: "lightsail:*"` and attach it to
`sredr-cursor-dev`. Step-by-step: [`infra/lightsail/iam-setup.md`](infra/lightsail/iam-setup.md).

Verify:

```bash
./infra/lightsail/verify-iam.sh
```

### 2. Terraform vars

```bash
cp infra/lightsail/terraform.tfvars.example infra/lightsail/terraform.tfvars
# Set strava_client_id and strava_client_secret
```

### 3. Deploy

Requires Docker Desktop (or equivalent) and the AWS CLI.

```bash
npm run deploy:lightsail
```

This creates the container service, builds the image, pushes it with `aws lightsail push-container-image`, and applies a deployment. Env vars (`STRAVA_*`, `CLIENT_RETURN_URL`, `CORS_ORIGINS`) are set from the service URL automatically.

### 4. Strava production callback

After deploy:

```bash
terraform -chdir=infra/lightsail output strava_callback_domain
terraform -chdir=infra/lightsail output service_url
```

In the Strava API application settings, set **Authorization Callback Domain** to the hostname from `strava_callback_domain` (no `https://`, no path).

Health check:

```bash
curl -sS "$(terraform -chdir=infra/lightsail output -raw service_url)/health"
```

Open the service URL in Chrome/Edge and connect Strava end-to-end.

**Secrets:** never put `STRAVA_CLIENT_SECRET` in the client or any `EXPO_PUBLIC_*` variable. Production builds use an empty `EXPO_PUBLIC_API_URL` so API calls stay same-origin.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Client web + server |
| `npm run web` | Client only (`:8081`) |
| `npm run server` | Server only (`:8788`) |
| `npm run lint` | Client lint |
| `npm run typecheck` | Client + server |
| `npm run test:ftms` | FTMS parser checks |
| `npm run deploy:lightsail` | Build/push/apply Lightsail Containers |

## Layout

```text
client/            Expo Router, BLE, UI, TCX builder
server/            Express API (src/app.ts) + Lambda entry (src/lambda.ts)
infra/lightsail/   Terraform + deploy.sh for Lightsail Containers
Dockerfile         Multi-stage web export + Express image
```

## License

Private / personal project unless otherwise noted.
