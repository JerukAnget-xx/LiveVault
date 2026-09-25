export type MetaWebhookStatus =
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'deleted';

export type WhatsAppWebhookStatusUpdate = {
  messageId: string;
  providerStatus: Exclude<MetaWebhookStatus, 'deleted'>;
  occurredAt: Date;
  errorMessage: string | null;
};

export type WhatsAppWebhookUpdateResult = 'updated' | 'unchanged' | 'not_found';

export type WhatsAppWebhookRepository = {
  applyStatus(
    update: WhatsAppWebhookStatusUpdate,
  ): Promise<WhatsAppWebhookUpdateResult>;
};

export type WhatsAppWebhookLogger = {
  warn: (message: string, details?: Record<string, unknown>) => void;
  error: (message: string, details?: Record<string, unknown>) => void;
};
