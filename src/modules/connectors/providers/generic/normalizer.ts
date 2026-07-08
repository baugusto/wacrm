import type { ConnectorAdapter } from '../../types';

export const genericWebhookAdapter: ConnectorAdapter = {
  providerKey: 'generic_webhook',
  displayName: 'Generic Webhook',
  adapterVersion: 'v1',
  status: 'experimental',
  supportedEventTypes: ['unknown'],
  normalize(input) {
    return {
      provider: 'generic_webhook',
      source: 'generic_webhook',
      adapterKey: 'generic_webhook',
      adapterVersion: 'v1',
      eventType: 'unknown',
      externalEventId: null,
      occurredAt: null,
      ingestionStatus: 'needs_mapping',
      errorMessage: 'Generic webhook payload requires a channel mapping',
      warnings: ['generic_webhook adapter stores raw events only in this MVP'],
      messages: [],
      statusEvents: [],
      metadata: {
        channel_id: input.channel.id,
      },
    };
  },
};
