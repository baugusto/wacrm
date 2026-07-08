# ROI Wise Connector Gateway

The ROI Wise Connector Gateway receives conversational events from external
platforms, stores the raw payload first, then normalizes supported providers into
canonical conversation tables.

## Raw Event Store

Every inbound request is written to `raw_conversation_events` before adapter
normalization runs. The raw row stores account, workspace, channel, provider,
headers, query params, payload JSONB, idempotency key, adapter version, status,
warnings, and error message.

Unknown payloads are not discarded. They remain available with
`ingestion_status = needs_mapping` so rollout teams can inspect the real payload
and evolve the channel mapping or provider adapter.

## Canonical Model

Supported adapters write into:

- `canonical_contacts`
- `canonical_conversations`
- `canonical_messages`
- `canonical_message_status_events`

Every canonical row carries `account_id`, `workspace_id`, `channel_id`, and
`provider`. Messages and status events reference `raw_event_id`, preserving
traceability back to the exact raw payload.

## Manual Provider Mapping

Each BSP can vary payload shape by tenant, channel, version, and event type.
ROI Wise treats every provider adapter as explicitly mapped and versioned. A
channel can store future mapping overrides in `channels.config_json.mapping`
without changing the canonical tables.

## Adapter Contract

Adapters live under `src/modules/connectors/providers/<provider>`. An adapter
receives raw payload, headers, query params, channel config, and tenant context.
It returns a normalization status, normalized contact/conversation/messages,
status events, warnings, missing mapping information, and metadata.

The registry is `src/modules/connectors/registry.ts`. Add a new provider there
only after fixtures and normalizer tests exist for its real payloads.

## Reprocessing

Dashboard reprocessing calls the current adapter against the stored
`raw_conversation_events.payload_json`. Canonical writes use upsert keys so the
same raw event can be reprocessed after mapping changes without duplicating
messages.

## Storage

For this MVP, raw payloads are stored in Postgres JSONB. Media is not downloaded.
Adapters only preserve media URL, MIME type, filename, caption, and metadata when
present. Future local media storage should use `/opt/roiwise/storage/media` on
the ROI Wise server, not S3, R2, BigQuery, ClickHouse, Kafka, or an external data
lake.
