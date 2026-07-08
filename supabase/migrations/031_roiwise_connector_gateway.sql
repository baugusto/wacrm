-- ============================================================
-- 031_roiwise_connector_gateway.sql
--
-- ROI Wise Connector Gateway MVP foundation:
--   - account-scoped workspaces and inbound channels
--   - raw connector event store
--   - canonical contacts/conversations/messages/status events
--   - optional channel binding for existing API keys
--
-- Idempotent where Postgres supports it. Policies are recreated
-- because CREATE POLICY has no IF NOT EXISTS.
-- ============================================================

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, slug)
);

CREATE INDEX IF NOT EXISTS workspaces_account_id_idx ON workspaces (account_id);

DROP TRIGGER IF EXISTS set_updated_at ON workspaces;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO workspaces (account_id, name, slug, status)
SELECT a.id, 'Default workspace', 'default', 'active'
FROM accounts a
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces w WHERE w.account_id = a.id
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspaces_select ON workspaces;
CREATE POLICY workspaces_select ON workspaces FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS workspaces_insert ON workspaces;
CREATE POLICY workspaces_insert ON workspaces FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS workspaces_update ON workspaces;
CREATE POLICY workspaces_update ON workspaces FOR UPDATE
  USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS workspaces_delete ON workspaces;
CREATE POLICY workspaces_delete ON workspaces FOR DELETE
  USING (is_account_member(account_id, 'admin'));

CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'botmaker' CHECK (type IN ('botmaker', 'generic_webhook', 'whatsapp_cloud', 'webchat', 'manual_import')),
  provider text NOT NULL DEFAULT 'botmaker',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  external_id text,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_hash text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS channels_account_id_idx ON channels (account_id);
CREATE INDEX IF NOT EXISTS channels_workspace_id_idx ON channels (workspace_id);
CREATE INDEX IF NOT EXISTS channels_provider_idx ON channels (provider);
CREATE INDEX IF NOT EXISTS channels_external_id_idx ON channels (account_id, provider, external_id);
CREATE INDEX IF NOT EXISTS channels_created_at_idx ON channels (created_at);

DROP TRIGGER IF EXISTS set_updated_at ON channels;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS channels_select ON channels;
CREATE POLICY channels_select ON channels FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS channels_insert ON channels;
CREATE POLICY channels_insert ON channels FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS channels_update ON channels;
CREATE POLICY channels_update ON channels FOR UPDATE
  USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS channels_delete ON channels;
CREATE POLICY channels_delete ON channels FOR DELETE
  USING (is_account_member(account_id, 'admin'));

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS channel_id uuid REFERENCES channels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS api_keys_channel_id_idx ON api_keys (channel_id);

CREATE TABLE IF NOT EXISTS raw_conversation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  provider text NOT NULL,
  source text NOT NULL,
  external_event_id text,
  event_type text,
  adapter_key text,
  adapter_version text,
  payload_json jsonb NOT NULL,
  headers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  query_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  ingestion_status text NOT NULL DEFAULT 'received' CHECK (ingestion_status IN ('received', 'normalized', 'needs_mapping', 'error', 'ignored', 'duplicate')),
  normalized_at timestamptz,
  error_message text,
  warnings_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS raw_events_idempotency_uidx
  ON raw_conversation_events (account_id, channel_id, provider, idempotency_key);
CREATE INDEX IF NOT EXISTS raw_events_account_id_idx ON raw_conversation_events (account_id);
CREATE INDEX IF NOT EXISTS raw_events_workspace_id_idx ON raw_conversation_events (workspace_id);
CREATE INDEX IF NOT EXISTS raw_events_channel_id_idx ON raw_conversation_events (channel_id);
CREATE INDEX IF NOT EXISTS raw_events_provider_idx ON raw_conversation_events (provider);
CREATE INDEX IF NOT EXISTS raw_events_external_event_id_idx ON raw_conversation_events (external_event_id);
CREATE INDEX IF NOT EXISTS raw_events_created_at_idx ON raw_conversation_events (created_at);
CREATE INDEX IF NOT EXISTS raw_events_occurred_at_idx ON raw_conversation_events (occurred_at);

ALTER TABLE raw_conversation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS raw_events_select ON raw_conversation_events;
CREATE POLICY raw_events_select ON raw_conversation_events FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS raw_events_insert ON raw_conversation_events;
CREATE POLICY raw_events_insert ON raw_conversation_events FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS raw_events_update ON raw_conversation_events;
CREATE POLICY raw_events_update ON raw_conversation_events FOR UPDATE
  USING (is_account_member(account_id, 'admin'));

CREATE TABLE IF NOT EXISTS canonical_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_id text NOT NULL,
  name text,
  phone text,
  email text,
  document text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS canonical_contacts_external_uidx
  ON canonical_contacts (account_id, channel_id, provider, external_id);
CREATE INDEX IF NOT EXISTS canonical_contacts_account_id_idx ON canonical_contacts (account_id);
CREATE INDEX IF NOT EXISTS canonical_contacts_workspace_id_idx ON canonical_contacts (workspace_id);
CREATE INDEX IF NOT EXISTS canonical_contacts_channel_id_idx ON canonical_contacts (channel_id);
CREATE INDEX IF NOT EXISTS canonical_contacts_provider_idx ON canonical_contacts (provider);
CREATE INDEX IF NOT EXISTS canonical_contacts_created_at_idx ON canonical_contacts (created_at);

DROP TRIGGER IF EXISTS set_updated_at ON canonical_contacts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON canonical_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE canonical_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS canonical_contacts_select ON canonical_contacts;
CREATE POLICY canonical_contacts_select ON canonical_contacts FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS canonical_contacts_write ON canonical_contacts;
CREATE POLICY canonical_contacts_write ON canonical_contacts FOR ALL
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));

CREATE TABLE IF NOT EXISTS canonical_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_id text NOT NULL,
  contact_id uuid REFERENCES canonical_contacts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open',
  started_at timestamptz,
  last_message_at timestamptz,
  closed_at timestamptz,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS canonical_conversations_external_uidx
  ON canonical_conversations (account_id, channel_id, provider, external_id);
CREATE INDEX IF NOT EXISTS canonical_conversations_account_id_idx ON canonical_conversations (account_id);
CREATE INDEX IF NOT EXISTS canonical_conversations_workspace_id_idx ON canonical_conversations (workspace_id);
CREATE INDEX IF NOT EXISTS canonical_conversations_channel_id_idx ON canonical_conversations (channel_id);
CREATE INDEX IF NOT EXISTS canonical_conversations_provider_idx ON canonical_conversations (provider);
CREATE INDEX IF NOT EXISTS canonical_conversations_contact_id_idx ON canonical_conversations (contact_id);
CREATE INDEX IF NOT EXISTS canonical_conversations_external_id_idx ON canonical_conversations (external_id);
CREATE INDEX IF NOT EXISTS canonical_conversations_created_at_idx ON canonical_conversations (created_at);

DROP TRIGGER IF EXISTS set_updated_at ON canonical_conversations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON canonical_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE canonical_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS canonical_conversations_select ON canonical_conversations;
CREATE POLICY canonical_conversations_select ON canonical_conversations FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS canonical_conversations_write ON canonical_conversations;
CREATE POLICY canonical_conversations_write ON canonical_conversations FOR ALL
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));

CREATE TABLE IF NOT EXISTS canonical_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  provider text NOT NULL,
  conversation_id uuid NOT NULL REFERENCES canonical_conversations(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES canonical_contacts(id) ON DELETE SET NULL,
  external_id text NOT NULL,
  direction text NOT NULL DEFAULT 'unknown' CHECK (direction IN ('inbound', 'outbound', 'unknown')),
  sender_type text NOT NULL DEFAULT 'unknown' CHECK (sender_type IN ('customer', 'agent', 'bot', 'system', 'unknown')),
  sender_name text,
  message_type text NOT NULL DEFAULT 'text',
  text text,
  media_url text,
  media_mime_type text,
  media_filename text,
  sent_at timestamptz,
  received_at timestamptz,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_event_id uuid NOT NULL REFERENCES raw_conversation_events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS canonical_messages_external_uidx
  ON canonical_messages (account_id, channel_id, provider, external_id);
CREATE INDEX IF NOT EXISTS canonical_messages_account_id_idx ON canonical_messages (account_id);
CREATE INDEX IF NOT EXISTS canonical_messages_workspace_id_idx ON canonical_messages (workspace_id);
CREATE INDEX IF NOT EXISTS canonical_messages_channel_id_idx ON canonical_messages (channel_id);
CREATE INDEX IF NOT EXISTS canonical_messages_provider_idx ON canonical_messages (provider);
CREATE INDEX IF NOT EXISTS canonical_messages_conversation_id_idx ON canonical_messages (conversation_id);
CREATE INDEX IF NOT EXISTS canonical_messages_contact_id_idx ON canonical_messages (contact_id);
CREATE INDEX IF NOT EXISTS canonical_messages_external_id_idx ON canonical_messages (external_id);
CREATE INDEX IF NOT EXISTS canonical_messages_created_at_idx ON canonical_messages (created_at);
CREATE INDEX IF NOT EXISTS canonical_messages_raw_event_id_idx ON canonical_messages (raw_event_id);

ALTER TABLE canonical_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS canonical_messages_select ON canonical_messages;
CREATE POLICY canonical_messages_select ON canonical_messages FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS canonical_messages_write ON canonical_messages;
CREATE POLICY canonical_messages_write ON canonical_messages FOR ALL
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));

CREATE TABLE IF NOT EXISTS canonical_message_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  provider text NOT NULL,
  message_id uuid REFERENCES canonical_messages(id) ON DELETE SET NULL,
  external_message_id text NOT NULL,
  status text NOT NULL,
  occurred_at timestamptz,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_event_id uuid NOT NULL REFERENCES raw_conversation_events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS canonical_status_events_uidx
  ON canonical_message_status_events (
    account_id,
    channel_id,
    provider,
    external_message_id,
    status,
    occurred_at
  );
CREATE INDEX IF NOT EXISTS canonical_status_account_id_idx ON canonical_message_status_events (account_id);
CREATE INDEX IF NOT EXISTS canonical_status_workspace_id_idx ON canonical_message_status_events (workspace_id);
CREATE INDEX IF NOT EXISTS canonical_status_channel_id_idx ON canonical_message_status_events (channel_id);
CREATE INDEX IF NOT EXISTS canonical_status_provider_idx ON canonical_message_status_events (provider);
CREATE INDEX IF NOT EXISTS canonical_status_message_id_idx ON canonical_message_status_events (message_id);
CREATE INDEX IF NOT EXISTS canonical_status_external_message_id_idx ON canonical_message_status_events (external_message_id);
CREATE INDEX IF NOT EXISTS canonical_status_created_at_idx ON canonical_message_status_events (created_at);
CREATE INDEX IF NOT EXISTS canonical_status_occurred_at_idx ON canonical_message_status_events (occurred_at);
CREATE INDEX IF NOT EXISTS canonical_status_raw_event_id_idx ON canonical_message_status_events (raw_event_id);

ALTER TABLE canonical_message_status_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS canonical_status_select ON canonical_message_status_events;
CREATE POLICY canonical_status_select ON canonical_message_status_events FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS canonical_status_write ON canonical_message_status_events;
CREATE POLICY canonical_status_write ON canonical_message_status_events FOR ALL
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));
