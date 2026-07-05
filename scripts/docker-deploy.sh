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
else
  echo "Missing ${ENV_FILE}. Run ./scripts/generate-deploy-env.sh and then edit the generated file." >&2
  exit 1
fi

required_vars=(
  NEXT_PUBLIC_SITE_URL
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  ENCRYPTION_KEY
  META_APP_SECRET
  POSTGRES_PASSWORD
  JWT_SECRET
  ANON_KEY
  SERVICE_ROLE_KEY
  DASHBOARD_USERNAME
  DASHBOARD_PASSWORD
  SECRET_KEY_BASE
  REALTIME_DB_ENC_KEY
  PG_META_CRYPTO_KEY
  S3_PROTOCOL_ACCESS_KEY_ID
  S3_PROTOCOL_ACCESS_KEY_SECRET
)

for var_name in "${required_vars[@]}"; do
  value="${!var_name:-}"
  if [[ -z "${value}" || "${value}" == CHANGE_ME* ]]; then
    echo "Missing required deployment value: ${var_name}" >&2
    exit 1
  fi
done

docker stack deploy -c docker-stack.roiwise.yml roiwise

if [[ "${SKIP_MIGRATIONS:-0}" != "1" ]]; then
  ./scripts/supabase-migrate.sh
fi
