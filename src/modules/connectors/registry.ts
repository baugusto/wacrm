import type { ConnectorAdapter, ConnectorProviderKey } from './types';
import { botmakerAdapter } from './providers/botmaker/normalizer';
import { genericWebhookAdapter } from './providers/generic/normalizer';

export const connectorRegistry: Record<ConnectorProviderKey, ConnectorAdapter> =
  {
    botmaker: botmakerAdapter,
    generic_webhook: genericWebhookAdapter,
  };

export function getConnectorAdapter(
  provider: string | null | undefined
): ConnectorAdapter | null {
  if (!provider) return null;
  return connectorRegistry[provider as ConnectorProviderKey] ?? null;
}

export function listConnectorProviders() {
  return Object.values(connectorRegistry).map((adapter) => ({
    provider_key: adapter.providerKey,
    display_name: adapter.displayName,
    adapter_version: adapter.adapterVersion,
    status: adapter.status,
    supported_event_types: adapter.supportedEventTypes,
  }));
}
