import { describe, expect, it } from 'vitest';

import agentPayload from '../../../../../tests/fixtures/connectors/botmaker/agent.json';
import botPayload from '../../../../../tests/fixtures/connectors/botmaker/bot.json';
import customerPayload from '../../../../../tests/fixtures/connectors/botmaker/customer.json';
import statusPayload from '../../../../../tests/fixtures/connectors/botmaker/hsm_status.json';
import unknownPayload from '../../../../../tests/fixtures/connectors/botmaker/unknown-payload.json';
import { normalizeBotmakerPayload } from './normalizer';
import type { NormalizerInput } from '../../types';

function input(payload: unknown): NormalizerInput {
  return {
    payload,
    headers: {},
    query: {},
    channel: {
      id: 'channel-1',
      account_id: 'account-1',
      workspace_id: 'workspace-1',
      name: 'Botmaker',
      type: 'botmaker',
      provider: 'botmaker',
      status: 'active',
      external_id: 'brunoaugustoteste-whatsapp-551151962520',
      config_json: {},
    },
    tenant: {
      accountId: 'account-1',
      workspaceId: 'workspace-1',
      channelId: 'channel-1',
    },
    receivedAt: '2025-12-03T18:00:00.000Z',
  };
}

describe('normalizeBotmakerPayload', () => {
  it('normalizes an agent message as outbound agent', () => {
    const result = normalizeBotmakerPayload(input(agentPayload));

    expect(result.ingestionStatus).toBe('normalized');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.direction).toBe('outbound');
    expect(result.messages[0]?.senderType).toBe('agent');
    expect(result.messages[0]?.senderName).toBe('Agent One');
    expect(result.messages[0]?.metadata.operator_email).toBe(
      'agent@example.com'
    );
  });

  it('normalizes a bot message as outbound bot', () => {
    const result = normalizeBotmakerPayload(input(botPayload));

    expect(result.ingestionStatus).toBe('normalized');
    expect(result.messages[0]?.direction).toBe('outbound');
    expect(result.messages[0]?.senderType).toBe('bot');
    expect(result.messages[0]?.metadata.intent_name).toBe('greeting');
  });

  it('normalizes a customer message as inbound customer', () => {
    const result = normalizeBotmakerPayload(input(customerPayload));

    expect(result.ingestionStatus).toBe('normalized');
    expect(result.messages[0]?.direction).toBe('inbound');
    expect(result.messages[0]?.senderType).toBe('customer');
    expect(result.messages[0]?.receivedAt).toBe('2025-12-03T16:58:34.907Z');
  });

  it('normalizes a message status event', () => {
    const result = normalizeBotmakerPayload(input(statusPayload));

    expect(result.ingestionStatus).toBe('normalized');
    expect(result.eventType).toBe('status');
    expect(result.statusEvents).toHaveLength(1);
    expect(result.statusEvents[0]?.status).toBe('delivered');
    expect(result.statusEvents[0]?.externalMessageId).toBe('BOT-MSG-001');
    expect(result.statusEvents[0]?.occurredAt).toBe(
      '2025-12-03T17:02:34.907Z'
    );
    expect(result.statusEvents[0]?.metadata.intent_tx_id).toBe('intent-tx-1');
  });

  it('returns needs_mapping for unknown payloads', () => {
    const result = normalizeBotmakerPayload(input(unknownPayload));

    expect(result.ingestionStatus).toBe('needs_mapping');
    expect(result.messages).toEqual([]);
    expect(result.warnings[0]).toContain('Unknown Botmaker payload type');
  });
});
