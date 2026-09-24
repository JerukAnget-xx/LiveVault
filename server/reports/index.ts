import 'server-only';

import { randomUUID } from 'node:crypto';

import { getActiveReportCycle } from '@/server/report-cycles';
import { reportImageStorage } from '@/server/storage/report-images';

import { reportRepository } from './repository';
import { createReportService } from './service';

const reportService = createReportService({
  repository: reportRepository,
  storage: reportImageStorage,
  getActiveCycle: getActiveReportCycle,
  createId: randomUUID,
  logger: console,
});

export const {
  checkReport,
  saveReport,
  listReportsForRecipient,
  listReportCountsForCycle,
  updateReport,
  deleteReport,
} = reportService;

export { ReportNotFoundError, ReportRecipientNotFoundError } from './errors';
export type { ReportListItem, ReportRecord } from './types';

// Report business logic belongs in this boundary.
export {};
