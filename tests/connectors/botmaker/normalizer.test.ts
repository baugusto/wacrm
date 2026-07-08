import { describe, expect, it } from 'vitest';

import { normalizeBotmakerPayload } from '@/modules/connectors/providers/botmaker/normalizer';
import agentPayload from '../../fixtures/connectors/botmaker/agent.json';
import botPayload from '../../fixtures/connectors/botmaker/bot.json';
import customerPayload from '../../fixtures/connectors/botmaker/customer.json';
import emptyMessagesPayload from '../../fixtures/connectors/botmaker/empty-messages-array.json';
import statusPayload from '../../fixtures/connectors/botmaker/hsm_status.json';
import missingMessagesPayload from '../../fixtures/connectors/botmaker/missing-messages-array.json';
import multipleMessagesPayload from '../../fixtures/connectors/botmaker/multiple-messages.json';
import unknownPayload from '../../fixtures/connectors/botmaker/unknown-payload.json';
import { botmakerInput } from './test-utils';

describe('Botmaker normalizer v1', () => {
  it('normalizes customer.json as inbound customer', () => {
    const result = normalizeBotmakerPayload(botmakerInput(customerPayload));

    expect(result.ingestionStatus).toBe('normalized');
    expect(result.contact?.externalId).toBe(customerPayload.contactId);
    expect(result.conversation?.externalId).toBe(customerPayload.sessionId);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      externalId: customerPayload.messages[0]['*id*'],
      direction: 'inbound',
      senderType: 'customer',
      text: customerPayload.messages[0].message,
    });
  });

  it('normalizes bot.json as outbound bot with intent metadata', () => {
    const result = normalizeBotmakerPayload(botmakerInput(botPayload));

    expect(result.ingestionStatus).toBe('normalized');
    expect(result.messages[0]).toMatchObject({
      direction: 'outbound',
      senderType: 'bot',
      senderName: 'Bot',
    });
    expect(result.messages[0]?.metadata.intent_name).toBe('greeting');
  });

  it('normalizes agent.json as outbound agent with operator metadata', () => {
    const result = normalizeBotmakerPayload(botmakerInput(agentPayload));

    expect(result.ingestionStatus).toBe('normalized');
    expect(result.messages[0]).toMatchObject({
      direction: 'outbound',
      senderType: 'agent',
      senderName: 'Agent One',
    });
    expect(result.messages[0]?.metadata.operator_email).toBe(
      'agent@example.com'
    );
    expect(result.messages[0]?.metadata.operator_id).toBe('op-1');
    expect(result.messages[0]?.metadata.operator_role).toBe('agent');
  });

  it('normalizes hsm_status.json as a canonical status event', () => {
    const result = normalizeBotmakerPayload(botmakerInput(statusPayload));

    expect(result.ingestionStatus).toBe('normalized');
    expect(result.statusEvents).toHaveLength(1);
    expect(result.statusEvents[0]).toMatchObject({
      externalMessageId: statusPayload.messageId,
      status: 'delivered',
      occurredAt: statusPayload.statusChangeTime,
    });
    expect(result.statusEvents[0]?.metadata.intent_tx_id).toBe(
      statusPayload.intentTxId
    );
  });

  it('returns needs_mapping for unknown payloads without creating messages', () => {
    const result = normalizeBotmakerPayload(botmakerInput(unknownPayload));

    expect(result.ingestionStatus).toBe('needs_mapping');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.messages).toEqual([]);
  });

  it('returns needs_mapping when messages[] is missing', () => {
    const result = normalizeBotmakerPayload(botmakerInput(missingMessagesPayload));

    expect(result.ingestionStatus).toBe('needs_mapping');
    expect(result.errorMessage).toContain('without messages array');
    expect(result.warnings).toContain('Missing messages[] array');
  });

  it('returns needs_mapping when messages[] is empty', () => {
    const result = normalizeBotmakerPayload(botmakerInput(emptyMessagesPayload));

    expect(result.ingestionStatus).toBe('needs_mapping');
    expect(result.errorMessage).toContain('without messages array');
    expect(result.warnings).toContain('Empty messages[] array');
  });

  it('normalizes multiple messages from one payload into one conversation', () => {
    const result = normalizeBotmakerPayload(botmakerInput(multipleMessagesPayload));

    expect(result.ingestionStatus).toBe('normalized');
    expect(result.messages).toHaveLength(3);
    expect(result.messages.map((message) => message.direction)).toEqual([
      'inbound',
      'outbound',
      'outbound',
    ]);
    expect(result.messages.map((message) => message.senderType)).toEqual([
      'customer',
      'bot',
      'agent',
    ]);
    expect(
      new Set(result.messages.map((message) => message.conversationExternalId))
        .size
    ).toBe(1);
    expect(result.messages[0]?.conversationExternalId).toBe(
      multipleMessagesPayload.sessionId
    );
  });
});
