export type ConnectorProviderKey = 'botmaker' | 'generic_webhook';

export type ConnectorIngestionStatus =
  | 'received'
  | 'normalized'
  | 'needs_mapping'
  | 'error'
  | 'ignored'
  | 'duplicate';

export interface ConnectorChannel {
  id: string;
  account_id: string;
  workspace_id: string;
  name: string;
  type: string;
  provider: string;
  status: string;
  external_id: string | null;
  config_json: Record<string, unknown> | null;
}

export interface TenantContext {
  accountId: string;
  workspaceId: string;
  channelId: string;
}

export interface NormalizerInput {
  payload: unknown;
  headers: Record<string, unknown>;
  query: Record<string, unknown>;
  channel: ConnectorChannel;
  tenant: TenantContext;
  receivedAt: string;
}

export interface NormalizedContact {
  externalId: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  document?: string | null;
  metadata: Record<string, unknown>;
}

export interface NormalizedConversation {
  externalId: string;
  contactExternalId: string;
  status: string;
  startedAt?: string | null;
  lastMessageAt?: string | null;
  closedAt?: string | null;
  metadata: Record<string, unknown>;
}

export interface NormalizedMessage {
  externalId: string;
  conversationExternalId: string;
  contactExternalId: string;
  direction: 'inbound' | 'outbound' | 'unknown';
  senderType: 'customer' | 'agent' | 'bot' | 'system' | 'unknown';
  senderName?: string | null;
  messageType: string;
  text?: string | null;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  mediaFilename?: string | null;
  sentAt?: string | null;
  receivedAt?: string | null;
  metadata: Record<string, unknown>;
}

export interface NormalizedStatusEvent {
  externalMessageId: string;
  status: string;
  occurredAt?: string | null;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface NormalizerResult {
  provider: ConnectorProviderKey;
  source: string;
  adapterKey: string;
  adapterVersion: string;
  eventType: string | null;
  externalEventId: string | null;
  occurredAt: string | null;
  ingestionStatus: ConnectorIngestionStatus;
  errorMessage?: string | null;
  warnings: string[];
  contact?: NormalizedContact;
  conversation?: NormalizedConversation;
  messages: NormalizedMessage[];
  statusEvents: NormalizedStatusEvent[];
  metadata: Record<string, unknown>;
}

export interface ConnectorAdapter {
  providerKey: ConnectorProviderKey;
  displayName: string;
  adapterVersion: string;
  status: 'experimental' | 'stable' | 'deprecated';
  supportedEventTypes: string[];
  normalize(input: NormalizerInput): NormalizerResult;
}
