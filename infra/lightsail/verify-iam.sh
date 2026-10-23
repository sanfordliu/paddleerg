#!/usr/bin/env bash
# Verify the current AWS principal can manage Lightsail container services.
set -euo pipefail

REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"

echo "Caller:"
aws sts get-caller-identity
echo
echo "Region: ${REGION}"
echo

echo "Listing container service powers…"
aws lightsail get-container-service-powers --region "${REGION}" \
  --query 'powers[].[powerId,price,cpuCount,ramSizeInGb]' --output table

echo
echo "Listing container services…"
aws lightsail get-container-services --region "${REGION}" \
  --query 'containerServices[].{name:containerServiceName,state:state,url:url,power:power}' \
  --output table

echo
echo "OK — Lightsail container APIs are reachable."
echo "If this failed with AccessDenied, create/attach customer policy LightsailFullAccessPolicy"
echo "(Action: lightsail:*). See iam-setup.md."
