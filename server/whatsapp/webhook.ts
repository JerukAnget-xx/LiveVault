import { timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import type {
  MetaWebhookStatus,
  WhatsAppWebhookLogger,
  WhatsAppWebhookRepository,
} from './webhook-types.ts';

const metaErrorSchema = z.looseObject({
  code: z.union([z.string(), z.number()]).optional(),
  title: z.string().optional(),
  message: z.string().optional(),
});

const statusEntrySchema = z.looseObject({
  id: z.string().trim().min(1),
  status: z.string().trim().min(1),
  timestamp: z.union([z.string(), z.number()]).optional(),
  errors: z.array(metaErrorSchema).optional(),
});

const webhookPayloadSchema = z.looseObject({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(
    z.looseObject({
      changes: z.array(
        z.looseObject({
          value: z.looseObject({
            statuses: z.array(z.unknown()).optional(),
            messages: z.array(z.unknown()).optional(),
          }),
        }),
      ),
    }),
  ),
});

const supportedStatuses = new Set<MetaWebhookStatus>([
  'sent',
  'delivered',
  'read',
  'failed',
  'deleted',
]);

type VerificationInput = {
  mode: string | null;
  verifyToken: string | null;
  challenge: string | null;
};

type WebhookDependencies = {
  repository: WhatsAppWebhookRepository;
  clock: () => Date;
  logger: Pick<WhatsAppWebhookLogger, 'warn'>;
};

function tokensMatch(actual: string, expected: string) {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}

function statusTimestamp(value: string | number | undefined, fallback: Date) {
  const seconds =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/u.test(value)
        ? Number(value)
        : Number.NaN;
  const timestamp = new Date(seconds * 1000);
  return Number.isFinite(seconds) && !Number.isNaN(timestamp.getTime())
    ? timestamp
    : fallback;
}

function safeProviderText(value: string | undefined) {
  if (!value) return null;
  const normalized = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127 ? ' ' : character;
  })
    .join('')
    .replace(/\s+/gu, ' ')
    .trim();
  return normalized ? normalized.slice(0, 240) : null;
}

export function summarizeMetaFailure(
  errors: z.infer<typeof metaErrorSchema>[] | undefined,
) {
  const error = errors?.[0];
  if (!error) return 'META_DELIVERY_FAILED';

  const rawCode = error.code === undefined ? '' : String(error.code);
  const code = /^\d{1,12}$/u.test(rawCode) ? `META_${rawCode}` : null;
  const description =
    safeProviderText(error.title) ?? safeProviderText(error.message);

  if (code && description) return `${code}: ${description}`;
  return code ?? description ?? 'META_DELIVERY_FAILED';
}

export function verifyWhatsAppWebhook(
  input: VerificationInput,
  expectedToken: string,
) {
  if (
    input.mode !== 'subscribe' ||
    !input.verifyToken ||
    !input.challenge ||
    !tokensMatch(input.verifyToken, expectedToken)
  ) {
    return { verified: false as const };
  }

  return { verified: true as const, challenge: input.challenge };
}

export function createWhatsAppWebhookService({
  repository,
  clock,
  logger,
}: WebhookDependencies) {
  return {
    async handlePayload(payload: unknown) {
      const parsed = webhookPayloadSchema.safeParse(payload);
      if (!parsed.success) return { processed: 0, ignored: 1 };

      let processed = 0;
      let ignored = 0;
      const seenEvents = new Set<string>();

      for (const entry of parsed.data.entry) {
        for (const change of entry.changes) {
          const statuses = change.value.statuses ?? [];
          for (const candidate of statuses) {
            const statusEntry = statusEntrySchema.safeParse(candidate);
            if (!statusEntry.success) {
              ignored += 1;
              continue;
            }

            const providerStatus = statusEntry.data.status as MetaWebhookStatus;
            if (!supportedStatuses.has(providerStatus)) {
              ignored += 1;
              continue;
            }

            const eventKey = `${statusEntry.data.id}\u0000${providerStatus}`;
            if (seenEvents.has(eventKey)) {
              ignored += 1;
              continue;
            }
            seenEvents.add(eventKey);

            if (providerStatus === 'deleted') {
              ignored += 1;
              continue;
            }

            const result = await repository.applyStatus({
              messageId: statusEntry.data.id,
              providerStatus,
              occurredAt: statusTimestamp(statusEntry.data.timestamp, clock()),
              errorMessage:
                providerStatus === 'failed'
                  ? summarizeMetaFailure(statusEntry.data.errors)
                  : null,
            });

            if (result === 'not_found') {
              logger.warn('[whatsapp-webhook] no matching delivery attempt', {
                providerStatus,
              });
              ignored += 1;
            } else {
              processed += 1;
            }
          }
        }
      }

      return { processed, ignored };
    },
  };
}
