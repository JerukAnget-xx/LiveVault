import { getWhatsAppWebhookEnv } from '@/lib/env';
import { createWhatsAppWebhookHandlers } from '@/server/whatsapp/webhook-http';
import { whatsappWebhookRepository } from '@/server/whatsapp/webhook-repository';
import { createWhatsAppWebhookService } from '@/server/whatsapp/webhook';

const service = createWhatsAppWebhookService({
  repository: whatsappWebhookRepository,
  clock: () => new Date(),
  logger: console,
});

const handlers = createWhatsAppWebhookHandlers({
  service,
  loadVerifyToken: () => getWhatsAppWebhookEnv().WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  logger: console,
});

export const GET = (request: Request) => handlers.GET(request);
export const POST = (request: Request) => handlers.POST(request);
