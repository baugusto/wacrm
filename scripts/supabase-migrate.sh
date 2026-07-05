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
  echo "Missing ${ENV_FILE}. Run ./scripts/generate-deploy-env.sh first." >&2
  exit 1
fi

if [[ -z "${POSTGRES_PASSWORD:-}" || "${POSTGRES_PASSWORD}" == CHANGE_ME* ]]; then
  echo "POSTGRES_PASSWORD is required for migrations." >&2
  exit 1
fi

docker run --rm \
  -i \
  --network roiwise_internal \
  -e PGPASSWORD="${POSTGRES_PASSWORD}" \
  -e PGHOST=supabase_db \
  -e PGPORT=5432 \
  -e PGUSER=postgres \
  -e PGDATABASE=postgres \
  -v "${PWD}/supabase/migrations:/migrations:ro" \
  postgres:17-alpine \
  sh -eu <<'SH'
until pg_isready >/dev/null 2>&1; do
  echo "Waiting for Supabase Postgres..."
  sleep 3
done

until [ "$(psql -At -c "select to_regclass('storage.buckets')" 2>/dev/null)" = "storage.buckets" ]; do
  echo "Waiting for Supabase Storage schema..."
  sleep 3
done

psql -v ON_ERROR_STOP=1 <<'SQL'
ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;
ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;
ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;
CREATE SCHEMA IF NOT EXISTS _realtime;
ALTER SCHEMA _realtime OWNER TO postgres;
GRANT USAGE, CREATE ON SCHEMA _realtime TO supabase_admin;
CREATE SCHEMA IF NOT EXISTS realtime;
ALTER SCHEMA realtime OWNER TO supabase_admin;
GRANT USAGE, CREATE ON SCHEMA realtime TO supabase_admin;
SQL

psql -v ON_ERROR_STOP=1 <<'SQL'
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
SQL

for migration in /migrations/*.sql; do
  version="$(basename "$migration" .sql)"
  applied="$(psql -At -c "select 1 from supabase_migrations.schema_migrations where version = '$version'")"

  if [ "$applied" = "1" ]; then
    echo "Skipping already applied migration: $version"
    continue
  fi

  echo "Applying migration: $version"
  psql -v ON_ERROR_STOP=1 -f "$migration"
  psql -v ON_ERROR_STOP=1 -c "insert into supabase_migrations.schema_migrations(version, statements, name) values ('$version', array[]::text[], '$version')"
done
SH
