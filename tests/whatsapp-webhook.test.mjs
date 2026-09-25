import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createWhatsAppWebhookHandlers } from '../server/whatsapp/webhook-http.ts';
import { createWhatsAppWebhookService } from '../server/whatsapp/webhook.ts';

const verifyToken = 'local-webhook-verification-secret';
const messageId = 'wamid.live-vault-123';
const eventTime = new Date('2026-09-25T03:00:00.000Z');

function webhookPayload(status, overrides = {}) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            value: {
              statuses: [
                {
                  id: messageId,
                  status,
                  timestamp: '1790305200',
                  ...overrides,
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function createFixture({ hasDelivery = true } = {}) {
  const state = {
    attempts: hasDelivery
      ? [
          {
            messageId,
            status: 'sending',
            sentAt: null,
            failedAt: null,
            errorMessage: null,
          },
        ]
      : [],
    reportStatus: 'sending',
    calls: [],
    warnings: [],
    errors: [],
  };

  const repository = {
    async applyStatus(update) {
      state.calls.push(update);
      const attempt = state.attempts.find(
        (candidate) => candidate.messageId === update.messageId,
      );
      if (!attempt) return 'not_found';

      if (update.providerStatus === 'failed') {
        const changed =
          attempt.status !== 'failed' ||
          attempt.errorMessage !== update.errorMessage ||
          state.reportStatus !== 'failed';
        attempt.status = 'failed';
        attempt.failedAt ??= update.occurredAt;
        attempt.errorMessage = update.errorMessage;
        state.reportStatus = 'failed';
        return changed ? 'updated' : 'unchanged';
      }

      if (attempt.status === 'failed') return 'unchanged';
      const changed =
        attempt.status !== 'sent' || state.reportStatus !== 'sent';
      attempt.status = 'sent';
      attempt.sentAt ??= update.occurredAt;
      state.reportStatus = 'sent';
      return changed ? 'updated' : 'unchanged';
    },
  };

  const service = createWhatsAppWebhookService({
    repository,
    clock: () => eventTime,
    logger: {
      warn(message, details) {
        state.warnings.push({ message, details });
      },
    },
  });

  const handlers = createWhatsAppWebhookHandlers({
    service,
    loadVerifyToken: () => verifyToken,
    logger: {
      error(message, details) {
        state.errors.push({ message, details });
      },
    },
  });

  return { state, service, handlers };
}

test('GET verifies the callback and returns the Meta challenge', async () => {
  const { handlers } = createFixture();
  const request = new Request(
    `https://live-vault.example.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=123456`,
  );

  const response = handlers.GET(request);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), '123456');
});

test('GET rejects an incorrect verify token without echoing secrets', async () => {
  const { handlers } = createFixture();
  const suppliedToken = 'incorrect-secret-value';
  const request = new Request(
    `https://live-vault.example.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${suppliedToken}&hub.challenge=123456`,
  );

  const response = handlers.GET(request);
  const body = await response.text();

  assert.equal(response.status, 403);
  assert.doesNotMatch(body, new RegExp(verifyToken));
  assert.doesNotMatch(body, new RegExp(suppliedToken));
});

test('unknown webhook payload is acknowledged safely', async () => {
  const { handlers, state } = createFixture();
  const response = await handlers.POST(
    new Request('https://live-vault.example.com/api/webhooks/whatsapp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ object: 'unsupported_event', secret: 'hidden' }),
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true });
  assert.equal(state.calls.length, 0);
});

test('sent status marks the matching delivery and report as sent', async () => {
  const { service, state } = createFixture();

  await service.handlePayload(webhookPayload('sent'));

  assert.equal(state.attempts[0].status, 'sent');
  assert.equal(state.reportStatus, 'sent');
  assert.equal(state.calls[0].providerStatus, 'sent');
});

for (const status of ['delivered', 'read']) {
  test(`${status} status remains locally successful`, async () => {
    const { service, state } = createFixture();

    await service.handlePayload(webhookPayload(status));

    assert.equal(state.attempts[0].status, 'sent');
    assert.equal(state.reportStatus, 'sent');
  });
}

test('failed status updates the delivery and report with a safe summary', async () => {
  const { service, state } = createFixture();

  await service.handlePayload(
    webhookPayload('failed', {
      errors: [
        {
          code: 130497,
          title: 'Business account is restricted from messaging users.',
          error_data: { details: 'sensitive-provider-detail' },
        },
      ],
    }),
  );

  assert.equal(state.attempts[0].status, 'failed');
  assert.equal(state.reportStatus, 'failed');
  assert.equal(
    state.attempts[0].errorMessage,
    'META_130497: Business account is restricted from messaging users.',
  );
  assert.doesNotMatch(
    state.attempts[0].errorMessage,
    /sensitive-provider-detail/u,
  );
});

test('unknown message ID does not fail the callback or log the ID', async () => {
  const { handlers, state } = createFixture({ hasDelivery: false });
  const response = await handlers.POST(
    new Request('https://live-vault.example.com/api/webhooks/whatsapp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(webhookPayload('sent')),
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(state.warnings.length, 1);
  assert.doesNotMatch(JSON.stringify(state.warnings), new RegExp(messageId));
});

test('duplicate webhook event is idempotent and creates no attempt', async () => {
  const { service, state } = createFixture();
  const payload = webhookPayload('sent');

  await service.handlePayload(payload);
  const sentAt = state.attempts[0].sentAt;
  await service.handlePayload(payload);

  assert.equal(state.attempts.length, 1);
  assert.equal(state.attempts[0].status, 'sent');
  assert.equal(state.attempts[0].sentAt, sentAt);
});

test('late successful event cannot overwrite an explicit failure', async () => {
  const { service, state } = createFixture();

  await service.handlePayload(webhookPayload('failed'));
  await service.handlePayload(webhookPayload('read'));

  assert.equal(state.attempts[0].status, 'failed');
  assert.equal(state.reportStatus, 'failed');
});

test('incoming customer messages are acknowledged without storage or reply', async () => {
  const { service, state } = createFixture();
  const result = await service.handlePayload({
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            value: {
              messages: [{ id: 'incoming-message', text: { body: 'Hello' } }],
            },
          },
        ],
      },
    ],
  });

  assert.deepEqual(result, { processed: 0, ignored: 0 });
  assert.equal(state.calls.length, 0);
  assert.equal(state.attempts.length, 1);
});

test('public webhook route has no Better Auth session requirement', async () => {
  const routeSource = await readFile(
    new URL('../app/api/webhooks/whatsapp/route.ts', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(routeSource, /requireApiSession|better-auth/u);
});
