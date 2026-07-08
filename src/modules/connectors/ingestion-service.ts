import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

import { findActiveKeyByHash, touchLastUsed } from '@/lib/api-keys/store';
import { hashApiKey, looksLikeApiKey } from '@/lib/api-keys/keys';
import { hasScope } from '@/lib/api-keys/scopes';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { computeBotmakerIdempotencyKey } from './providers/botmaker/normalizer';
import { getConnectorAdapter } from './registry';
import type {
  ConnectorChannel,
  ConnectorIngestionStatus,
  NormalizerResult,
} from './types';

type JsonRecord = Record<string, unknown>;

interface IngestionOptions {
  forcedProvider?: string;
  channelId?: string;
}

class IngestionError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
    this.name = 'IngestionError';
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

function stableHash(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function extractPresentedKey(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (auth) {
    const value = auth.startsWith('Bearer ')
      ? auth.slice('Bearer '.length).trim()
      : auth.trim();
    if (value) return value;
  }

  const headerToken = request.headers.get('x-roiwise-token')?.trim();
  if (headerToken) return headerToken;

  const queryToken = new URL(request.url).searchParams.get('token')?.trim();
  return queryToken || null;
}

function headersToJson(headers: Headers): JsonRecord {
  const out: JsonRecord = {};
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    out[key] =
      lower === 'authorization' ||
      lower === 'x-roiwise-token' ||
      lower === 'cookie'
        ? '[redacted]'
        : value;
  });
  return out;
}

function queryToJson(url: string): JsonRecord {
  const out: JsonRecord = {};
  new URL(url).searchParams.forEach((value, key) => {
    out[key] = key.toLowerCase() === 'token' ? '[redacted]' : value;
  });
  return out;
}

async function authenticate(request: Request) {
  const presented = extractPresentedKey(request);
  if (!presented || !looksLikeApiKey(presented)) {
    throw new IngestionError('Missing or invalid API key', 401, 'unauthorized');
  }

  const key = await findActiveKeyByHash(hashApiKey(presented));
  if (!key) {
    throw new IngestionError('Missing or invalid API key', 401, 'unauthorized');
  }
  if (!hasScope(key.scopes, 'events:write')) {
    throw new IngestionError(
      "This API key is missing the 'events:write' scope",
      403,
      'forbidden'
    );
  }
  touchLastUsed(key.id);
  return key;
}

function unwrapPayload(body: unknown): {
  envelope: JsonRecord;
  provider: string | null;
  channelId: string | null;
  payload: unknown;
} {
  const envelope = isRecord(body) ? body : {};
  const nestedPayload = envelope.payload;
  const payload =
    isRecord(nestedPayload) && 'raw' in nestedPayload
      ? nestedPayload.raw
      : nestedPayload ?? body;
  return {
    envelope,
    provider: asString(envelope.provider),
    channelId: asString(envelope.channel_id) ?? asString(envelope.channelId),
    payload,
  };
}

function inspectEvent(
  provider: string,
  channelId: string,
  envelope: JsonRecord,
  payload: unknown
) {
  const raw = isRecord(payload) ? payload : {};
  const type =
    asString(envelope.event_type) ??
    asString(envelope.eventType) ??
    asString(raw.type) ??
    'unknown';
  const occurredAt =
    asString(envelope.occurred_at) ??
    asString(envelope.occurredAt) ??
    asString(raw.statusChangeTime) ??
    (Array.isArray(raw.messages) && isRecord(raw.messages[0])
      ? asString(raw.messages[0].date)
      : null) ??
    asString(raw.sessionCreationTime);
  const externalEventId =
    asString(envelope.event_id) ??
    asString(envelope.eventId) ??
    (provider === 'botmaker' && type === 'status'
      ? [
          asString(raw.messageId),
          asString(raw.status),
          asString(raw.statusChangeTime),
        ]
          .filter(Boolean)
          .join(':') || null
      : null) ??
    (provider === 'botmaker' && Array.isArray(raw.messages) && isRecord(raw.messages[0])
      ? asString(raw.messages[0]['*id*']) ?? asString(raw.messages[0].id)
      : null) ??
    asString(raw.sessionId);
  const idempotencyKey =
    provider === 'botmaker'
      ? computeBotmakerIdempotencyKey(payload, channelId)
      : externalEventId
        ? `${provider}:${channelId}:event:${externalEventId}`
        : `${provider}:${channelId}:event:${stableHash({ provider, channelId, occurredAt, payload })}`;

  return {
    eventType: type,
    occurredAt,
    externalEventId,
    idempotencyKey,
  };
}

async function resolveChannel(
  accountId: string,
  requestedChannelId: string | null,
  keyChannelId: string | null,
  provider: string | null,
  payload: unknown
): Promise<ConnectorChannel> {
  const raw = isRecord(payload) ? payload : {};
  const externalId = asString(raw.chatChannelId);
  const channelId = requestedChannelId ?? keyChannelId;
  let query = supabaseAdmin()
    .from('channels')
    .select(
      'id, account_id, workspace_id, name, type, provider, status, external_id, config_json'
    )
    .eq('account_id', accountId);

  if (channelId) {
    query = query.eq('id', channelId);
  } else if (provider && externalId) {
    query = query.eq('provider', provider).eq('external_id', externalId);
  } else {
    throw new IngestionError('channel_id is required', 400, 'bad_request');
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('[connectors] channel lookup error:', error);
    throw new IngestionError('Failed to resolve channel', 500, 'internal');
  }
  if (!data) {
    throw new IngestionError('Channel not found', 404, 'not_found');
  }
  if (keyChannelId && data.id !== keyChannelId) {
    throw new IngestionError(
      'API key is not allowed to write to this channel',
      403,
      'forbidden'
    );
  }
  if (data.status !== 'active') {
    throw new IngestionError('Channel is not active', 409, 'inactive_channel');
  }
  return data as ConnectorChannel;
}

async function saveCanonical(result: NormalizerResult, rawEventId: string) {
  const db = supabaseAdmin();
  const base = {
    account_id: undefined as string | undefined,
    workspace_id: undefined as string | undefined,
    channel_id: undefined as string | undefined,
  };

  const { data: rawEvent } = await db
    .from('raw_conversation_events')
    .select('account_id, workspace_id, channel_id')
    .eq('id', rawEventId)
    .single();
  if (!rawEvent) throw new Error('Raw event not found after insert');
  base.account_id = rawEvent.account_id as string;
  base.workspace_id = rawEvent.workspace_id as string;
  base.channel_id = rawEvent.channel_id as string;

  let contactId: string | null = null;
  if (result.contact) {
    const { data, error } = await db
      .from('canonical_contacts')
      .upsert(
        {
          ...base,
          provider: result.provider,
          external_id: result.contact.externalId,
          name: result.contact.name,
          phone: result.contact.phone,
          email: result.contact.email,
          document: result.contact.document,
          metadata_json: result.contact.metadata,
        },
        { onConflict: 'account_id,channel_id,provider,external_id' }
      )
      .select('id')
      .single();
    if (error || !data) throw error ?? new Error('Failed to upsert contact');
    contactId = data.id as string;
  }

  let conversationId: string | null = null;
  if (result.conversation) {
    const { data, error } = await db
      .from('canonical_conversations')
      .upsert(
        {
          ...base,
          provider: result.provider,
          external_id: result.conversation.externalId,
          contact_id: contactId,
          status: result.conversation.status,
          started_at: result.conversation.startedAt,
          last_message_at: result.conversation.lastMessageAt,
          closed_at: result.conversation.closedAt,
          metadata_json: result.conversation.metadata,
        },
        { onConflict: 'account_id,channel_id,provider,external_id' }
      )
      .select('id')
      .single();
    if (error || !data) {
      throw error ?? new Error('Failed to upsert conversation');
    }
    conversationId = data.id as string;
  }

  for (const message of result.messages) {
    if (!conversationId) continue;
    const { error } = await db.from('canonical_messages').upsert(
      {
        ...base,
        provider: result.provider,
        conversation_id: conversationId,
        contact_id: contactId,
        external_id: message.externalId,
        direction: message.direction,
        sender_type: message.senderType,
        sender_name: message.senderName,
        message_type: message.messageType,
        text: message.text,
        media_url: message.mediaUrl,
        media_mime_type: message.mediaMimeType,
        media_filename: message.mediaFilename,
        sent_at: message.sentAt,
        received_at: message.receivedAt,
        metadata_json: message.metadata,
        raw_event_id: rawEventId,
      },
      { onConflict: 'account_id,channel_id,provider,external_id' }
    );
    if (error) throw error;
  }

  for (const statusEvent of result.statusEvents) {
    const { data: message } = await db
      .from('canonical_messages')
      .select('id')
      .eq('account_id', base.account_id)
      .eq('channel_id', base.channel_id)
      .eq('provider', result.provider)
      .eq('external_id', statusEvent.externalMessageId)
      .maybeSingle();

    const { error } = await db.from('canonical_message_status_events').upsert(
      {
        ...base,
        provider: result.provider,
        message_id: message?.id ?? null,
        external_message_id: statusEvent.externalMessageId,
        status: statusEvent.status,
        occurred_at: statusEvent.occurredAt,
        payload_json: statusEvent.payload,
        metadata_json: statusEvent.metadata,
        raw_event_id: rawEventId,
      },
      {
        onConflict:
          'account_id,channel_id,provider,external_message_id,status,occurred_at',
      }
    );
    if (error) throw error;
  }
}

async function processRawEvent(
  rawEventId: string,
  channel: ConnectorChannel,
  payload: unknown,
  headers: JsonRecord,
  query: JsonRecord
) {
  const adapter = getConnectorAdapter(channel.provider);
  if (!adapter) {
    return updateRawEvent(rawEventId, 'needs_mapping', {
      errorMessage: `No adapter registered for provider ${channel.provider}`,
      warnings: [],
    });
  }

  let result: NormalizerResult;
  try {
    result = adapter.normalize({
      payload,
      headers,
      query,
      channel,
      tenant: {
        accountId: channel.account_id,
        workspaceId: channel.workspace_id,
        channelId: channel.id,
      },
      receivedAt: new Date().toISOString(),
    });
    if (result.ingestionStatus === 'normalized') {
      await saveCanonical(result, rawEventId);
    }
  } catch (err) {
    console.error('[connectors] normalization error:', err);
    return updateRawEvent(rawEventId, 'error', {
      errorMessage: 'Unexpected adapter error',
      warnings: [],
    });
  }

  return updateRawEvent(rawEventId, result.ingestionStatus, {
    normalizedAt:
      result.ingestionStatus === 'normalized' ? new Date().toISOString() : null,
    errorMessage: result.errorMessage ?? null,
    warnings: result.warnings,
    adapterKey: result.adapterKey,
    adapterVersion: result.adapterVersion,
    eventType: result.eventType,
    externalEventId: result.externalEventId,
    occurredAt: result.occurredAt,
  });
}

async function updateRawEvent(
  rawEventId: string,
  status: ConnectorIngestionStatus,
  options: {
    normalizedAt?: string | null;
    errorMessage?: string | null;
    warnings: string[];
    adapterKey?: string | null;
    adapterVersion?: string | null;
    eventType?: string | null;
    externalEventId?: string | null;
    occurredAt?: string | null;
  }
) {
  const { data, error } = await supabaseAdmin()
    .from('raw_conversation_events')
    .update({
      ingestion_status: status,
      normalized_at: options.normalizedAt,
      error_message: options.errorMessage,
      warnings_json: options.warnings,
      adapter_key: options.adapterKey,
      adapter_version: options.adapterVersion,
      event_type: options.eventType,
      external_event_id: options.externalEventId,
      occurred_at: options.occurredAt,
    })
    .eq('id', rawEventId)
    .select('id, ingestion_status')
    .single();
  if (error) throw error;
  return data;
}

export async function handleConnectorIngestion(
  request: Request,
  options: IngestionOptions = {}
) {
  try {
    const key = await authenticate(request);
    const body = await request.json().catch(() => null);
    if (body === null) {
      throw new IngestionError('Request body must be JSON', 400, 'bad_request');
    }

    const unwrapped = unwrapPayload(body);
    const provider = options.forcedProvider ?? unwrapped.provider;
    if (!provider) {
      throw new IngestionError('provider is required', 400, 'bad_request');
    }

    const channel = await resolveChannel(
      key.account_id,
      options.channelId ?? unwrapped.channelId,
      key.channel_id,
      provider,
      unwrapped.payload
    );
    if (channel.provider !== provider) {
      throw new IngestionError(
        'Provider does not match the target channel',
        400,
        'bad_request'
      );
    }

    const inspected = inspectEvent(
      provider,
      channel.id,
      unwrapped.envelope,
      unwrapped.payload
    );
    const headersJson = headersToJson(request.headers);
    const queryJson = queryToJson(request.url);

    const { data: rawEvent, error } = await supabaseAdmin()
      .from('raw_conversation_events')
      .insert({
        account_id: channel.account_id,
        workspace_id: channel.workspace_id,
        channel_id: channel.id,
        provider,
        source: provider,
        external_event_id: inspected.externalEventId,
        event_type: inspected.eventType,
        adapter_key: provider,
        adapter_version: 'v1',
        payload_json: unwrapped.payload,
        headers_json: headersJson,
        query_json: queryJson,
        occurred_at: inspected.occurredAt,
        ingestion_status: 'received',
        warnings_json: [],
        idempotency_key: inspected.idempotencyKey,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          {
            status: 'duplicate',
            idempotency_key: inspected.idempotencyKey,
          },
          { status: 200 }
        );
      }
      console.error('[connectors] raw event insert error:', error);
      throw new IngestionError('Failed to store raw event', 500, 'internal');
    }

    const processed = await processRawEvent(
      rawEvent.id as string,
      channel,
      unwrapped.payload,
      headersJson,
      queryJson
    );

    return NextResponse.json(
      {
        status: processed.ingestion_status,
        raw_event_id: rawEvent.id,
      },
      { status: processed.ingestion_status === 'normalized' ? 200 : 202 }
    );
  } catch (err) {
    if (err instanceof IngestionError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status }
      );
    }
    console.error('[connectors] ingestion error:', err);
    return NextResponse.json(
      { error: { code: 'internal', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function reprocessRawConnectorEvent(
  accountId: string,
  rawEventId: string
) {
  const { data: rawEvent, error } = await supabaseAdmin()
    .from('raw_conversation_events')
    .select('id, account_id, channel_id, payload_json, headers_json, query_json')
    .eq('id', rawEventId)
    .eq('account_id', accountId)
    .maybeSingle();
  if (error) throw error;
  if (!rawEvent) return null;

  const { data: channel, error: channelError } = await supabaseAdmin()
    .from('channels')
    .select(
      'id, account_id, workspace_id, name, type, provider, status, external_id, config_json'
    )
    .eq('id', rawEvent.channel_id as string)
    .eq('account_id', accountId)
    .maybeSingle();
  if (channelError) throw channelError;
  if (!channel) return null;

  return processRawEvent(
    rawEvent.id as string,
    channel as ConnectorChannel,
    rawEvent.payload_json,
    (rawEvent.headers_json as JsonRecord) ?? {},
    (rawEvent.query_json as JsonRecord) ?? {}
  );
}
