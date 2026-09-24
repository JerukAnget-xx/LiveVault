import assert from 'node:assert/strict';
import test from 'node:test';

import { AuthenticationRequiredError } from '../server/auth/session-policy.ts';
import {
  ReportDatabaseError,
  ReportDuplicateDecisionRequiredError,
  ReportRecipientInactiveError,
  ReportRecipientNotFoundError,
  ReportStorageError,
  ReportValidationError,
} from '../server/reports/errors.ts';
import { classifyReportError } from '../server/reports/http.ts';
import { createReportService, sha256Image } from '../server/reports/service.ts';
import {
  parseEditReport,
  parseReportFormData,
  validateReportImage,
} from '../server/reports/validation.ts';

const recipientId = '11111111-1111-4111-8111-111111111111';
const cycleId = '22222222-2222-4222-8222-222222222222';
const reportId = '33333333-3333-4333-8333-333333333333';
const secondReportId = '44444444-4444-4444-8444-444444444444';
const objectId = '55555555-5555-4555-8555-555555555555';
const now = new Date('2026-09-11T04:00:00.000Z');

function reportFixture(overrides = {}) {
  return {
    id: reportId,
    recipientId,
    cycleId,
    reportDate: '2026-09-11',
    income: 17288,
    note: null,
    imagePath: `reports/${cycleId}/${recipientId}/old.png`,
    imageHash: 'old-hash',
    aiDetectedIncome: 17288,
    aiDetectedDate: null,
    aiConfidence: null,
    aiRawResponse: null,
    whatsappStatus: 'not_sent',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createFixture(options = {}) {
  const state = {
    reports: (options.reports ?? []).map((report) => ({ ...report })),
    uploads: [],
    removals: [],
  };
  const repository = {
    async findRecipientById(id) {
      if (options.missingRecipient || id !== recipientId) return null;
      return { id, isActive: !options.inactiveRecipient };
    },
    async findById(id) {
      return state.reports.find((report) => report.id === id) ?? null;
    },
    async findByImageHash(hash) {
      return state.reports.filter((report) => report.imageHash === hash);
    },
    async findByRecipientDate(id, date) {
      return state.reports.filter(
        (report) => report.recipientId === id && report.reportDate === date,
      );
    },
    async listForRecipient(id) {
      return state.reports.filter((report) => report.recipientId === id);
    },
    async create(values) {
      if (options.failDatabaseCreate) throw new ReportDatabaseError();
      const report = reportFixture(values);
      state.reports.push(report);
      return report;
    },
    async replace(id, values) {
      const index = state.reports.findIndex((report) => report.id === id);
      if (index < 0) return null;
      state.reports[index] = {
        ...state.reports[index],
        ...values,
        updatedAt: now,
      };
      return state.reports[index];
    },
    async updateMetadata(id, values) {
      const index = state.reports.findIndex((report) => report.id === id);
      if (index < 0) return null;
      state.reports[index] = {
        ...state.reports[index],
        ...values,
        updatedAt: now,
      };
      return state.reports[index];
    },
    async delete(id) {
      const index = state.reports.findIndex((report) => report.id === id);
      if (index < 0) return false;
      state.reports.splice(index, 1);
      return true;
    },
  };
  const storage = {
    async upload(input) {
      if (options.failUpload) throw new ReportStorageError();
      state.uploads.push(input);
    },
    async remove(path) {
      if (options.failRemove) throw new ReportStorageError();
      state.removals.push(path);
    },
  };
  const ids = [objectId, secondReportId];
  const service = createReportService({
    repository,
    storage,
    getActiveCycle: async () => {
      if (options.failCycle) throw new Error('cycle unavailable');
      return { id: cycleId, cycleNumber: 1 };
    },
    createId: () => ids.shift() ?? crypto.randomUUID(),
    logger: { error() {} },
  });
  return { service, state };
}

function input(overrides = {}) {
  const bytes = new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...new TextEncoder().encode('original screenshot bytes'),
  ]);
  return {
    recipientId,
    reportDate: '2026-09-11',
    income: 17288,
    note: null,
    image: { bytes, mimeType: 'image/png', size: bytes.byteLength },
    audit: {
      detectedIncome: 17288,
      confidence: null,
      rawGmv: 17288439,
      sourceLabel: 'Attributed GMV (Rp)',
      status: 'OK',
    },
    ...overrides,
  };
}

function saveInput(overrides = {}) {
  return {
    ...input(),
    imageDuplicateDecision: 'upload_anyway',
    dateDuplicateDecision: 'add_second',
    replaceReportId: null,
    ...overrides,
  };
}

test('valid report save uploads once and persists integer/audit values', async () => {
  const { service, state } = createFixture();
  const result = await service.saveReport(saveInput(), 'admin-id');
  assert.equal(result.report.income, 17288);
  assert.equal(result.report.aiDetectedIncome, 17288);
  assert.equal(result.report.aiRawResponse.rawGmv, 17288439);
  assert.equal(state.uploads.length, 1);
  assert.equal(state.reports.length, 1);
  assert.match(
    result.report.imagePath,
    new RegExp(`^reports/${cycleId}/${recipientId}/`),
  );
});

test('unauthenticated report API errors map to HTTP 401', () => {
  const response = classifyReportError(new AuthenticationRequiredError());
  assert.equal(response.status, 401);
  assert.equal(response.code, 'AUTHENTICATION_REQUIRED');
});

test('missing and inactive recipients are rejected before upload', async () => {
  const missing = createFixture({ missingRecipient: true });
  await assert.rejects(
    () => missing.service.saveReport(saveInput(), 'admin-id'),
    ReportRecipientNotFoundError,
  );
  assert.equal(missing.state.uploads.length, 0);

  const inactive = createFixture({ inactiveRecipient: true });
  await assert.rejects(
    () => inactive.service.saveReport(saveInput(), 'admin-id'),
    ReportRecipientInactiveError,
  );
  assert.equal(inactive.state.uploads.length, 0);
});

test('inactive or unavailable active cycle stops persistence', async () => {
  const { service, state } = createFixture({ failCycle: true });
  await assert.rejects(() => service.saveReport(saveInput(), 'admin-id'));
  assert.equal(state.uploads.length, 0);
});

test('invalid income and calendar dates are rejected', () => {
  assert.throws(
    () =>
      parseEditReport({ reportDate: '2026-09-11', income: 1.5, note: null }),
    ReportValidationError,
  );
  assert.throws(
    () =>
      parseEditReport({ reportDate: '2026-02-30', income: 100, note: null }),
    ReportValidationError,
  );
});

test('unsupported and oversized screenshots are rejected', () => {
  const bytes = new Uint8Array([1]);
  assert.throws(
    () => validateReportImage({ bytes, mimeType: 'application/pdf', size: 1 }),
    ReportValidationError,
  );
  assert.throws(
    () =>
      validateReportImage({
        bytes,
        mimeType: 'image/png',
        size: 10 * 1024 * 1024 + 1,
      }),
    ReportValidationError,
  );
  assert.throws(
    () => validateReportImage({ bytes, mimeType: 'image/png', size: 1 }),
    ReportValidationError,
  );
});

test('multipart validation rejects a missing image before persistence', async () => {
  const form = new FormData();
  form.set('recipientId', recipientId);
  form.set('reportDate', '2026-09-11');
  form.set('income', '17288');
  await assert.rejects(() => parseReportFormData(form), ReportValidationError);
});

test('SHA-256 duplicate detection uses original bytes', async () => {
  const expectedHash = sha256Image(input().image.bytes);
  const duplicate = reportFixture({ imageHash: expectedHash });
  const { service } = createFixture({ reports: [duplicate] });
  const checked = await service.checkReport(input(), 'admin-id');
  assert.equal(checked.imageHash, expectedHash);
  assert.deepEqual(
    checked.duplicateImages.map((report) => report.id),
    [reportId],
  );
});

test('duplicate image Cancel persists nothing', async () => {
  const duplicate = reportFixture({
    imageHash: sha256Image(input().image.bytes),
  });
  const { service, state } = createFixture({ reports: [duplicate] });
  await assert.rejects(
    () =>
      service.saveReport(
        saveInput({
          imageDuplicateDecision: 'cancel',
          reportDate: '2026-09-12',
        }),
        'admin-id',
      ),
    ReportDuplicateDecisionRequiredError,
  );
  assert.equal(state.uploads.length, 0);
  assert.equal(state.reports.length, 1);
});

test('duplicate image Upload Anyway creates a second row with the same hash', async () => {
  const hash = sha256Image(input().image.bytes);
  const duplicate = reportFixture({
    imageHash: hash,
    reportDate: '2026-09-10',
  });
  const { service, state } = createFixture({ reports: [duplicate] });
  await service.saveReport(
    saveInput({
      reportDate: '2026-09-12',
      imageDuplicateDecision: 'upload_anyway',
    }),
    'admin-id',
  );
  assert.equal(state.reports.length, 2);
  assert.equal(state.reports[1].imageHash, hash);
});

test('duplicate recipient/date is reported during check', async () => {
  const { service } = createFixture({ reports: [reportFixture()] });
  const checked = await service.checkReport(input(), 'admin-id');
  assert.deepEqual(
    checked.duplicateDates.map((report) => report.id),
    [reportId],
  );
});

test('duplicate date Cancel persists nothing', async () => {
  const existing = reportFixture({ imageHash: 'different' });
  const { service, state } = createFixture({ reports: [existing] });
  await assert.rejects(
    () =>
      service.saveReport(
        saveInput({ dateDuplicateDecision: 'cancel' }),
        'admin-id',
      ),
    ReportDuplicateDecisionRequiredError,
  );
  assert.equal(state.uploads.length, 0);
  assert.equal(state.reports.length, 1);
});

test('duplicate date Replace updates selected row then removes only its old path', async () => {
  const existing = reportFixture({ imageHash: 'different' });
  const { service, state } = createFixture({ reports: [existing] });
  const result = await service.saveReport(
    saveInput({ dateDuplicateDecision: 'replace', replaceReportId: reportId }),
    'admin-id',
  );
  assert.equal(result.replaced, true);
  assert.equal(state.reports.length, 1);
  assert.equal(state.removals[0], existing.imagePath);
  assert.notEqual(state.reports[0].imagePath, existing.imagePath);
});

test('duplicate date Add Second Report creates another row', async () => {
  const { service, state } = createFixture({
    reports: [reportFixture({ imageHash: 'different' })],
  });
  await service.saveReport(
    saveInput({ dateDuplicateDecision: 'add_second' }),
    'admin-id',
  );
  assert.equal(state.reports.length, 2);
});

test('metadata edit changes date, income, and note without storage access', async () => {
  const { service, state } = createFixture({ reports: [reportFixture()] });
  const edited = await service.updateReport(reportId, {
    reportDate: '2026-09-12',
    income: 18000,
    note: 'Corrected',
  });
  assert.equal(edited.reportDate, '2026-09-12');
  assert.equal(edited.income, 18000);
  assert.equal(state.uploads.length, 0);
  assert.equal(state.removals.length, 0);
});

test('delete removes exactly the report screenshot then its row', async () => {
  const sharedHash = 'shared-hash';
  const first = reportFixture({ imageHash: sharedHash });
  const second = reportFixture({
    id: secondReportId,
    imageHash: sharedHash,
    imagePath: 'reports/other.png',
  });
  const { service, state } = createFixture({ reports: [first, second] });
  await service.deleteReport(reportId);
  assert.deepEqual(state.removals, [first.imagePath]);
  assert.deepEqual(
    state.reports.map((report) => report.id),
    [secondReportId],
  );
});

test('storage upload failure creates no report row', async () => {
  const { service, state } = createFixture({ failUpload: true });
  await assert.rejects(
    () => service.saveReport(saveInput(), 'admin-id'),
    ReportStorageError,
  );
  assert.equal(state.reports.length, 0);
  assert.equal(state.removals.length, 0);
});

test('database failure after upload cleans up the newly uploaded object', async () => {
  const { service, state } = createFixture({ failDatabaseCreate: true });
  await assert.rejects(
    () => service.saveReport(saveInput(), 'admin-id'),
    ReportDatabaseError,
  );
  assert.equal(state.uploads.length, 1);
  assert.equal(state.removals.length, 1);
  assert.equal(state.removals[0], state.uploads[0].path);
});

test('storage deletion failure keeps the report row', async () => {
  const { service, state } = createFixture({
    reports: [reportFixture()],
    failRemove: true,
  });
  await assert.rejects(
    () => service.deleteReport(reportId),
    ReportStorageError,
  );
  assert.equal(state.reports.length, 1);
});
