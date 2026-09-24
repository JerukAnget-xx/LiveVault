export class ReportCycleConflictError extends Error {
  constructor() {
    super('The active report cycle changed before this operation completed.');
    this.name = 'ReportCycleConflictError';
  }
}

export class ReportCycleUnavailableError extends Error {
  constructor() {
    super('No active report cycle is available.');
    this.name = 'ReportCycleUnavailableError';
  }
}

export class ReportCycleDatabaseError extends Error {
  constructor() {
    super('Report cycle database operation failed.');
    this.name = 'ReportCycleDatabaseError';
  }
}
