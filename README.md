# paddleerg

Companion app for the **Whipr** paddle erg. Connect over Bluetooth (FTMS), watch live metrics on a customizable tile board, save a session, and upload it to **Strava**.

Monorepo:

| Package | Role |
|---|---|
| [`client/`](client/) | Expo / React Native app (web today; iOS/Android later) |
| [`server/`](server/) | Strava OAuth + secrets (Express locally; Lambda-ready handler) |

**Primary client target today:** Mac **Chrome** / **Edge** via [Web Bluetooth](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API).

## What works now

- Scan / connect to an FTMS machine; auto-reconnect when the Whipr comes back online
- Live metric tiles (reorder, add, remove)
- Start / stop session recording and share-to-Strava (TCX built on the client)
- Server-owned Strava OAuth (authorize → callback → one-time session handoff → refresh)

## What’s still left to do

- Deploy `server` to AWS Lambda + API Gateway; secrets in Secrets Manager
- Durable OAuth sessions for multi-instance Lambda (today: in-memory)
- Native BLE + Expo development builds for iPhone / Android
- Production Strava callback domain (not `localhost`)
- Full-viewport responsive metric board polish

## Quick start

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
| Server health | http://localhost:8787/health |

`npm run web` / `npm run server` start each package alone.

## Strava setup

| Strava form field | Local value |
|---|---|
| **Website** | `https://github.com/sanfordliu/paddleerg` |
| **Authorization Callback Domain** | `localhost` |

OAuth redirect URI (server, not the Expo app):

`http://localhost:8787/strava/callback`

**Secrets stay on the server only:**

```bash
# server/.env
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=http://localhost:8787/strava/callback
CLIENT_RETURN_URL=http://localhost:8081
CORS_ORIGINS=http://localhost:8081
PORT=8787
```

```bash
# client/.env
EXPO_PUBLIC_API_URL=http://localhost:8787
```

### Connect flow

1. App opens `GET {API}/strava/authorize`
2. Strava redirects to `GET {API}/strava/callback`
3. Server exchanges the code (with client secret) and stores tokens under a one-time `sid`
4. Browser returns to `{CLIENT_RETURN_URL}/strava-callback?sid=…`
5. App calls `GET {API}/strava/session/:sid` once and saves athlete tokens locally
6. Uploads go **client → Strava**; token refresh goes through the server

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Client web + server |
| `npm run web` | Client only (`:8081`) |
| `npm run server` | Server only (`:8787`) |
| `npm run lint` | Client lint |
| `npm run typecheck` | Client + server |
| `npm run test:ftms` | FTMS parser checks |

## Layout

```text
client/   Expo Router, BLE, UI, TCX builder
server/   Express API (src/app.ts) + Lambda entry (src/lambda.ts)
```

## License

Private / personal project unless otherwise noted.
