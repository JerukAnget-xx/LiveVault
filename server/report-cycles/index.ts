import 'server-only';

import { reportCycleRepository } from './repository';
import { createReportCycleService } from './service';

const reportCycleService = createReportCycleService(reportCycleRepository);

export const { getActiveReportCycle, resetReportCycle } = reportCycleService;
export {
  ReportCycleConflictError,
  ReportCycleDatabaseError,
  ReportCycleUnavailableError,
} from './errors';
export type { ReportCycle } from './types';
