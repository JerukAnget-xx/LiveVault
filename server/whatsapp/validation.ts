import { z } from 'zod';

import { whatsappError } from './errors';

export function parseWhatsAppReportId(value: string) {
  const result = z.uuid().safeParse(value);
  if (!result.success) throw whatsappError('WHATSAPP_REPORT_NOT_FOUND');
  return result.data;
}
