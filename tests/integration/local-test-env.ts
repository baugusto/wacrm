import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let loaded = false;

export function loadLocalTestEnv() {
  if (loaded) return;
  loaded = true;

  const file = resolve(process.cwd(), '.env.test.local');
  if (!existsSync(file)) return;

  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const rawValue = trimmed.slice(eq + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    process.env[key] ??= value;
  }
}

export function localBaseUrl() {
  loadLocalTestEnv();
  const baseUrl = process.env.ROIWISE_TEST_BASE_URL || 'http://localhost:3000';
  if (baseUrl.includes('roiwise.com.br')) {
    throw new Error('Local tests must not run against roiwise.com.br');
  }
  return baseUrl.replace(/\/+$/, '');
}

export function integrationEnabled() {
  loadLocalTestEnv();
  return process.env.ROIWISE_RUN_INTEGRATION_TESTS === 'true';
}

export function requiredIntegrationConfig() {
  loadLocalTestEnv();
  const channelId = process.env.ROIWISE_TEST_BOTMAKER_CHANNEL_ID;
  const apiKey = process.env.ROIWISE_TEST_API_KEY;
  if (!channelId || !apiKey) {
    throw new Error(
      'Set ROIWISE_TEST_BOTMAKER_CHANNEL_ID and ROIWISE_TEST_API_KEY in .env.test.local'
    );
  }
  return {
    baseUrl: localBaseUrl(),
    channelId,
    apiKey,
    invalidApiKey: process.env.ROIWISE_TEST_INVALID_API_KEY || 'rw_live_invalid',
  };
}

export async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}
