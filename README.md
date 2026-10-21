# paddleerg

Companion app for the **Whipr** paddle erg. Connect over Bluetooth (FTMS), watch live metrics on a customizable tile board, save a session, and upload it to **Strava**.

**Primary target today:** Mac **Chrome** / **Edge** via [Web Bluetooth](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API).  
**Later:** iOS / Android with Expo development builds and `react-native-ble-plx`.

## What works now

- Scan and connect to an FTMS fitness machine (Web Bluetooth)
- Live metric tiles (time, distance, SPM, pace, strokes, power, …)
- Edit mode: drag to reorder, add, or remove tiles
- Start / stop session recording and local “share workout” strip
- Strava OAuth (via local token proxy) and TCX upload when credentials are configured
- Settings: Bluetooth disconnect, Strava connect/disconnect, sport type, layout reset, debug packets

## What’s still left to do

- Register a Strava API application and fill in `.env` / `server/.env` (see below)
- Harden FTMS parsing against more Whipr firmware variants as needed
- Native BLE path (replace stub) + Expo development builds for iPhone / Android
- Production Strava callback (HTTPS domain + hosted token proxy), not only `localhost`
- Polish UX (empty states, stronger upload feedback, optional activity naming)
- Automated tests beyond the FTMS unit script

## Quick start (Mac Chrome)

```bash
npm install
npm run web
```

Open the URL Expo prints (usually `http://localhost:8081`). Use **Chrome** or **Edge**.

1. Power on your Whipr.
2. Tap **Connect** → pick your machine in the browser chooser.
3. Start paddling; tiles should update.
4. Pencil icon: reorder / add / remove metrics.
5. Gear icon: Settings (Strava, sport type, disconnect, debug).

App + Strava proxy together:

```bash
npm run dev
```

## Strava API app (Website + callback)

Strava’s create-app form needs two different values:

| Field | What to enter (local web) |
|---|---|
| **Website** | This GitHub repo URL (or any public site you control) |
| **Authorization Callback Domain** | `localhost` only — no `http://`, port, or path |

The **full** redirect URI used by the app (not the form’s domain field) is:

`http://localhost:8081/strava-callback`

After create, copy **Client ID** and **Client Secret** into env files (below). Never commit the secret.

## Environment files

Templates:

- [`.env.example`](.env.example) → copy to **`.env`** (gitignored)
- [`server/.env.example`](server/.env.example) → copy to **`server/.env`** (gitignored)

A blank `.env` / `server/.env` may already exist locally for you to edit. Fill:

```bash
# .env (public client id only)
EXPO_PUBLIC_STRAVA_CLIENT_ID=
EXPO_PUBLIC_STRAVA_REDIRECT_URI=http://localhost:8081/strava-callback
EXPO_PUBLIC_STRAVA_PROXY_URL=http://localhost:8787

# server/.env (secret stays on the proxy)
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=http://localhost:8081/strava-callback
STRAVA_PROXY_PORT=8787
```

Then:

```bash
npm run strava-proxy   # or npm run dev
```

In the app: **Connect Strava** → authorize → save a workout → **Upload to Strava**.

## Project layout

- `app/` — Expo Router screens (workout, settings, Strava callback)
- `src/ble/` — Web Bluetooth adapter, FTMS parser, native stub
- `src/components/` — UI (tiles, connect, share, notices)
- `src/store/` — workout, layout, Strava state (Zustand)
- `src/strava/` — TCX builder + upload helpers
- `src/theme.ts` — React Native Paper MD3 dark theme
- `server/` — OAuth token proxy (holds client secret)
- `docs/ble-protocol.md` — protocol notes

## Scripts

| Command | Purpose |
|---|---|
| `npm run web` | Expo web |
| `npm run strava-proxy` | Local token proxy on `:8787` |
| `npm run dev` | Web + proxy |
| `npm run test:ftms` | FTMS parser checks |
| `npm run lint` | ESLint |

## License

Private / personal project unless otherwise noted.
