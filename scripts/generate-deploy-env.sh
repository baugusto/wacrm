#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.roiwise}"

if [[ -e "${ENV_FILE}" && "${1:-}" != "--force" ]]; then
  echo "${ENV_FILE} already exists. Use --force to overwrite it." >&2
  exit 1
fi

random_hex() {
  openssl rand -hex "$1"
}

random_base64() {
  openssl rand -base64 "$1" | tr -d '\n'
}

jwt_for_role() {
  local role="$1"
  local secret="$2"

  ROLE="$role" JWT_SECRET="$secret" node <<'NODE'
const crypto = require('crypto');

const role = process.env.ROLE;
const secret = process.env.JWT_SECRET;
const now = Math.floor(Date.now() / 1000);
const payload = {
  role,
  iss: 'supabase',
  iat: now,
  exp: now + 60 * 60 * 24 * 365 * 10,
};

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const body = base64url(JSON.stringify(payload));
const signature = crypto
  .createHmac('sha256', secret)
  .update(`${header}.${body}`)
  .digest('base64')
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

process.stdout.write(`${header}.${body}.${signature}`);
NODE
}

JWT_SECRET="$(random_hex 32)"
ANON_KEY="$(jwt_for_role anon "${JWT_SECRET}")"
SERVICE_ROLE_KEY="$(jwt_for_role service_role "${JWT_SECRET}")"

cat > "${ENV_FILE}" <<EOF
# Generated for the ROI Wise WACRM Docker Swarm deployment.
# Do not commit this file.

NEXT_PUBLIC_SITE_URL=https://roiwise.com.br
NEXT_PUBLIC_SUPABASE_URL=https://roiwise.com.br/supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

POSTGRES_PASSWORD=$(random_hex 24)
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRY=3600
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

SUPABASE_PUBLIC_URL=https://roiwise.com.br/supabase
API_EXTERNAL_URL=https://roiwise.com.br/supabase
SITE_URL=https://roiwise.com.br
ADDITIONAL_REDIRECT_URLS=https://roiwise.com.br

DASHBOARD_USERNAME=supabase
DASHBOARD_PASSWORD=$(random_hex 18)
SECRET_KEY_BASE=$(random_base64 48)
REALTIME_DB_ENC_KEY=$(random_hex 8)
PG_META_CRYPTO_KEY=$(random_base64 24)
S3_PROTOCOL_ACCESS_KEY_ID=$(random_hex 16)
S3_PROTOCOL_ACCESS_KEY_SECRET=$(random_hex 32)

ENCRYPTION_KEY=$(random_hex 32)
META_APP_SECRET=${META_APP_SECRET:-CHANGE_ME_META_APP_SECRET}
META_APP_ID=${META_APP_ID:-}
AUTOMATION_CRON_SECRET=$(random_hex 32)

AI_REQUEST_TIMEOUT_MS=30000
AI_CONTEXT_MESSAGE_LIMIT=20

ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=true
DISABLE_SIGNUP=false
ENABLE_ANONYMOUS_USERS=false
ENABLE_PHONE_SIGNUP=false
ENABLE_PHONE_AUTOCONFIRM=false

# Configure SMTP before using password reset or email confirmation flows.
SMTP_ADMIN_EMAIL=${SMTP_ADMIN_EMAIL:-noreply@roiwise.com.br}
SMTP_HOST=${SMTP_HOST:-smtp-relay.brevo.com}
SMTP_PORT=${SMTP_PORT:-587}
SMTP_USER=${SMTP_USER:-CHANGE_ME_SMTP_USER}
SMTP_PASS=${SMTP_PASS:-CHANGE_ME_SMTP_PASS}
SMTP_SENDER_NAME="${SMTP_SENDER_NAME:-ROI Wise}"
EOF

chmod 600 "${ENV_FILE}"

echo "Generated ${ENV_FILE}."
echo "Edit META_APP_SECRET before deploying. Configure SMTP if email delivery is required."
