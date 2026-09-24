export type ReportCycleHttpError = {
  status: number;
  code: string;
  message: string;
};

export function classifyReportCycleError(error: unknown): ReportCycleHttpError {
  const errorName = error instanceof Error ? error.name : '';

  if (errorName === 'AuthenticationRequiredError') {
    return {
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication is required.',
    };
  }

  if (errorName === 'ReportCycleValidationError') {
    return {
      status: 400,
      code: 'INVALID_RESET_REQUEST',
      message: 'A valid expected active-cycle ID is required.',
    };
  }

  if (errorName === 'ReportCycleConflictError') {
    return {
      status: 409,
      code: 'REPORT_CYCLE_CONFLICT',
      message:
        'The active report cycle changed. Refresh before trying the reset again.',
    };
  }

  if (errorName === 'ReportCycleUnavailableError') {
    return {
      status: 409,
      code: 'REPORT_CYCLE_UNAVAILABLE',
      message: 'No active report cycle is available.',
    };
  }

  if (errorName === 'ReportCycleDatabaseError') {
    return {
      status: 500,
      code: 'DATABASE_ERROR',
      message: 'The report cycle operation could not be completed.',
    };
  }

  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'The report cycle operation could not be completed.',
  };
}
