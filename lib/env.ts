import 'server-only';

import { z } from 'zod';

const postgresUrl = z
  .string()
  .min(1)
  .superRefine((value, context) => {
    try {
      const url = new URL(value);

      if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
        context.addIssue({
          code: 'custom',
          message: 'must use the postgres or postgresql protocol',
        });
      }
    } catch {
      context.addIssue({
        code: 'custom',
        message: 'must be a valid PostgreSQL URL',
      });
    }
  });

const serverEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  SUPABASE_URL: z.url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_REPORT_SCREENSHOTS_BUCKET: z
    .string()
    .min(1)
    .default('report-screenshots'),
  WHATSAPP_ACCESS_TOKEN: z.string().min(10).optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().regex(/^\d+$/u).optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().regex(/^\d+$/u).optional(),
  WHATSAPP_TEMPLATE_NAME: z
    .string()
    .regex(/^[a-z0-9_]+$/u)
    .optional(),
  WHATSAPP_TEMPLATE_LANGUAGE: z
    .string()
    .regex(/^[a-z]{2,3}(?:_[A-Z]{2})?$/u)
    .optional(),
  WHATSAPP_GRAPH_VERSION: z
    .string()
    .regex(/^v\d+\.\d+$/u)
    .optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join('.') || 'environment')
      .join(', ');

    throw new Error(`Invalid server environment variables: ${fields}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

const reportStorageEnvSchema = serverEnvSchema
  .pick({
    SUPABASE_URL: true,
    SUPABASE_SERVICE_ROLE_KEY: true,
    SUPABASE_REPORT_SCREENSHOTS_BUCKET: true,
  })
  .required({
    SUPABASE_URL: true,
    SUPABASE_SERVICE_ROLE_KEY: true,
  });

export function getReportStorageEnv() {
  const result = reportStorageEnvSchema.safeParse(getServerEnv());
  if (!result.success) {
    throw new Error('Report screenshot storage is not configured.');
  }
  return result.data;
}

const whatsappEnvSchema = serverEnvSchema
  .pick({
    WHATSAPP_ACCESS_TOKEN: true,
    WHATSAPP_PHONE_NUMBER_ID: true,
    WHATSAPP_BUSINESS_ACCOUNT_ID: true,
    WHATSAPP_TEMPLATE_NAME: true,
    WHATSAPP_TEMPLATE_LANGUAGE: true,
    WHATSAPP_GRAPH_VERSION: true,
  })
  .required();

export type WhatsAppEnv = z.infer<typeof whatsappEnvSchema>;

export function getWhatsAppEnv(): WhatsAppEnv {
  const result = whatsappEnvSchema.safeParse(getServerEnv());
  if (!result.success) throw new Error('WhatsApp delivery is not configured.');
  return result.data;
}
