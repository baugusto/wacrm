import { describe, expect, it } from 'vitest';

import agentPayload from '../fixtures/connectors/botmaker/agent.json';
import botPayload from '../fixtures/connectors/botmaker/bot.json';
import customerPayload from '../fixtures/connectors/botmaker/customer.json';
import statusPayload from '../fixtures/connectors/botmaker/hsm_status.json';
import unknownPayload from '../fixtures/connectors/botmaker/unknown-payload.json';
import {
  integrationEnabled,
  postJson,
  requiredIntegrationConfig,
} from './local-test-env';

const shouldRunIntegration = integrationEnabled();

function expectNon500(response: Response) {
  expect(response.status).not.toBe(500);
}

function expectAccepted(response: Response, payload: unknown) {
  expect([200, 202]).toContain(response.status);
  expect(payload).toEqual(
    expect.objectContaining({
      status: expect.stringMatching(/^(normalized|accepted|duplicate)$/),
    })
  );
}

if (!shouldRunIntegration) {
  describe.skip('local Botmaker ingestion endpoint', () => {
    it('is disabled until ROIWISE_RUN_INTEGRATION_TESTS=true', () => {});
  });
} else {
  describe('local Botmaker ingestion endpoint', () => {
  const config = requiredIntegrationConfig();
  const endpoint = `${config.baseUrl}/api/connectors/botmaker/${config.channelId}`;

  it.each([
    ['customer.json', customerPayload],
    ['bot.json', botPayload],
    ['agent.json', agentPayload],
    ['hsm_status.json', statusPayload],
  ])('accepts %s without a server error', async (_name, fixture) => {
    const { response, payload } = await postJson(endpoint, fixture, {
      Authorization: `Bearer ${config.apiKey}`,
    });

    expectNon500(response);
    expectAccepted(response, payload);
  });

  it('stores unknown payloads as needs_mapping without a server error', async () => {
    const { response, payload } = await postJson(endpoint, unknownPayload, {
      Authorization: `Bearer ${config.apiKey}`,
    });

    expectNon500(response);
    expect([200, 202]).toContain(response.status);
    expect(payload).toEqual(expect.objectContaining({ status: 'needs_mapping' }));
  });

  it('allows resending customer.json repeatedly', async () => {
    for (let i = 0; i < 3; i += 1) {
      const { response, payload } = await postJson(endpoint, customerPayload, {
        Authorization: `Bearer ${config.apiKey}`,
      });

      expectNon500(response);
      expectAccepted(response, payload);
    }
  });

  it('rejects missing API keys with 401', async () => {
    const { response } = await postJson(endpoint, customerPayload);
    expect(response.status).toBe(401);
  });

  it('rejects invalid API keys with 401', async () => {
    const { response } = await postJson(endpoint, customerPayload, {
      Authorization: `Bearer ${config.invalidApiKey}`,
    });
    expect(response.status).toBe(401);
  });

  it('accepts x-roiwise-token authentication', async () => {
    const { response, payload } = await postJson(endpoint, botPayload, {
      'x-roiwise-token': config.apiKey,
    });

    expectNon500(response);
    expectAccepted(response, payload);
  });

  it('accepts token query-string authentication', async () => {
    const { response, payload } = await postJson(
      `${endpoint}?token=${encodeURIComponent(config.apiKey)}`,
      agentPayload
    );

    expectNon500(response);
    expectAccepted(response, payload);
  });
  });
}
