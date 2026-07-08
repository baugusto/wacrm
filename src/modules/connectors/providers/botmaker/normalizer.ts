import { createHash } from 'node:crypto';

import type {
  ConnectorAdapter,
  NormalizedMessage,
  NormalizerInput,
  NormalizerResult,
} from '../../types';

const ADAPTER_KEY = 'botmaker';
const ADAPTER_VERSION = 'v1';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 'true';
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

function hash(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function cleanMetadata(input: JsonRecord): JsonRecord {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  );
}

function fullName(payload: JsonRecord): string | null {
  const first = asString(payload.firstName);
  const last = asString(payload.lastName);
  return [first, last].filter(Boolean).join(' ') || null;
}

function contactExternalId(payload: JsonRecord): string | null {
  return (
    asString(payload.contactId) ??
    asString(payload.customerId) ??
    asString(payload.phone) ??
    asString(payload.whatsappNumber)
  );
}

function conversationExternalId(
  payload: JsonRecord,
  channelId: string
): string | null {
  const sessionId = asString(payload.sessionId);
  if (sessionId) return sessionId;
  const customerId = asString(payload.customerId);
  return customerId ? `${customerId}:${channelId}` : null;
}

function botmakerMessageId(
  message: JsonRecord,
  payload: JsonRecord,
  channelId: string,
  index: number
): string {
  return (
    asString(message['*id*']) ??
    asString(message.id) ??
    asString(message.messageId) ??
    hash({ channelId, payload, index })
  );
}

export function computeBotmakerIdempotencyKey(
  payload: unknown,
  channelId: string
): string {
  if (!isRecord(payload)) {
    return `botmaker:${channelId}:unknown:${hash(payload)}`;
  }

  const type = asString(payload.type)?.toLowerCase();
  if (type === 'status') {
    const messageId = asString(payload.messageId) ?? hash(payload);
    const status = asString(payload.status) ?? 'unknown';
    const statusChangeTime = asString(payload.statusChangeTime) ?? 'unknown';
    return `botmaker:${channelId}:status:${messageId}:${status}:${statusChangeTime}`;
  }

  if (type === 'message') {
    const firstMessage =
      Array.isArray(payload.messages) && isRecord(payload.messages[0])
        ? payload.messages[0]
        : null;
    const messageId = firstMessage
      ? botmakerMessageId(firstMessage, payload, channelId, 0)
      : hash(payload);
    return `botmaker:${channelId}:message:${messageId}`;
  }

  return `botmaker:${channelId}:unknown:${hash(payload)}`;
}

function inferSender(message: JsonRecord): Pick<
  NormalizedMessage,
  'direction' | 'senderType'
> {
  const from = asString(message.from)?.toLowerCase();
  if (from === 'user' || asBoolean(message.fromCustomer)) {
    return { direction: 'inbound', senderType: 'customer' };
  }
  if (from === 'bot') {
    return { direction: 'outbound', senderType: 'bot' };
  }
  if (from === 'operator') {
    return { direction: 'outbound', senderType: 'agent' };
  }
  return { direction: 'unknown', senderType: 'unknown' };
}

function mediaMetadata(message: JsonRecord): {
  messageType: string;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaFilename: string | null;
} {
  const media = isRecord(message.media)
    ? message.media
    : isRecord(message.attachment)
      ? message.attachment
      : null;
  const mediaUrl =
    asString(message.mediaUrl) ??
    asString(message.url) ??
    (media ? asString(media.url) : null);
  const mediaMimeType =
    asString(message.mimeType) ??
    asString(message.mime_type) ??
    (media ? asString(media.mimeType) ?? asString(media.mime_type) : null);
  const mediaFilename =
    asString(message.filename) ??
    asString(message.fileName) ??
    (media ? asString(media.filename) ?? asString(media.fileName) : null);

  return {
    messageType:
      asString(message.messageType) ??
      asString(message.type) ??
      (mediaUrl ? 'media' : 'text'),
    mediaUrl,
    mediaMimeType,
    mediaFilename,
  };
}

function normalizeMessagePayload(
  input: NormalizerInput,
  payload: JsonRecord
): NormalizerResult {
  const warnings: string[] = [];
  const messagesRaw = Array.isArray(payload.messages) ? payload.messages : null;
  const contactId = contactExternalId(payload);
  const conversationId = conversationExternalId(payload, input.channel.id);
  const channelExternalId = asString(payload.chatChannelId);

  if (!contactId) warnings.push('Missing contactId, customerId or phone');
  if (!conversationId) warnings.push('Missing sessionId or customerId');
  if (!Array.isArray(payload.messages)) {
    warnings.push('Missing messages[] array');
  } else if (payload.messages.length === 0) {
    warnings.push('Empty messages[] array');
  }
  if (!messagesRaw || messagesRaw.length === 0) {
    return {
      provider: 'botmaker',
      source: 'botmaker',
      adapterKey: ADAPTER_KEY,
      adapterVersion: ADAPTER_VERSION,
      eventType: 'message',
      externalEventId: null,
      occurredAt: asString(payload.sessionCreationTime),
      ingestionStatus: 'needs_mapping',
      errorMessage: 'Botmaker message payload without messages array',
      warnings,
      messages: [],
      statusEvents: [],
      metadata: { channel_external_id: channelExternalId },
    };
  }

  const normalizedMessages: NormalizedMessage[] = [];
  for (const [index, rawMessage] of messagesRaw.entries()) {
    if (!isRecord(rawMessage)) {
      warnings.push(`messages[${index}] is not an object`);
      continue;
    }

    const messageText =
      asString(rawMessage.message) ??
      asString(rawMessage.text) ??
      asString(rawMessage.body);
    const date = asString(rawMessage.date) ?? input.receivedAt;
    const ids = {
      contactId: contactId ?? asString(payload.whatsappNumber) ?? 'unknown',
      conversationId:
        conversationId ??
        `${asString(payload.customerId) ?? 'unknown'}:${input.channel.id}`,
    };
    const externalId = botmakerMessageId(
      rawMessage,
      payload,
      input.channel.id,
      index
    );
    const sender = inferSender(rawMessage);
    if (sender.direction === 'unknown') {
      warnings.push(`messages[${index}] has unknown from value`);
    }
    if (!messageText && !rawMessage.media && !rawMessage.attachment) {
      warnings.push(`messages[${index}] has no text or media content`);
    }
    const media = mediaMetadata(rawMessage);

    normalizedMessages.push({
      externalId,
      conversationExternalId: ids.conversationId,
      contactExternalId: ids.contactId,
      direction: sender.direction,
      senderType: sender.senderType,
      senderName:
        asString(rawMessage.operatorName) ?? asString(rawMessage.fromName),
      messageType: media.messageType,
      text: messageText,
      mediaUrl: media.mediaUrl,
      mediaMimeType: media.mediaMimeType,
      mediaFilename: media.mediaFilename,
      sentAt: sender.direction === 'outbound' ? date : null,
      receivedAt: sender.direction === 'inbound' ? date : null,
      metadata: cleanMetadata({
        botmaker_message_id: externalId,
        client_payload: rawMessage.clientPayload,
        operator_id: rawMessage.operatorId,
        operator_email: rawMessage.operatorEmail,
        operator_name: rawMessage.operatorName,
        operator_role: rawMessage.operatorRole,
        intent_name: rawMessage.intentName,
        from: rawMessage.from,
        from_customer: rawMessage.fromCustomer,
      }),
    });
  }

  if (!contactId || !conversationId || normalizedMessages.length === 0) {
    return {
      provider: 'botmaker',
      source: 'botmaker',
      adapterKey: ADAPTER_KEY,
      adapterVersion: ADAPTER_VERSION,
      eventType: 'message',
      externalEventId: null,
      occurredAt: asString(payload.sessionCreationTime),
      ingestionStatus: 'needs_mapping',
      errorMessage: 'Botmaker message payload is missing minimum fields',
      warnings,
      messages: normalizedMessages,
      statusEvents: [],
      metadata: { channel_external_id: channelExternalId },
    };
  }

  const lastMessageAt =
    normalizedMessages[normalizedMessages.length - 1]?.sentAt ??
    normalizedMessages[normalizedMessages.length - 1]?.receivedAt ??
    null;

  return {
    provider: 'botmaker',
    source: 'botmaker',
    adapterKey: ADAPTER_KEY,
    adapterVersion: ADAPTER_VERSION,
    eventType: 'message',
    externalEventId: normalizedMessages[0]?.externalId ?? null,
    occurredAt: lastMessageAt ?? asString(payload.sessionCreationTime),
    ingestionStatus: 'normalized',
    warnings,
    contact: {
      externalId: contactId,
      name: fullName(payload),
      phone: asString(payload.contactId) ?? asString(payload.whatsappNumber),
      metadata: cleanMetadata({
        botmaker_customer_id: payload.customerId,
        customer_creation_time: payload.customerCreationTime,
        botmaker_variables: payload.variables,
        chat_platform: payload.chatPlatform,
        whatsapp_number: payload.whatsappNumber,
      }),
    },
    conversation: {
      externalId: conversationId,
      contactExternalId: contactId,
      status: 'open',
      startedAt: asString(payload.sessionCreationTime),
      lastMessageAt,
      metadata: cleanMetadata({
        chat_platform: payload.chatPlatform,
        chat_channel_id: channelExternalId,
        whatsapp_number: payload.whatsappNumber,
        botmaker_customer_id: payload.customerId,
        botmaker_variables: payload.variables,
      }),
    },
    messages: normalizedMessages,
    statusEvents: [],
    metadata: { channel_external_id: channelExternalId },
  };
}

function normalizeStatusPayload(
  input: NormalizerInput,
  payload: JsonRecord
): NormalizerResult {
  const messageId = asString(payload.messageId);
  const status = asString(payload.status);
  const occurredAt = asString(payload.statusChangeTime);
  const warnings: string[] = [];

  if (!messageId) warnings.push('Missing messageId');
  if (!status) warnings.push('Missing status');

  if (!messageId || !status) {
    return {
      provider: 'botmaker',
      source: 'botmaker',
      adapterKey: ADAPTER_KEY,
      adapterVersion: ADAPTER_VERSION,
      eventType: 'status',
      externalEventId: null,
      occurredAt,
      ingestionStatus: 'needs_mapping',
      errorMessage: 'Botmaker status payload is missing minimum fields',
      warnings,
      messages: [],
      statusEvents: [],
      metadata: {},
    };
  }

  return {
    provider: 'botmaker',
    source: 'botmaker',
    adapterKey: ADAPTER_KEY,
    adapterVersion: ADAPTER_VERSION,
    eventType: 'status',
    externalEventId: `${messageId}:${status}:${occurredAt ?? ''}`,
    occurredAt,
    ingestionStatus: 'normalized',
    warnings,
    messages: [],
    statusEvents: [
      {
        externalMessageId: messageId,
        status,
        occurredAt,
        payload,
        metadata: cleanMetadata({
          intent_tx_id: payload.intentTxId,
          business_id: payload.businessId,
          customer_id: payload.customerId,
          whatsapp_number: payload.whatsappNumber,
        }),
      },
    ],
    metadata: {
      chat_channel_id: asString(payload.chatChannelId),
      chat_platform: asString(payload.chatPlatform),
    },
  };
}

export function normalizeBotmakerPayload(
  input: NormalizerInput
): NormalizerResult {
  if (!isRecord(input.payload)) {
    return {
      provider: 'botmaker',
      source: 'botmaker',
      adapterKey: ADAPTER_KEY,
      adapterVersion: ADAPTER_VERSION,
      eventType: null,
      externalEventId: null,
      occurredAt: null,
      ingestionStatus: 'needs_mapping',
      errorMessage: 'Botmaker payload must be a JSON object',
      warnings: ['Payload is not an object'],
      messages: [],
      statusEvents: [],
      metadata: {},
    };
  }

  const type = asString(input.payload.type)?.toLowerCase();
  if (type === 'message') return normalizeMessagePayload(input, input.payload);
  if (type === 'status') return normalizeStatusPayload(input, input.payload);

  return {
    provider: 'botmaker',
    source: 'botmaker',
    adapterKey: ADAPTER_KEY,
    adapterVersion: ADAPTER_VERSION,
    eventType: type ?? 'unknown',
    externalEventId: null,
    occurredAt: null,
    ingestionStatus: 'needs_mapping',
    errorMessage: 'Unknown Botmaker payload type',
    warnings: [`Unknown Botmaker payload type: ${type ?? 'missing'}`],
    messages: [],
    statusEvents: [],
    metadata: {},
  };
}

export const botmakerAdapter: ConnectorAdapter = {
  providerKey: 'botmaker',
  displayName: 'Botmaker',
  adapterVersion: ADAPTER_VERSION,
  status: 'experimental',
  supportedEventTypes: ['message', 'status'],
  normalize: normalizeBotmakerPayload,
};
