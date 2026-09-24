import { z } from 'zod';

import {
  MAX_REPORT_IMAGE_BYTES,
  REPORT_IMAGE_MIME_TYPES,
  type EditReportInput,
  type PrepareReportInput,
  type ReportAudit,
  type ReportImage,
  type SaveReportInput,
} from './types.ts';
import { ReportValidationError } from './errors.ts';

const uuidSchema = z.uuid();
const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);

function isCalendarDate(value: string) {
  if (!calendarDateSchema.safeParse(value).success) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function invalid(code: string, message: string): never {
  throw new ReportValidationError(code, message);
}

export function validateReportImage(image: {
  bytes: Uint8Array;
  mimeType: string;
  size: number;
}): ReportImage {
  if (!REPORT_IMAGE_MIME_TYPES.includes(image.mimeType as never)) {
    invalid('UNSUPPORTED_IMAGE_TYPE', 'Use a JPEG, PNG, or WebP screenshot.');
  }
  if (image.size <= 0 || image.bytes.byteLength <= 0) {
    invalid('IMAGE_REQUIRED', 'A screenshot is required.');
  }
  if (
    image.size > MAX_REPORT_IMAGE_BYTES ||
    image.bytes.byteLength > MAX_REPORT_IMAGE_BYTES
  ) {
    invalid('IMAGE_TOO_LARGE', 'The screenshot must be 10 MB or smaller.');
  }
  const bytes = image.bytes;
  const signatureMatches =
    (image.mimeType === 'image/jpeg' &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff) ||
    (image.mimeType === 'image/png' &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a) ||
    (image.mimeType === 'image/webp' &&
      new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
      new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP');
  if (!signatureMatches) {
    invalid(
      'INVALID_IMAGE_CONTENT',
      'The file content does not match its image type.',
    );
  }
  return image as ReportImage;
}

function validateCommon(input: {
  recipientId?: unknown;
  reportDate?: unknown;
  income?: unknown;
  note?: unknown;
}) {
  const recipientId = uuidSchema.safeParse(input.recipientId);
  if (!recipientId.success) {
    invalid('INVALID_RECIPIENT_ID', 'Select a valid recipient.');
  }
  if (
    typeof input.reportDate !== 'string' ||
    !isCalendarDate(input.reportDate)
  ) {
    invalid('INVALID_REPORT_DATE', 'Enter a valid report date.');
  }
  const income =
    typeof input.income === 'string' && /^\d+$/u.test(input.income)
      ? Number(input.income)
      : input.income;
  if (!Number.isSafeInteger(income) || Number(income) <= 0) {
    invalid('INVALID_INCOME', 'Income must be a positive whole number.');
  }
  if (
    input.note !== undefined &&
    input.note !== null &&
    typeof input.note !== 'string'
  ) {
    invalid('INVALID_NOTE', 'Note must be text.');
  }
  const note =
    typeof input.note === 'string' ? input.note.trim() || null : null;
  if (note && note.length > 2_000) {
    invalid('INVALID_NOTE', 'Note must be 2,000 characters or fewer.');
  }
  return {
    recipientId: recipientId.data,
    reportDate: input.reportDate,
    income: Number(income),
    note,
  };
}

function optionalNumber(value: FormDataEntryValue | null) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string')
    invalid('INVALID_AUDIT', 'Invalid OCR audit data.');
  const parsed = Number(value);
  if (!Number.isFinite(parsed))
    invalid('INVALID_AUDIT', 'Invalid OCR audit data.');
  return parsed;
}

function parseAudit(formData: FormData): ReportAudit {
  const confidence = optionalNumber(formData.get('confidence'));
  if (confidence !== null && (confidence < 0 || confidence > 1)) {
    invalid('INVALID_AUDIT', 'Invalid OCR confidence.');
  }
  const status = formData.get('extractionStatus');
  if (status !== null && status !== 'OK' && status !== 'GMV_NOT_FOUND') {
    invalid('INVALID_AUDIT', 'Invalid OCR status.');
  }
  const sourceLabel = formData.get('sourceLabel');
  if (sourceLabel !== null && typeof sourceLabel !== 'string') {
    invalid('INVALID_AUDIT', 'Invalid OCR source label.');
  }
  return {
    detectedIncome: optionalNumber(formData.get('detectedIncome')),
    confidence,
    rawGmv: optionalNumber(formData.get('rawGmv')),
    sourceLabel: sourceLabel || null,
    status: status as ReportAudit['status'],
  };
}

export async function parseReportFormData(
  formData: FormData,
): Promise<PrepareReportInput> {
  const imageValue = formData.get('image');
  if (!(imageValue instanceof File)) {
    invalid('IMAGE_REQUIRED', 'A screenshot is required.');
  }
  const common = validateCommon({
    recipientId: formData.get('recipientId'),
    reportDate: formData.get('reportDate'),
    income: formData.get('income'),
    note: formData.get('note'),
  });
  const bytes = new Uint8Array(await imageValue.arrayBuffer());
  const image = validateReportImage({
    bytes,
    mimeType: imageValue.type,
    size: imageValue.size,
  });
  return { ...common, image, audit: parseAudit(formData) };
}

export function parseSaveDecisions(
  formData: FormData,
  prepared: PrepareReportInput,
): SaveReportInput {
  const imageDecision = formData.get('imageDuplicateDecision');
  const dateDecision = formData.get('dateDuplicateDecision');
  const replaceReportId = formData.get('replaceReportId');
  if (imageDecision !== 'cancel' && imageDecision !== 'upload_anyway') {
    invalid(
      'INVALID_DUPLICATE_DECISION',
      'Choose how to handle the screenshot.',
    );
  }
  if (
    dateDecision !== 'cancel' &&
    dateDecision !== 'replace' &&
    dateDecision !== 'add_second'
  ) {
    invalid(
      'INVALID_DUPLICATE_DECISION',
      'Choose how to handle the report date.',
    );
  }
  if (
    replaceReportId !== null &&
    replaceReportId !== '' &&
    !uuidSchema.safeParse(replaceReportId).success
  ) {
    invalid('INVALID_REPLACEMENT', 'Select a valid report to replace.');
  }
  return {
    ...prepared,
    imageDuplicateDecision: imageDecision,
    dateDuplicateDecision: dateDecision,
    replaceReportId:
      typeof replaceReportId === 'string' && replaceReportId
        ? replaceReportId
        : null,
  };
}

export function parseEditReport(input: unknown): EditReportInput {
  const parsed = z
    .object({
      reportDate: z.string(),
      income: z.number(),
      note: z.string().nullable().optional(),
    })
    .strict()
    .safeParse(input);
  if (!parsed.success) invalid('INVALID_REPORT', 'Enter valid report values.');
  if (!isCalendarDate(parsed.data.reportDate)) {
    invalid('INVALID_REPORT_DATE', 'Enter a valid report date.');
  }
  if (!Number.isSafeInteger(parsed.data.income) || parsed.data.income <= 0) {
    invalid('INVALID_INCOME', 'Income must be a positive whole number.');
  }
  const note = parsed.data.note?.trim() || null;
  if (note && note.length > 2_000) {
    invalid('INVALID_NOTE', 'Note must be 2,000 characters or fewer.');
  }
  return {
    reportDate: parsed.data.reportDate,
    income: parsed.data.income,
    note,
  };
}

export function parseReportId(reportId: string) {
  const parsed = uuidSchema.safeParse(reportId);
  if (!parsed.success) invalid('INVALID_REPORT_ID', 'Select a valid report.');
  return parsed.data;
}
