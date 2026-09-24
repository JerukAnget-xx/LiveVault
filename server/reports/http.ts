import type { ReportSummary } from './types.ts';

type ClassifiedReportError = {
  status: number;
  code: string;
  message: string;
  duplicateImages?: ReportSummary[];
  duplicateDates?: ReportSummary[];
};

export function classifyReportError(error: unknown): ClassifiedReportError {
  const name = error instanceof Error ? error.name : '';
  if (name === 'AuthenticationRequiredError') {
    return {
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication is required.',
    };
  }
  if (name === 'ReportValidationError') {
    const validation = error as Error & { code?: string };
    return {
      status: 400,
      code: validation.code ?? 'INVALID_REPORT',
      message: validation.message,
    };
  }
  if (name === 'ReportRecipientNotFoundError') {
    return {
      status: 404,
      code: 'RECIPIENT_NOT_FOUND',
      message: 'Recipient not found.',
    };
  }
  if (name === 'ReportRecipientInactiveError') {
    return {
      status: 409,
      code: 'RECIPIENT_INACTIVE',
      message: 'The recipient is inactive.',
    };
  }
  if (name === 'ReportNotFoundError') {
    return {
      status: 404,
      code: 'REPORT_NOT_FOUND',
      message: 'Report not found.',
    };
  }
  if (name === 'ReportDuplicateDecisionRequiredError') {
    const duplicate = error as Error & {
      duplicateImages: ReportSummary[];
      duplicateDates: ReportSummary[];
    };
    return {
      status: 409,
      code: 'DUPLICATE_DECISION_REQUIRED',
      message: 'Choose how to handle the duplicate report.',
      duplicateImages: duplicate.duplicateImages,
      duplicateDates: duplicate.duplicateDates,
    };
  }
  if (name === 'ReportCycleConflictError') {
    return {
      status: 409,
      code: 'REPORT_CYCLE_CONFLICT',
      message: 'The active report cycle changed. Try again.',
    };
  }
  if (name === 'ReportCycleUnavailableError') {
    return {
      status: 409,
      code: 'REPORT_CYCLE_UNAVAILABLE',
      message: 'No active report cycle is available.',
    };
  }
  if (name === 'ReportStorageError') {
    return {
      status: 503,
      code: 'STORAGE_ERROR',
      message: 'The screenshot could not be stored. Try again.',
    };
  }
  if (name === 'ReportDatabaseError' || name === 'ReportCycleDatabaseError') {
    return {
      status: 500,
      code: 'DATABASE_ERROR',
      message: 'The report operation could not be completed.',
    };
  }
  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'The report operation could not be completed.',
  };
}
