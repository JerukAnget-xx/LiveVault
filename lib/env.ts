import 'server-only';

import {
  parseServerEnv,
  parseWhatsAppEnv,
  type ServerEnv,
  type WhatsAppEnv,
} from './env-schema';

export type { ServerEnv, WhatsAppEnv } from './env-schema';

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  cachedEnv = parseServerEnv(process.env);
  return cachedEnv;
}

export function getReportStorageEnv() {
  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_REPORT_SCREENSHOTS_BUCKET,
  } = getServerEnv();

  return {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_REPORT_SCREENSHOTS_BUCKET,
  };
}

export function getWhatsAppEnv(): WhatsAppEnv {
  return parseWhatsAppEnv(process.env);
}
