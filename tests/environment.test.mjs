import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseServerEnv,
  parseWhatsAppEnv,
} from '../lib/env-schema.ts';
import {
  requireWhatsAppConfiguration,
  WhatsAppDeliveryError,
} from '../server/whatsapp/errors.ts';

const coreEnvironment = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/live_vault',
  BETTER_AUTH_SECRET: 'a-secure-test-secret-with-at-least-32-characters',
  BETTER_AUTH_URL: 'https://live-vault.example.com',
  NODE_ENV: 'production',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  SUPABASE_REPORT_SCREENSHOTS_BUCKET: 'report-screenshots',
};

const whatsappEnvironment = {
  WHATSAPP_ACCESS_TOKEN: 'test-access-token',
  WHATSAPP_PHONE_NUMBER_ID: '123456789012345',
  WHATSAPP_BUSINESS_ACCOUNT_ID: '987654321098765',
  WHATSAPP_TEMPLATE_NAME: 'live_vault_report',
  WHATSAPP_TEMPLATE_LANGUAGE: 'id',
  WHATSAPP_GRAPH_VERSION: 'v23.0',
};

test('core environment is valid when every WhatsApp variable is absent', () => {
  const parsed = parseServerEnv(coreEnvironment);

  assert.equal(parsed.SUPABASE_REPORT_SCREENSHOTS_BUCKET, 'report-screenshots');
  assert.equal('WHATSAPP_ACCESS_TOKEN' in parsed, false);
});

test('partial WhatsApp configuration does not invalidate core startup', () => {
  const parsed = parseServerEnv({
    ...coreEnvironment,
    WHATSAPP_ACCESS_TOKEN: 'partially-configured-token',
  });

  assert.equal(parsed.DATABASE_URL, coreEnvironment.DATABASE_URL);
});

for (const requiredName of [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_REPORT_SCREENSHOTS_BUCKET',
]) {
  test(`core environment still requires ${requiredName}`, () => {
    const environment = { ...coreEnvironment };
    delete environment[requiredName];

    assert.throws(
      () => parseServerEnv(environment),
      new RegExp(`Invalid server environment variables: .*${requiredName}`),
    );
  });
}

test('complete WhatsApp configuration is accepted lazily', () => {
  assert.deepEqual(parseWhatsAppEnv(whatsappEnvironment), whatsappEnvironment);
});

test('missing WhatsApp configuration fails with the safe integration error', () => {
  assert.throws(
    () =>
      requireWhatsAppConfiguration(() => parseWhatsAppEnv(coreEnvironment)),
    (error) =>
      error instanceof WhatsAppDeliveryError &&
      error.code === 'WHATSAPP_NOT_CONFIGURED' &&
      error.message === 'WhatsApp delivery is not configured.',
  );
});

test('partial WhatsApp configuration also fails before an API request', () => {
  assert.throws(
    () =>
      requireWhatsAppConfiguration(() =>
        parseWhatsAppEnv({
          WHATSAPP_ACCESS_TOKEN: whatsappEnvironment.WHATSAPP_ACCESS_TOKEN,
        }),
      ),
    (error) =>
      error instanceof WhatsAppDeliveryError &&
      error.code === 'WHATSAPP_NOT_CONFIGURED',
  );
});
