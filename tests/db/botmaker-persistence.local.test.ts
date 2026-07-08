import { describe, it } from 'vitest';

const runDbTests = process.env.ROIWISE_RUN_DB_TESTS === 'true';

const describeDb = runDbTests ? describe : describe.skip;

describeDb('local Botmaker persistence DB checks', () => {
  it.todo('raw_conversation_events receives the complete payload');
  it.todo('raw_conversation_events stores the expected ingestion_status');
  it.todo('canonical_contacts is created or updated');
  it.todo('canonical_conversations is created or updated');
  it.todo('canonical_messages is created without duplicates on resend');
  it.todo('canonical_message_status_events is created for status payloads');
  it.todo('all connector rows carry account_id, workspace_id, and channel_id');
});
