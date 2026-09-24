export type ReportCycle = {
  id: string;
  cycleNumber: number;
  startedAt: Date;
  endedAt: Date | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
};

export type InitializeReportCycleInput = {
  adminUserId: string;
  now: Date;
};

export type ResetReportCycleInput = InitializeReportCycleInput & {
  expectedCycleId: string;
};

export type ReportCycleRepository = {
  getOrCreateActive(input: InitializeReportCycleInput): Promise<ReportCycle>;
  reset(input: ResetReportCycleInput): Promise<ReportCycle>;
};
