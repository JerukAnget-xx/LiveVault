export type WhatsAppErrorCode =
  | 'WHATSAPP_NOT_CONFIGURED'
  | 'WHATSAPP_MEDIA_UPLOAD_FAILED'
  | 'WHATSAPP_TEMPLATE_SEND_FAILED'
  | 'WHATSAPP_ALREADY_SENDING'
  | 'WHATSAPP_ALREADY_SENT'
  | 'WHATSAPP_RETRY_UNAVAILABLE'
  | 'WHATSAPP_RECIPIENT_INVALID'
  | 'WHATSAPP_REPORT_NOT_FOUND'
  | 'WHATSAPP_REPORT_CYCLE_INACTIVE'
  | 'WHATSAPP_DATABASE_ERROR';

export class WhatsAppDeliveryError extends Error {
  readonly code: WhatsAppErrorCode;

  constructor(code: WhatsAppErrorCode, message: string) {
    super(message);
    this.name = 'WhatsAppDeliveryError';
    this.code = code;
  }
}

export function whatsappError(code: WhatsAppErrorCode) {
  const messages: Record<WhatsAppErrorCode, string> = {
    WHATSAPP_NOT_CONFIGURED: 'WhatsApp delivery is not configured.',
    WHATSAPP_MEDIA_UPLOAD_FAILED:
      'The report screenshot could not be prepared for WhatsApp.',
    WHATSAPP_TEMPLATE_SEND_FAILED:
      'WhatsApp did not accept the report message.',
    WHATSAPP_ALREADY_SENDING:
      'A WhatsApp delivery is already in progress for this report.',
    WHATSAPP_ALREADY_SENT: 'This report has already been sent to WhatsApp.',
    WHATSAPP_RETRY_UNAVAILABLE:
      'Only a failed WhatsApp delivery can be retried.',
    WHATSAPP_RECIPIENT_INVALID: 'The recipient WhatsApp number is invalid.',
    WHATSAPP_REPORT_NOT_FOUND: 'Report not found.',
    WHATSAPP_REPORT_CYCLE_INACTIVE:
      'The report is not in the current active report cycle.',
    WHATSAPP_DATABASE_ERROR:
      'The WhatsApp delivery record could not be updated.',
  };
  return new WhatsAppDeliveryError(code, messages[code]);
}

export function requireWhatsAppConfiguration<T>(load: () => T): T {
  try {
    return load();
  } catch {
    throw whatsappError('WHATSAPP_NOT_CONFIGURED');
  }
}
