import type { ReportCycleRepository } from './types';

export function createReportCycleService(
  repository: ReportCycleRepository,
  clock: () => Date = () => new Date(),
) {
  function getActiveReportCycle(adminUserId: string) {
    return repository.getOrCreateActive({ adminUserId, now: clock() });
  }

  function resetReportCycle(adminUserId: string, expectedCycleId: string) {
    return repository.reset({
      adminUserId,
      expectedCycleId,
      now: clock(),
    });
  }

  return { getActiveReportCycle, resetReportCycle };
}

export type ReportCycleService = ReturnType<typeof createReportCycleService>;
