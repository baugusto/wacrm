# Botmaker Connector Local Tests

These tests validate the ROI Wise Connector Gateway locally. They must not run
against production and never default to `https://roiwise.com.br`.

## Scope

The local QA suite covers:

- Botmaker adapter v1 normalization
- Botmaker idempotency keys
- Local ingestion endpoint authentication
- Raw event acceptance
- Unknown payload handling
- Status events
- Generic connector envelope routing
- Smoke testing from local fixtures

## Local App

Start the app locally:

```bash
npm run dev
```

The default test base URL is:

```text
http://localhost:3000
```

## Local Supabase

Use the local/dev Supabase configured by the project. Apply migrations before
running endpoint tests:

```bash
npx supabase status
npx supabase migration up
```

## Test Channel And API Key

1. Open `http://localhost:3000/settings/channels`.
2. Create a local workspace if needed.
3. Create a Botmaker channel.
4. Generate a channel API key.
5. Store the channel id and plaintext key in `.env.test.local`.

The plaintext key is shown once. Do not commit it.

## `.env.test.local`

Create a local-only file:

```bash
ROIWISE_RUN_INTEGRATION_TESTS=true
ROIWISE_TEST_BASE_URL=http://localhost:3000
ROIWISE_TEST_BOTMAKER_CHANNEL_ID=coloque_o_channel_id_local
ROIWISE_TEST_API_KEY=coloque_a_api_key_local
ROIWISE_TEST_INVALID_API_KEY=rw_live_invalid
```

DB tests are currently documented as todos because the project does not include
a direct SQL test driver:

```bash
ROIWISE_RUN_DB_TESTS=true
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

## Commands

Unit tests for Botmaker:

```bash
npm run test:botmaker
```

All connector unit tests:

```bash
npm run test:unit
```

Local integration tests:

```bash
npm run test:integration:local
```

Local smoke test:

```bash
npm run test:botmaker:local
```

DB test placeholders:

```bash
npm run test:db:local
```

## Failure Guide

- `401`: missing, invalid, revoked, or expired API key.
- `403`: API key missing `events:write`, key bound to another channel, or user
  lacks dashboard permissions.
- `404`: channel id does not exist in the local database.
- `409`: channel exists but is not `active`.
- `needs_mapping`: payload was accepted and stored, but the adapter could not
  normalize it safely.
- `duplicate`: idempotency worked; the same payload was already ingested.

## Production Guardrails

- Do not set `ROIWISE_TEST_BASE_URL` to `https://roiwise.com.br`.
- The integration helper and smoke test refuse URLs containing
  `roiwise.com.br`.
- Do not put real customer payloads in fixtures.
- Do not commit `.env.test.local` or API keys.
