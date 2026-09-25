import { verifyWhatsAppWebhook } from './webhook.ts';
import type { WhatsAppWebhookLogger } from './webhook-types.ts';

type WebhookService = {
  handlePayload(payload: unknown): Promise<unknown>;
};

type WebhookHttpDependencies = {
  service: WebhookService;
  loadVerifyToken: () => string;
  logger: Pick<WhatsAppWebhookLogger, 'error'>;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function createWhatsAppWebhookHandlers({
  service,
  loadVerifyToken,
  logger,
}: WebhookHttpDependencies) {
  const GET = (request: Request) => {
    const url = new URL(request.url);
    let expectedToken: string;
    try {
      expectedToken = loadVerifyToken();
    } catch {
      return jsonResponse(
        { error: { code: 'WEBHOOK_VERIFICATION_FAILED' } },
        403,
      );
    }

    const result = verifyWhatsAppWebhook(
      {
        mode: url.searchParams.get('hub.mode'),
        verifyToken: url.searchParams.get('hub.verify_token'),
        challenge: url.searchParams.get('hub.challenge'),
      },
      expectedToken,
    );

    if (!result.verified) {
      return jsonResponse(
        { error: { code: 'WEBHOOK_VERIFICATION_FAILED' } },
        403,
      );
    }

    return new Response(result.challenge, {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  };

  const POST = async (request: Request) => {
    let payload: unknown = null;
    try {
      payload = await request.json();
    } catch {
      // Malformed and unrelated callbacks are acknowledged without processing.
    }

    try {
      await service.handlePayload(payload);
      return jsonResponse({ received: true });
    } catch (error) {
      logger.error('[whatsapp-webhook] callback processing failed', {
        type: error instanceof Error ? error.name : 'UnknownError',
      });
      return jsonResponse(
        { error: { code: 'WEBHOOK_PROCESSING_FAILED' } },
        500,
      );
    }
  };

  return {
    GET,
    POST,
  };
}
