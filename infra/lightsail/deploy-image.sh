#!/usr/bin/env bash
# Build, push, and roll a new Lightsail Containers deployment (no Terraform state).
# Used by GitHub Actions on main. Requires the paddleerg service to already exist.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
SERVICE_NAME="${LIGHTSAIL_SERVICE_NAME:-paddleerg}"
IMAGE_TAG="paddleerg:latest"
LABEL="app"
CONTAINER_PORT="${CONTAINER_PORT:-8080}"

need() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env var ${name}" >&2
    exit 1
  fi
}

need STRAVA_CLIENT_ID
need STRAVA_CLIENT_SECRET

echo "==> Checking Lightsail service ${SERVICE_NAME}…"
SERVICE_JSON="$(aws lightsail get-container-services \
  --region "${REGION}" \
  --service-name "${SERVICE_NAME}" \
  --output json)"
SERVICE_URL="$(printf '%s' "${SERVICE_JSON}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["containerServices"][0]["url"].rstrip("/"))')"
STATE="$(printf '%s' "${SERVICE_JSON}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["containerServices"][0]["state"])')"
echo "  url=${SERVICE_URL}"
echo "  state=${STATE}"

if [[ "${STATE}" == "DISABLED" ]]; then
  echo "Service is DISABLED; aborting." >&2
  exit 1
fi

echo "==> Waiting for service READY/RUNNING…"
for _ in $(seq 1 60); do
  STATE="$(aws lightsail get-container-services \
    --region "${REGION}" \
    --service-name "${SERVICE_NAME}" \
    --query 'containerServices[0].state' \
    --output text)"
  echo "  state=${STATE}"
  if [[ "${STATE}" == "READY" || "${STATE}" == "RUNNING" ]]; then
    break
  fi
  sleep 10
done

echo "==> Building Docker image (${IMAGE_TAG}, linux/amd64)…"
docker build --platform linux/amd64 -t "${IMAGE_TAG}" "${ROOT}"

echo "==> Pushing image to Lightsail…"
PUSH_OUT="$(aws lightsail push-container-image \
  --region "${REGION}" \
  --service-name "${SERVICE_NAME}" \
  --label "${LABEL}" \
  --image "${IMAGE_TAG}" 2>&1)"
echo "${PUSH_OUT}"

CONTAINER_IMAGE="$(printf '%s\n' "${PUSH_OUT}" | sed -n 's/.*Refer to this image as "\([^"]*\)".*/\1/p' | tail -1)"
if [[ -z "${CONTAINER_IMAGE}" ]]; then
  CONTAINER_IMAGE="$(printf '%s\n' "${PUSH_OUT}" | grep -Eo ":${SERVICE_NAME}\\.${LABEL}\\.[0-9]+" | tail -1 || true)"
fi
if [[ -z "${CONTAINER_IMAGE}" ]]; then
  echo "Could not parse Lightsail image name from push output." >&2
  exit 1
fi
echo "Using image: ${CONTAINER_IMAGE}"

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

export CONTAINER_IMAGE SERVICE_URL CONTAINER_PORT

python3 - "${TMP}/containers.json" <<'PY'
import json, os, sys
path = sys.argv[1]
doc = {
  "app": {
    "image": os.environ["CONTAINER_IMAGE"],
    "ports": {os.environ["CONTAINER_PORT"]: "HTTP"},
    "environment": {
      "PORT": os.environ["CONTAINER_PORT"],
      "STATIC_DIR": "/app/server/public",
      "STRAVA_CLIENT_ID": os.environ["STRAVA_CLIENT_ID"],
      "STRAVA_CLIENT_SECRET": os.environ["STRAVA_CLIENT_SECRET"],
      "STRAVA_REDIRECT_URI": f"{os.environ['SERVICE_URL']}/strava/callback",
      "CLIENT_RETURN_URL": os.environ["SERVICE_URL"],
      "CORS_ORIGINS": os.environ["SERVICE_URL"],
    },
  }
}
with open(path, "w", encoding="utf-8") as f:
  json.dump(doc, f)
PY

cat > "${TMP}/public-endpoint.json" <<EOF
{
  "containerName": "app",
  "containerPort": ${CONTAINER_PORT},
  "healthCheck": {
    "healthyThreshold": 2,
    "unhealthyThreshold": 2,
    "timeoutSeconds": 2,
    "intervalSeconds": 5,
    "path": "/health",
    "successCodes": "200"
  }
}
EOF

echo "==> Creating Lightsail deployment…"
aws lightsail create-container-service-deployment \
  --region "${REGION}" \
  --service-name "${SERVICE_NAME}" \
  --containers "file://${TMP}/containers.json" \
  --public-endpoint "file://${TMP}/public-endpoint.json" \
  --output json >/dev/null

echo "==> Waiting for deployment…"
for _ in $(seq 1 90); do
  STATE="$(aws lightsail get-container-services \
    --region "${REGION}" \
    --service-name "${SERVICE_NAME}" \
    --query 'containerServices[0].state' \
    --output text)"
  echo "  state=${STATE}"
  if [[ "${STATE}" == "RUNNING" || "${STATE}" == "READY" ]]; then
    break
  fi
  if [[ "${STATE}" == "DISABLED" ]]; then
    echo "Service became DISABLED during deploy." >&2
    exit 1
  fi
  sleep 10
done

echo
echo "Deployed."
echo "  URL:    ${SERVICE_URL}"
echo "  Health: ${SERVICE_URL}/health"
curl -fsS "${SERVICE_URL}/health"
echo
