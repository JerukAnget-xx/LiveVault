import type { ReportExtractionResult } from './report-extraction';

export const APPLICATION_TIME_ZONE = 'Asia/Jakarta';

export type UploadReportDraft = {
  reportDate: string;
  income: string;
  note: string;
};

const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

export function getApplicationCalendarDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APPLICATION_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function createUploadReportDraft(now = new Date()): UploadReportDraft {
  return {
    reportDate: getApplicationCalendarDate(now),
    income: '',
    note: '',
  };
}

export function changeReportDate(
  draft: UploadReportDraft,
  reportDate: string,
): UploadReportDraft {
  if (!calendarDatePattern.test(reportDate)) return draft;

  return { ...draft, reportDate };
}

export function prepareDraftForExtraction(
  draft: UploadReportDraft,
): UploadReportDraft {
  return { ...draft, income: '' };
}

export function applyExtractionResultToDraft(
  draft: UploadReportDraft,
  result: Pick<ReportExtractionResult, 'status' | 'income'>,
): UploadReportDraft {
  return {
    ...draft,
    income:
      result.status === 'OK' && result.income !== null
        ? String(result.income)
        : '',
  };
}
