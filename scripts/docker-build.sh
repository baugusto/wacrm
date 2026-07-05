#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.roiwise}"
export DOCKER_CONFIG="${DOCKER_CONFIG:-/tmp/wacrm-docker-config}"
mkdir -p "${DOCKER_CONFIG}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

required_vars=(
  NEXT_PUBLIC_SITE_URL
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required environment variable: ${var_name}" >&2
    exit 1
  fi
done

if [[ "${NEXT_PUBLIC_SITE_URL}" == *"localhost"* ]] || [[ "${NEXT_PUBLIC_SITE_URL}" == http://127.0.0.1* ]]; then
  echo "NEXT_PUBLIC_SITE_URL must point to the production URL, not localhost." >&2
  exit 1
fi

if [[ "${NEXT_PUBLIC_SUPABASE_URL}" == *"localhost"* ]] || [[ "${NEXT_PUBLIC_SUPABASE_URL}" == http://127.0.0.1* ]]; then
  echo "NEXT_PUBLIC_SUPABASE_URL must point to the production Supabase URL, not localhost." >&2
  exit 1
fi

docker build \
  --build-arg "NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}" \
  --build-arg "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}" \
  --build-arg "NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -t roiwise/wacrm:latest \
  .
