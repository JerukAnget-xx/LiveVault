import type { ReportSummary } from './types.ts';

export class ReportValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ReportValidationError';
    this.code = code;
  }
}

export class ReportRecipientNotFoundError extends Error {
  constructor() {
    super('Recipient not found');
    this.name = 'ReportRecipientNotFoundError';
  }
}

export class ReportRecipientInactiveError extends Error {
  constructor() {
    super('Recipient is inactive');
    this.name = 'ReportRecipientInactiveError';
  }
}

export class ReportNotFoundError extends Error {
  constructor() {
    super('Report not found');
    this.name = 'ReportNotFoundError';
  }
}

export class ReportDuplicateDecisionRequiredError extends Error {
  readonly duplicateImages: ReportSummary[];
  readonly duplicateDates: ReportSummary[];

  constructor(
    duplicateImages: ReportSummary[],
    duplicateDates: ReportSummary[],
  ) {
    super('A duplicate decision is required');
    this.name = 'ReportDuplicateDecisionRequiredError';
    this.duplicateImages = duplicateImages;
    this.duplicateDates = duplicateDates;
  }
}

export class ReportStorageError extends Error {
  constructor() {
    super('Report screenshot storage operation failed');
    this.name = 'ReportStorageError';
  }
}

export class ReportDatabaseError extends Error {
  constructor() {
    super('Report database operation failed');
    this.name = 'ReportDatabaseError';
  }
}
