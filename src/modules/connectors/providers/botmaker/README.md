# Botmaker Adapter v1

`normalizer.ts` maps Botmaker message and status payloads into the ROI Wise
canonical connector model.

Supported event types:

- `type = "message"` with `messages[]`
- `type = "status"` for HSM/message status changes

The adapter is intentionally conservative. Unknown payload types return
`needs_mapping` and keep the raw event available for inspection.
