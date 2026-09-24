import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatIncomeIndonesia,
  normalizeRawGmv,
  parseAttributedGmvFromOcr,
} from '../lib/report-extraction/gmv-parser.ts';

test('extracts comma-grouped Attributed GMV and normalizes income', () => {
  const result = parseAttributedGmvFromOcr(`
Attributed GMV (Rp)
17,288,439
Attributed items sold 132
`);

  assert.equal(result.status, 'OK');
  assert.equal(result.rawGmv, 17_288_439);
  assert.equal(result.income, 17_288);
  assert.equal(formatIncomeIndonesia(result.income), '17.288');
});

test('accepts Attributed GMV wording with dot-grouped value', () => {
  const result = parseAttributedGmvFromOcr('Attributed GMV\n17.288.439');

  assert.equal(result.status, 'OK');
  assert.equal(result.rawGmv, 17_288_439);
});

test('accepts uppercase label and space-grouped value', () => {
  const result = parseAttributedGmvFromOcr('ATTRIBUTED GMV RP\n17 288 439');

  assert.equal(result.status, 'OK');
  assert.equal(result.rawGmv, 17_288_439);
});

test('tolerates a minor OCR character omission in the GMV label', () => {
  const result = parseAttributedGmvFromOcr('Attributed GV (Rp)\n17,288,439');

  assert.equal(result.status, 'OK');
  assert.equal(result.rawGmv, 17_288_439);
});

test('does not select attributed items sold', () => {
  const result = parseAttributedGmvFromOcr('Attributed items sold = 132');

  assert.equal(result.status, 'GMV_NOT_FOUND');
  assert.equal(result.income, null);
});

test('does not select abbreviated impressions', () => {
  const result = parseAttributedGmvFromOcr('Impressions = 373.6K');

  assert.equal(result.status, 'GMV_NOT_FOUND');
});

test('does not select unrelated GMV labels or product rows', () => {
  const result = parseAttributedGmvFromOcr(`
LIVE GMV 17,288,439
Show GMV 8,100,000
GMV per hour 2.88M
Product GMV Rp5.806.330
`);

  assert.equal(result.status, 'GMV_NOT_FOUND');
  assert.equal(result.rawGmv, null);
});

test('no target leaves income empty for manual entry', () => {
  const result = parseAttributedGmvFromOcr(`
Viewers 5.52K
Impressions 373.6K
Rp5.806.330
`);

  assert.equal(result.status, 'GMV_NOT_FOUND');
  assert.equal(result.income, null);
  assert.equal(result.verificationRequired, true);
});

test('low OCR confidence preserves a spatially associated target', () => {
  const result = parseAttributedGmvFromOcr({
    text: 'Attributed GMV (Rp)\n17,288,439',
    region: 'summary',
    lines: [
      {
        text: 'Attributed GMV (Rp)',
        confidence: 45,
        bbox: { x0: 420, y0: 60, x1: 620, y1: 92 },
      },
      {
        text: '17,288,439',
        confidence: 52,
        bbox: { x0: 430, y0: 100, x1: 610, y1: 160 },
      },
    ],
  });

  assert.equal(result.status, 'OK');
  assert.equal(result.rawGmv, 17_288_439);
  assert.equal(result.income, 17_288);
  assert.equal(result.confidence, 0.485);
  assert.equal(result.verificationRequired, true);
});

test('normalization remains deterministic', () => {
  assert.equal(normalizeRawGmv(17_288_439), 17_288);
  assert.equal(normalizeRawGmv(10_000_000), 10_000);
  assert.equal(normalizeRawGmv(999_999), 999);
});
