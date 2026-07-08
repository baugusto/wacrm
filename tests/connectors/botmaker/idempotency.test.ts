import { describe, expect, it } from 'vitest';

import { computeBotmakerIdempotencyKey } from '@/modules/connectors/providers/botmaker/normalizer';
import agentPayload from '../../fixtures/connectors/botmaker/agent.json';
import botPayload from '../../fixtures/connectors/botmaker/bot.json';
import customerPayload from '../../fixtures/connectors/botmaker/customer.json';
import statusPayload from '../../fixtures/connectors/botmaker/hsm_status.json';
import { TEST_CHANNEL_ID } from './test-utils';

function key(payload: unknown) {
  return computeBotmakerIdempotencyKey(payload, TEST_CHANNEL_ID);
}

describe('Botmaker idempotency keys', () => {
  it.each([
    ['customer', customerPayload],
    ['bot', botPayload],
    ['agent', agentPayload],
    ['status', statusPayload],
  ])('generates a stable key for %s payloads', (_name, payload) => {
    expect(key(payload)).toBe(key(structuredClone(payload)));
  });

  it('uses the expected message key format', () => {
    expect(key(customerPayload)).toBe(
      `botmaker:${TEST_CHANNEL_ID}:message:${customerPayload.messages[0]['*id*']}`
    );
    expect(key(botPayload)).toBe(
      `botmaker:${TEST_CHANNEL_ID}:message:${botPayload.messages[0]['*id*']}`
    );
    expect(key(agentPayload)).toBe(
      `botmaker:${TEST_CHANNEL_ID}:message:${agentPayload.messages[0]['*id*']}`
    );
  });

  it('uses the expected status key format', () => {
    expect(key(statusPayload)).toBe(
      `botmaker:${TEST_CHANNEL_ID}:status:${statusPayload.messageId}:${statusPayload.status}:${statusPayload.statusChangeTime}`
    );
  });

  it('generates different keys for different messages', () => {
    expect(key(customerPayload)).not.toBe(key(botPayload));
    expect(key(botPayload)).not.toBe(key(agentPayload));
  });

  it('generates different keys for different statuses', () => {
    const readStatus = {
      ...statusPayload,
      status: 'read',
    };
    const laterStatus = {
      ...statusPayload,
      statusChangeTime: '2025-12-03T17:05:34.907Z',
    };

    expect(key(statusPayload)).not.toBe(key(readStatus));
    expect(key(statusPayload)).not.toBe(key(laterStatus));
  });
});
