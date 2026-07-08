import { describe, expect, it } from 'vitest';

import customerPayload from '../fixtures/connectors/botmaker/customer.json';
import {
  integrationEnabled,
  postJson,
  requiredIntegrationConfig,
} from './local-test-env';

const shouldRunIntegration = integrationEnabled();

if (!shouldRunIntegration) {
  describe.skip('local generic connector endpoint', () => {
    it('is disabled until ROIWISE_RUN_INTEGRATION_TESTS=true', () => {});
  });
} else {
  describe('local generic connector endpoint', () => {
  const config = requiredIntegrationConfig();

  it('routes a Botmaker envelope to the Botmaker adapter', async () => {
    const { response, payload } = await postJson(
      `${config.baseUrl}/api/connectors/events`,
      {
        provider: 'botmaker',
        channel_id: config.channelId,
        event_type: 'message',
        event_id: 'evt_test_generic_001',
        occurred_at: '2025-12-03T16:58:34.907Z',
        payload: customerPayload,
      },
      {
        Authorization: `Bearer ${config.apiKey}`,
      }
    );

    expect(response.status).not.toBe(500);
    expect([200, 202]).toContain(response.status);
    expect(payload).toEqual(
      expect.objectContaining({
        status: expect.stringMatching(/^(normalized|accepted|duplicate)$/),
      })
    );
  });
  });
}
