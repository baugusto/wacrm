# Botmaker Connector

Botmaker is the first ROI Wise connector adapter. It is experimental and is not
the default shape for every BSP.

## Setup

1. Open `Channels`.
2. Create or select a workspace.
3. Create a Botmaker channel.
4. Use the Botmaker `chatChannelId` as the channel external id when available.
5. Generate an API key for the channel and store it immediately.

The key is shown once and stored only as a SHA-256 hash.

## Endpoints

Specific Botmaker endpoint:

```bash
curl -X POST "https://roiwise.com.br/api/connectors/botmaker/<channelId>" \
  -H "Authorization: Bearer rw_live_xxx" \
  -H "Content-Type: application/json" \
  -d @payload.json
```

Generic endpoint:

```bash
curl -X POST "https://roiwise.com.br/api/connectors/events" \
  -H "Authorization: Bearer rw_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "botmaker",
    "channel_id": "<channelId>",
    "event_type": "message.created",
    "event_id": "external-event-id",
    "occurred_at": "2026-07-07T18:20:00Z",
    "payload": { "raw": { "type": "message", "messages": [] } }
  }'
```

`x-roiwise-token: <api_key>` is accepted. `?token=<api_key>` is a fallback for
platforms that cannot send headers, but headers are preferred.

## Minimum Fields

Message payloads need a contact identifier, a conversation/session identifier,
message id or hash fallback, content or media metadata, and a timestamp or
received-at fallback.

Status payloads need `messageId`, `status`, and preferably `statusChangeTime`.
If a status arrives before the original message, ROI Wise stores the status with
`message_id = null` and keeps `external_message_id` for future reconciliation.

## Operations

Use `Channels -> Events` to inspect raw payloads, headers, warnings, and
`needs_mapping` errors. Reprocess an event after an adapter or mapping change.
Use `Data Explorer` to inspect normalized conversations and message direction:
customer messages as inbound/customer, bot messages as outbound/bot, and human
agent messages as outbound/agent.

Real Botmaker payloads can vary. During rollout, capture fixtures from each
tenant/channel and update the adapter mapping deliberately.
