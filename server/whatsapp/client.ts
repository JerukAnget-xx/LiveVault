import 'server-only';

import { z } from 'zod';

import { getWhatsAppEnv, type WhatsAppEnv } from '@/lib/env';

import { whatsappError } from './errors';
import { buildTemplateMessagePayload } from './report-message';
import type { MetaWhatsAppClient, StoredReportImage } from './types';

const mediaResponseSchema = z.object({ id: z.string().min(1) });
const messageResponseSchema = z.object({
  messages: z.array(z.object({ id: z.string().min(1) })).min(1),
});

type MetaClientOptions = {
  env: WhatsAppEnv;
  fetcher?: typeof fetch;
  logger?: Pick<Console, 'error'>;
};

function safeProviderCode(body: unknown) {
  const parsed = z
    .object({ error: z.object({ code: z.number().optional() }).optional() })
    .safeParse(body);
  return parsed.success ? parsed.data.error?.code : undefined;
}

export function createMetaWhatsAppClient({
  env,
  fetcher = fetch,
  logger = console,
}: MetaClientOptions): MetaWhatsAppClient {
  const baseUrl = `https://graph.facebook.com/${env.WHATSAPP_GRAPH_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}`;

  async function providerRequest(
    operation: 'media' | 'template',
    url: string,
    init: RequestInit,
  ) {
    let response: Response;
    try {
      response = await fetcher(url, {
        ...init,
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          ...init.headers,
        },
      });
    } catch {
      logger.error('[whatsapp] provider request failed', { operation });
      throw whatsappError(
        operation === 'media'
          ? 'WHATSAPP_MEDIA_UPLOAD_FAILED'
          : 'WHATSAPP_TEMPLATE_SEND_FAILED',
      );
    }

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      logger.error('[whatsapp] provider rejected request', {
        operation,
        status: response.status,
        providerCode: safeProviderCode(body),
      });
      throw whatsappError(
        operation === 'media'
          ? 'WHATSAPP_MEDIA_UPLOAD_FAILED'
          : 'WHATSAPP_TEMPLATE_SEND_FAILED',
      );
    }
    return body;
  }

  return {
    async uploadMedia(image: StoredReportImage) {
      if (
        !['image/jpeg', 'image/png'].includes(image.mimeType) ||
        image.bytes.byteLength > 5 * 1024 * 1024
      ) {
        throw whatsappError('WHATSAPP_MEDIA_UPLOAD_FAILED');
      }
      const formData = new FormData();
      formData.set('messaging_product', 'whatsapp');
      formData.set('type', image.mimeType);
      formData.set(
        'file',
        new Blob([Uint8Array.from(image.bytes).buffer], {
          type: image.mimeType,
        }),
        `report.${image.mimeType === 'image/png' ? 'png' : 'jpg'}`,
      );
      const body = await providerRequest('media', `${baseUrl}/media`, {
        method: 'POST',
        body: formData,
      });
      const parsed = mediaResponseSchema.safeParse(body);
      if (!parsed.success) {
        throw whatsappError('WHATSAPP_MEDIA_UPLOAD_FAILED');
      }
      return { mediaId: parsed.data.id };
    },

    async sendTemplate({ to, mediaId, reportTitle, reportList }) {
      const body = await providerRequest('template', `${baseUrl}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          buildTemplateMessagePayload({
            to,
            mediaId,
            reportTitle,
            reportList,
            templateName: env.WHATSAPP_TEMPLATE_NAME,
            templateLanguage: env.WHATSAPP_TEMPLATE_LANGUAGE,
          }),
        ),
      });
      const parsed = messageResponseSchema.safeParse(body);
      if (!parsed.success) {
        throw whatsappError('WHATSAPP_TEMPLATE_SEND_FAILED');
      }
      return { messageId: parsed.data.messages[0].id };
    },
  };
}

export function getMetaWhatsAppClient() {
  let env: WhatsAppEnv;
  try {
    env = getWhatsAppEnv();
  } catch {
    throw whatsappError('WHATSAPP_NOT_CONFIGURED');
  }
  return createMetaWhatsAppClient({ env });
}
