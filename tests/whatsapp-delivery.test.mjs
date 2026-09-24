import assert from 'node:assert/strict';
import test from 'node:test';

import { AuthenticationRequiredError } from '../server/auth/session-policy.ts';
import { createWhatsAppDeliveryService } from '../server/whatsapp/delivery-service.ts';
import {
  WhatsAppDeliveryError,
  whatsappError,
} from '../server/whatsapp/errors.ts';
import { classifyWhatsAppError } from '../server/whatsapp/http.ts';
import {
  buildTemplateMessagePayload,
  formatWhatsAppIncome,
  generateCumulativeReportList,
} from '../server/whatsapp/report-message.ts';

const reportId = '11111111-1111-4111-8111-111111111111';
const recipientId = '22222222-2222-4222-8222-222222222222';
const activeCycleId = '33333333-3333-4333-8333-333333333333';
const now = new Date('2026-09-11T04:00:00.000Z');

function reportEntry(overrides = {}) {
  return {
    id: reportId,
    recipientId,
    cycleId: activeCycleId,
    reportDate: '2026-09-11',
    income: 17288,
    createdAt: new Date('2026-09-11T03:00:00.000Z'),
    ...overrides,
  };
}

function createFixture(options = {}) {
  const state = {
    attempts: [],
    reportStatus: 'not_sent',
    reportSaved: true,
    transitions: [],
    mediaUploads: [],
    templateSends: [],
    downloads: [],
    logs: [],
  };
  const allReports = options.reports ?? [reportEntry()];

  const repository = {
    async startAttempt(id, mode) {
      if (
        state.attempts.some((attempt) =>
          ['queued', 'sending'].includes(attempt.status),
        )
      ) {
        throw whatsappError('WHATSAPP_ALREADY_SENDING');
      }
      if (mode === 'send' && state.reportStatus === 'sent') {
        throw whatsappError('WHATSAPP_ALREADY_SENT');
      }
      if (mode === 'send' && state.reportStatus === 'failed') {
        throw whatsappError('WHATSAPP_RETRY_UNAVAILABLE');
      }
      const latest = state.attempts.at(-1);
      if (
        mode === 'retry' &&
        (state.reportStatus !== 'failed' || latest?.status !== 'failed')
      ) {
        throw whatsappError('WHATSAPP_RETRY_UNAVAILABLE');
      }
      const attempt = {
        id: `attempt-${state.attempts.length + 1}`,
        reportId: id,
        attemptNumber: state.attempts.length + 1,
        messageId: null,
        status: 'queued',
        sentAt: null,
        failedAt: null,
        errorMessage: null,
        createdAt: now,
      };
      state.attempts.push(attempt);
      state.reportStatus = 'queued';
      state.transitions.push('queued');
      return {
        attempt,
        report: {
          id,
          recipientId,
          cycleId: activeCycleId,
          imagePath: 'reports/active/report.png',
        },
        recipient: {
          whatsappNumber: options.whatsappNumber ?? '628123456789',
          reportTitle: 'ALIF LIVE',
        },
        reports: allReports
          .filter(
            (report) =>
              report.recipientId === recipientId &&
              report.cycleId === activeCycleId,
          )
          .map(({ id: entryId, reportDate, income, createdAt }) => ({
            id: entryId,
            reportDate,
            income,
            createdAt,
          })),
      };
    },
    async markSending(attemptId) {
      const attempt = state.attempts.find((item) => item.id === attemptId);
      attempt.status = 'sending';
      state.reportStatus = 'sending';
      state.transitions.push('sending');
    },
    async markSent({ attemptId, messageId, sentAt }) {
      const attempt = state.attempts.find((item) => item.id === attemptId);
      Object.assign(attempt, { status: 'sent', messageId, sentAt });
      state.reportStatus = 'sent';
      state.transitions.push('sent');
      return attempt;
    },
    async markFailed({ attemptId, errorMessage, failedAt }) {
      if (options.failFailurePersistence) throw new Error('token-secret-value');
      const attempt = state.attempts.find((item) => item.id === attemptId);
      Object.assign(attempt, { status: 'failed', errorMessage, failedAt });
      state.reportStatus = 'failed';
      state.transitions.push('failed');
      return attempt;
    },
  };

  const imageReader = {
    async download(path) {
      state.downloads.push(path);
      if (options.failDownload) throw new Error('private storage failed');
      if (options.downloadGate) await options.downloadGate;
      return { bytes: new Uint8Array([1, 2, 3]), mimeType: 'image/png' };
    },
  };
  const client = {
    async uploadMedia(image) {
      state.mediaUploads.push(image);
      if (options.failMedia) throw new Error('provider token-secret-value');
      return { mediaId: 'meta-media-id' };
    },
    async sendTemplate(input) {
      state.templateSends.push(input);
      if (options.failTemplate) throw new Error('provider token-secret-value');
      return { messageId: `wamid.${state.attempts.length}` };
    },
  };
  const logger = {
    error(...values) {
      state.logs.push(values);
    },
  };
  const service = createWhatsAppDeliveryService({
    repository,
    imageReader,
    client,
    clock: () => now,
    logger,
  });
  return { service, state, repository, imageReader, logger };
}

test('cumulative list includes all active-cycle recipient reports only', async () => {
  const reports = [
    reportEntry({ id: 'b', reportDate: '2026-09-12', income: 17288 }),
    reportEntry({ id: 'a', reportDate: '2026-09-10', income: 10000 }),
    reportEntry({ id: 'archived', cycleId: 'archived-cycle', income: 99999 }),
    reportEntry({ id: 'other', recipientId: 'other-recipient', income: 88888 }),
  ];
  const { service } = createFixture({ reports });
  const result = await service.deliverReport(reportId);
  assert.equal(
    result.reportList,
    '// ALIF LIVE :\n\n10 / 09 : 10.000\n12 / 09 : 17.288',
  );
  assert.doesNotMatch(result.reportList, /99\.999|88\.888/u);
});

test('report list orders dates ascending and preserves duplicate dates stably', () => {
  const list = generateCumulativeReportList('ALIF LIVE', [
    reportEntry({
      id: 'z',
      reportDate: '2026-09-12',
      createdAt: new Date('2026-09-12T02:00:00Z'),
    }),
    reportEntry({
      id: 'b',
      income: 12000,
      createdAt: new Date('2026-09-11T02:00:00Z'),
    }),
    reportEntry({
      id: 'a',
      income: 11000,
      createdAt: new Date('2026-09-11T01:00:00Z'),
    }),
  ]);
  assert.equal(
    list,
    '// ALIF LIVE :\n\n11 / 09 : 11.000\n11 / 09 : 12.000\n12 / 09 : 17.288',
  );
});

test('income uses Indonesian thousands formatting without Rp', () => {
  assert.equal(formatWhatsAppIncome(17288), '17.288');
  assert.doesNotMatch(formatWhatsAppIncome(17288), /Rp/u);
});

test('screenshot bytes upload and media ID feed one template send', async () => {
  const { service, state } = createFixture();
  await service.deliverReport(reportId);
  assert.equal(state.downloads[0], 'reports/active/report.png');
  assert.deepEqual(state.mediaUploads[0].bytes, new Uint8Array([1, 2, 3]));
  assert.equal(state.templateSends.length, 1);
  assert.equal(state.templateSends[0].mediaId, 'meta-media-id');
});

test('template payload uses image header and two body parameters', () => {
  const payload = buildTemplateMessagePayload({
    to: '628123456789',
    mediaId: 'meta-media-id',
    reportTitle: 'ALIF LIVE',
    reportList: '// ALIF LIVE :\n\n11 / 09 : 17.288',
    templateName: 'live_vault_report',
    templateLanguage: 'id',
  });
  assert.deepEqual(payload.template.components[0].parameters[0], {
    type: 'image',
    image: { id: 'meta-media-id' },
  });
  assert.equal(payload.template.components[1].parameters.length, 2);
  assert.equal(payload.type, 'template');
});

test('successful delivery stores message ID and all status transitions', async () => {
  const { service, state } = createFixture();
  const result = await service.deliverReport(reportId);
  assert.equal(result.attempt.messageId, 'wamid.1');
  assert.equal(result.attempt.status, 'sent');
  assert.deepEqual(state.transitions, ['queued', 'sending', 'sent']);
  assert.equal(state.reportStatus, 'sent');
});

test('media upload failure is safe and remains auditable', async () => {
  const { service, state } = createFixture({ failMedia: true });
  await assert.rejects(
    () => service.deliverReport(reportId),
    (error) =>
      error instanceof WhatsAppDeliveryError &&
      error.code === 'WHATSAPP_MEDIA_UPLOAD_FAILED',
  );
  assert.equal(state.attempts[0].status, 'failed');
  assert.equal(state.attempts[0].errorMessage, 'WHATSAPP_MEDIA_UPLOAD_FAILED');
  assert.equal(state.templateSends.length, 0);
});

test('template failure marks attempt and report failed without deleting report', async () => {
  const { service, state } = createFixture({ failTemplate: true });
  await assert.rejects(
    () => service.deliverReport(reportId),
    (error) => error.code === 'WHATSAPP_TEMPLATE_SEND_FAILED',
  );
  assert.equal(state.attempts[0].status, 'failed');
  assert.equal(state.reportStatus, 'failed');
  assert.equal(state.reportSaved, true);
  assert.equal(state.templateSends.length, 1);
});

test('retry creates a new attempt number and preserves failed attempt', async () => {
  const fixture = createFixture({ failTemplate: true });
  await assert.rejects(() => fixture.service.deliverReport(reportId));
  const firstAttempt = { ...fixture.state.attempts[0] };
  // Reuse the same state while allowing the second provider call to succeed.
  const retryClient = {
    uploadMedia: async () => ({ mediaId: 'retry-media-id' }),
    sendTemplate: async () => ({ messageId: 'wamid.retry' }),
  };
  const retryService = createWhatsAppDeliveryService({
    repository: fixture.repository,
    imageReader: fixture.imageReader,
    client: retryClient,
    clock: () => now,
    logger: fixture.logger,
  });
  const result = await retryService.deliverReport(reportId, 'retry');
  assert.equal(result.attempt.attemptNumber, 2);
  assert.equal(result.attempt.messageId, 'wamid.retry');
  assert.deepEqual(fixture.state.attempts[0], firstAttempt);
});

test('invalid recipient fails before any Meta request', async () => {
  const { service, state } = createFixture({ whatsappNumber: '+628123' });
  await assert.rejects(
    () => service.deliverReport(reportId),
    (error) => error.code === 'WHATSAPP_RECIPIENT_INVALID',
  );
  assert.equal(state.mediaUploads.length, 0);
  assert.equal(state.templateSends.length, 0);
});

test('unauthenticated send maps to HTTP 401', () => {
  const result = classifyWhatsAppError(new AuthenticationRequiredError());
  assert.equal(result.status, 401);
  assert.equal(result.code, 'AUTHENTICATION_REQUIRED');
});

test('concurrent send is rejected while first attempt is active', async () => {
  let releaseDownload;
  const downloadGate = new Promise((resolve) => {
    releaseDownload = resolve;
  });
  const { service, state } = createFixture({ downloadGate });
  const first = service.deliverReport(reportId);
  await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(
    () => service.deliverReport(reportId),
    (error) => error.code === 'WHATSAPP_ALREADY_SENDING',
  );
  releaseDownload();
  await first;
  assert.equal(state.templateSends.length, 1);
});

test('sequential duplicate send is rejected after success', async () => {
  const { service, state } = createFixture();
  await service.deliverReport(reportId);
  await assert.rejects(
    () => service.deliverReport(reportId),
    (error) => error.code === 'WHATSAPP_ALREADY_SENT',
  );
  assert.equal(state.templateSends.length, 1);
});

test('safe errors and logs never contain provider secrets', async () => {
  const { service, state } = createFixture({
    failMedia: true,
    failFailurePersistence: true,
  });
  let caught;
  try {
    await service.deliverReport(reportId);
  } catch (error) {
    caught = error;
  }
  assert.equal(caught.code, 'WHATSAPP_MEDIA_UPLOAD_FAILED');
  const output = JSON.stringify({ message: caught.message, logs: state.logs });
  assert.doesNotMatch(output, /token-secret-value/u);
});
