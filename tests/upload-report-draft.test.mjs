import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyExtractionResultToDraft,
  changeReportDate,
  createUploadReportDraft,
  getApplicationCalendarDate,
  prepareDraftForExtraction,
} from '../lib/upload-report-draft.ts';

const jakartaSeptemberEleventh = new Date('2026-09-10T18:30:00.000Z');

test('new reports default to today in the application timezone', () => {
  const draft = createUploadReportDraft(jakartaSeptemberEleventh);

  assert.deepEqual(draft, {
    reportDate: '2026-09-11',
    income: '',
    note: '',
  });
});

test('admin can change the report calendar date', () => {
  const initial = createUploadReportDraft(jakartaSeptemberEleventh);
  const changed = changeReportDate(initial, '2026-09-09');

  assert.equal(changed.reportDate, '2026-09-09');
});

test('OCR results cannot overwrite an admin-selected date', () => {
  const changed = changeReportDate(
    createUploadReportDraft(jakartaSeptemberEleventh),
    '2026-09-09',
  );
  const afterAi = applyExtractionResultToDraft(changed, {
    status: 'OK',
    income: 17_288,
    date: '1999-01-01',
  });

  assert.equal(afterAi.reportDate, '2026-09-09');
  assert.equal(afterAi.income, '17288');
});

test('replacing a screenshot preserves an edited date', () => {
  const changed = changeReportDate(
    createUploadReportDraft(jakartaSeptemberEleventh),
    '2026-09-09',
  );

  assert.equal(prepareDraftForExtraction(changed).reportDate, '2026-09-09');
});

test('retrying extraction preserves an edited date', () => {
  const changed = changeReportDate(
    createUploadReportDraft(jakartaSeptemberEleventh),
    '2026-09-09',
  );
  const firstAttempt = applyExtractionResultToDraft(
    prepareDraftForExtraction(changed),
    { status: 'GMV_NOT_FOUND', income: null },
  );
  const retry = applyExtractionResultToDraft(
    prepareDraftForExtraction(firstAttempt),
    { status: 'OK', income: 10_000 },
  );

  assert.equal(retry.reportDate, '2026-09-09');
  assert.equal(retry.income, '10000');
});

test('application dates remain stable YYYY-MM-DD values', () => {
  const value = getApplicationCalendarDate(jakartaSeptemberEleventh);

  assert.match(value, /^\d{4}-\d{2}-\d{2}$/u);
  assert.equal(value, '2026-09-11');
});

test('Jakarta date does not inherit the previous UTC calendar day', () => {
  assert.equal(
    getApplicationCalendarDate(new Date('2026-09-10T17:00:00.000Z')),
    '2026-09-11',
  );
  assert.equal(
    getApplicationCalendarDate(new Date('2026-09-11T17:00:00.000Z')),
    '2026-09-12',
  );
});
