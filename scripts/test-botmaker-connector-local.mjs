#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile() {
  const file = resolve(process.cwd(), '.env.test.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    process.env[key] ??= value;
  }
}

function readFixture(name) {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), 'tests/fixtures/connectors/botmaker', name),
      'utf8'
    )
  );
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

async function main() {
  loadEnvFile();

  const baseUrl = (
    process.env.ROIWISE_TEST_BASE_URL || 'http://localhost:3000'
  ).replace(/\/+$/, '');
  if (baseUrl.includes('roiwise.com.br')) {
    fail('Refusing to run local smoke test against roiwise.com.br');
    return;
  }

  const channelId = process.env.ROIWISE_TEST_BOTMAKER_CHANNEL_ID;
  const apiKey = process.env.ROIWISE_TEST_API_KEY;
  if (!channelId || !apiKey) {
    fail(
      'Set ROIWISE_TEST_BOTMAKER_CHANNEL_ID and ROIWISE_TEST_API_KEY in .env.test.local'
    );
    return;
  }

  const endpoint = `${baseUrl}/api/connectors/botmaker/${channelId}`;
  const fixtures = [
    ['customer.json', ['normalized', 'duplicate']],
    ['bot.json', ['normalized', 'duplicate']],
    ['agent.json', ['normalized', 'duplicate']],
    ['hsm_status.json', ['normalized', 'duplicate']],
    ['unknown-payload.json', ['needs_mapping', 'duplicate']],
  ];

  for (const [fixture, allowedStatuses] of fixtures) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(readFixture(fixture)),
    });
    const payload = await response.json().catch(() => ({}));
    const status = payload.status || payload.error?.code || 'unknown';
    const rawEventId = payload.raw_event_id || payload.idempotency_key || '-';
    const ok =
      response.status !== 500 &&
      [200, 202].includes(response.status) &&
      allowedStatuses.includes(status);

    console.log(
      `${ok ? 'OK' : 'FAIL'} ${fixture} HTTP=${response.status} status=${status} raw_event_id=${rawEventId}`
    );

    if (!ok) process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
