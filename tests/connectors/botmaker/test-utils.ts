import type { NormalizerInput } from '@/modules/connectors/types';

export const TEST_CHANNEL_ID = 'channel-1';

export function botmakerInput(payload: unknown): NormalizerInput {
  return {
    payload,
    headers: {},
    query: {},
    channel: {
      id: TEST_CHANNEL_ID,
      account_id: 'account-1',
      workspace_id: 'workspace-1',
      name: 'Botmaker test',
      type: 'botmaker',
      provider: 'botmaker',
      status: 'active',
      external_id: 'brunoaugustoteste-whatsapp-551151962520',
      config_json: {},
    },
    tenant: {
      accountId: 'account-1',
      workspaceId: 'workspace-1',
      channelId: TEST_CHANNEL_ID,
    },
    receivedAt: '2025-12-03T18:00:00.000Z',
  };
}
