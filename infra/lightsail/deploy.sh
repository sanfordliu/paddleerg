#!/usr/bin/env bash
# Build, push, and deploy paddleerg to Lightsail Containers.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TF_DIR="$(cd "$(dirname "$0")" && pwd)"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
SERVICE_NAME="${LIGHTSAIL_SERVICE_NAME:-paddleerg}"
IMAGE_TAG="paddleerg:latest"
LABEL="app"

cd "${TF_DIR}"

if [[ ! -f terraform.tfvars ]]; then
  echo "Missing ${TF_DIR}/terraform.tfvars"
  echo "Copy terraform.tfvars.example and set strava_client_id / strava_client_secret."
  exit 1
fi

echo "==> Verifying Lightsail IAM…"
"${TF_DIR}/verify-iam.sh"

echo "==> terraform init"
terraform init -input=false

echo "==> Ensuring container service exists (${SERVICE_NAME})…"
terraform apply -input=false -auto-approve \
  -var="container_image=" \
  -var="service_name=${SERVICE_NAME}"

SERVICE_URL="$(terraform output -raw service_url)"
echo "Service URL: ${SERVICE_URL}"

echo "==> Waiting for service to leave PENDING…"
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
  if [[ "${STATE}" == "DISABLED" ]]; then
    echo "Service is DISABLED; aborting."
    exit 1
  fi
  sleep 10
done

echo "==> Building Docker image (${IMAGE_TAG}, linux/amd64)…"
# Lightsail Containers run amd64; local Apple Silicon defaults to arm64.
docker build --platform linux/amd64 -t "${IMAGE_TAG}" "${ROOT}"

echo "==> Pushing image to Lightsail…"
PUSH_OUT="$(aws lightsail push-container-image \
  --region "${REGION}" \
  --service-name "${SERVICE_NAME}" \
  --label "${LABEL}" \
  --image "${IMAGE_TAG}" 2>&1)"
echo "${PUSH_OUT}"

# Prefer the Refer to this image as line; fall back to :service.label.N patterns.
CONTAINER_IMAGE="$(printf '%s\n' "${PUSH_OUT}" | sed -n 's/.*Refer to this image as "\([^"]*\)".*/\1/p' | tail -1)"
if [[ -z "${CONTAINER_IMAGE}" ]]; then
  CONTAINER_IMAGE="$(printf '%s\n' "${PUSH_OUT}" | grep -Eo ":${SERVICE_NAME}\\.${LABEL}\\.[0-9]+" | tail -1 || true)"
fi
if [[ -z "${CONTAINER_IMAGE}" ]]; then
  echo "Could not parse Lightsail image name from push output."
  exit 1
fi
echo "Using image: ${CONTAINER_IMAGE}"

echo "==> Deploying container…"
terraform apply -input=false -auto-approve \
  -var="service_name=${SERVICE_NAME}" \
  -var="container_image=${CONTAINER_IMAGE}"

echo
echo "Deployed."
echo "  URL:                 $(terraform output -raw service_url)"
echo "  Strava callback host: $(terraform output -raw strava_callback_domain)"
echo "  Health:              $(terraform output -raw service_url)/health"
echo
echo "In the Strava API settings, set Authorization Callback Domain to the hostname above."
