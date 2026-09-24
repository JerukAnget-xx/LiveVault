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

const coreServerEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_REPORT_SCREENSHOTS_BUCKET: z.string().trim().min(1),
});

const whatsappEnvSchema = z.object({
  WHATSAPP_ACCESS_TOKEN: z.string().min(10),
  WHATSAPP_PHONE_NUMBER_ID: z.string().regex(/^\d+$/u),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().regex(/^\d+$/u),
  WHATSAPP_TEMPLATE_NAME: z.string().regex(/^[a-z0-9_]+$/u),
  WHATSAPP_TEMPLATE_LANGUAGE: z
    .string()
    .regex(/^[a-z]{2,3}(?:_[A-Z]{2})?$/u),
  WHATSAPP_GRAPH_VERSION: z.string().regex(/^v\d+\.\d+$/u),
});

export type ServerEnv = z.infer<typeof coreServerEnvSchema>;
export type WhatsAppEnv = z.infer<typeof whatsappEnvSchema>;

type Environment = Record<string, string | undefined>;

export function parseServerEnv(environment: Environment): ServerEnv {
  const result = coreServerEnvSchema.safeParse(environment);

  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join('.') || 'environment')
      .join(', ');

    throw new Error(`Invalid server environment variables: ${fields}`);
  }

  return result.data;
}

export function parseWhatsAppEnv(environment: Environment): WhatsAppEnv {
  const result = whatsappEnvSchema.safeParse(environment);

  if (!result.success) {
    throw new Error('WhatsApp delivery is not configured.');
  }

  return result.data;
}
