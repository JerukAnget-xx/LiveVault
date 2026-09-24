export const REPORT_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_REPORT_IMAGE_BYTES = 10 * 1024 * 1024;

export type ReportImageMimeType = (typeof REPORT_IMAGE_MIME_TYPES)[number];

export type ReportImage = {
  bytes: Uint8Array;
  mimeType: ReportImageMimeType;
  size: number;
};

export type ReportAudit = {
  detectedIncome: number | null;
  confidence: number | null;
  rawGmv: number | null;
  sourceLabel: string | null;
  status: 'OK' | 'GMV_NOT_FOUND' | null;
};

export type PrepareReportInput = {
  recipientId: string;
  reportDate: string;
  income: number;
  note: string | null;
  image: ReportImage;
  audit: ReportAudit;
};

export type ImageDuplicateDecision = 'cancel' | 'upload_anyway';
export type DateDuplicateDecision = 'cancel' | 'replace' | 'add_second';

export type SaveReportInput = PrepareReportInput & {
  imageDuplicateDecision: ImageDuplicateDecision;
  dateDuplicateDecision: DateDuplicateDecision;
  replaceReportId: string | null;
};

export type EditReportInput = {
  reportDate: string;
  income: number;
  note: string | null;
};

export type ReportRecord = {
  id: string;
  recipientId: string;
  cycleId: string;
  reportDate: string;
  income: number;
  note: string | null;
  imagePath: string;
  imageHash: string;
  aiDetectedIncome: number | null;
  aiDetectedDate: string | null;
  aiConfidence: string | null;
  aiRawResponse: unknown;
  whatsappStatus: 'not_sent' | 'queued' | 'sending' | 'sent' | 'failed';
  createdAt: Date;
  updatedAt: Date;
};

export type ReportSummary = Pick<
  ReportRecord,
  | 'id'
  | 'recipientId'
  | 'cycleId'
  | 'reportDate'
  | 'income'
  | 'note'
  | 'createdAt'
>;

export type ReportListItem = ReportRecord & {
  cycleNumber: number;
  cycleStartedAt: Date;
  cycleEndedAt: Date | null;
  cycleIsActive: boolean;
};

export type PersistReportValues = Omit<
  ReportRecord,
  'createdAt' | 'updatedAt' | 'whatsappStatus'
>;

export type ReplaceReportValues = Omit<
  PersistReportValues,
  'id' | 'recipientId' | 'cycleId'
>;

export type ReportRepository = {
  findRecipientById(
    recipientId: string,
  ): Promise<{ id: string; isActive: boolean } | null>;
  findById(reportId: string): Promise<ReportRecord | null>;
  findByImageHash(imageHash: string): Promise<ReportSummary[]>;
  findByRecipientDate(
    recipientId: string,
    reportDate: string,
  ): Promise<ReportSummary[]>;
  listForRecipient(recipientId: string): Promise<ReportListItem[]>;
  listCountsForCycle(
    cycleId: string,
  ): Promise<Array<{ recipientId: string; count: number }>>;
  create(values: PersistReportValues): Promise<ReportRecord>;
  replace(
    reportId: string,
    values: ReplaceReportValues,
  ): Promise<ReportRecord | null>;
  updateMetadata(
    reportId: string,
    values: EditReportInput,
  ): Promise<ReportRecord | null>;
  delete(reportId: string): Promise<boolean>;
};

export type ReportImageStorage = {
  upload(input: {
    path: string;
    bytes: Uint8Array;
    contentType: ReportImageMimeType;
  }): Promise<void>;
  remove(path: string): Promise<void>;
};

export type ActiveCycle = {
  id: string;
  cycleNumber: number;
};

export type ReportServiceDependencies = {
  repository: ReportRepository;
  storage: ReportImageStorage;
  getActiveCycle(adminUserId: string): Promise<ActiveCycle>;
  createId(): string;
  logger: Pick<Console, 'error'>;
};
