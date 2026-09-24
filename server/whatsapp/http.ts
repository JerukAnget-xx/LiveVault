import type { WhatsAppErrorCode } from './errors.ts';

type WhatsAppHttpError = {
  status: number;
  code: string;
  message: string;
};

const statusByCode: Record<WhatsAppErrorCode, number> = {
  WHATSAPP_NOT_CONFIGURED: 503,
  WHATSAPP_MEDIA_UPLOAD_FAILED: 502,
  WHATSAPP_TEMPLATE_SEND_FAILED: 502,
  WHATSAPP_ALREADY_SENDING: 409,
  WHATSAPP_ALREADY_SENT: 409,
  WHATSAPP_RETRY_UNAVAILABLE: 409,
  WHATSAPP_RECIPIENT_INVALID: 422,
  WHATSAPP_REPORT_NOT_FOUND: 404,
  WHATSAPP_REPORT_CYCLE_INACTIVE: 409,
  WHATSAPP_DATABASE_ERROR: 500,
};

export function classifyWhatsAppError(error: unknown): WhatsAppHttpError {
  if (error instanceof Error && error.name === 'AuthenticationRequiredError') {
    return {
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication is required.',
    };
  }
  if (error instanceof Error && error.name === 'WhatsAppDeliveryError') {
    const deliveryError = error as Error & { code: WhatsAppErrorCode };
    return {
      status: statusByCode[deliveryError.code] ?? 500,
      code: deliveryError.code,
      message: deliveryError.message,
    };
  }
  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'The WhatsApp delivery could not be completed.',
  };
}
