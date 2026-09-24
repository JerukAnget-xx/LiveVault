export type WhatsAppDeliveryStatus = 'queued' | 'sending' | 'sent' | 'failed';

export type DeliveryMode = 'send' | 'retry';

export type DeliveryAttempt = {
  id: string;
  reportId: string;
  attemptNumber: number;
  messageId: string | null;
  status: WhatsAppDeliveryStatus;
  sentAt: Date | null;
  failedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
};

export type CumulativeReport = {
  id: string;
  reportDate: string;
  income: number;
  createdAt: Date;
};

export type DeliveryContext = {
  attempt: DeliveryAttempt;
  report: {
    id: string;
    recipientId: string;
    cycleId: string;
    imagePath: string;
  };
  recipient: {
    whatsappNumber: string;
    reportTitle: string;
  };
  reports: CumulativeReport[];
};

export type WhatsAppDeliveryRepository = {
  startAttempt(reportId: string, mode: DeliveryMode): Promise<DeliveryContext>;
  markSending(attemptId: string, reportId: string): Promise<void>;
  markSent(input: {
    attemptId: string;
    reportId: string;
    messageId: string;
    sentAt: Date;
  }): Promise<DeliveryAttempt>;
  markFailed(input: {
    attemptId: string;
    reportId: string;
    errorMessage: string;
    failedAt: Date;
  }): Promise<DeliveryAttempt>;
};

export type StoredReportImage = {
  bytes: Uint8Array;
  mimeType: string;
};

export type ReportImageReader = {
  download(path: string): Promise<StoredReportImage>;
};

export type MetaWhatsAppClient = {
  uploadMedia(image: StoredReportImage): Promise<{ mediaId: string }>;
  sendTemplate(input: {
    to: string;
    mediaId: string;
    reportTitle: string;
    reportList: string;
  }): Promise<{ messageId: string }>;
};

export type WhatsAppDeliveryDependencies = {
  repository: WhatsAppDeliveryRepository;
  imageReader: ReportImageReader;
  client: MetaWhatsAppClient;
  clock(): Date;
  logger: Pick<Console, 'error'>;
};
