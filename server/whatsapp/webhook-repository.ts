import 'server-only';

import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { reports, whatsappDeliveries } from '@/db/schema';

import type { WhatsAppWebhookRepository } from './webhook-types';

export const whatsappWebhookRepository: WhatsAppWebhookRepository = {
  async applyStatus(update) {
    return db.transaction(async (transaction) => {
      const [delivery] = await transaction
        .select({
          id: whatsappDeliveries.id,
          reportId: whatsappDeliveries.reportId,
          status: whatsappDeliveries.status,
          sentAt: whatsappDeliveries.sentAt,
          failedAt: whatsappDeliveries.failedAt,
          errorMessage: whatsappDeliveries.errorMessage,
          reportStatus: reports.whatsappStatus,
        })
        .from(whatsappDeliveries)
        .innerJoin(reports, eq(whatsappDeliveries.reportId, reports.id))
        .where(eq(whatsappDeliveries.messageId, update.messageId))
        .limit(1);

      if (!delivery) return 'not_found';

      if (update.providerStatus === 'failed') {
        const failedAt = delivery.failedAt ?? update.occurredAt;
        const deliveryChanged =
          delivery.status !== 'failed' ||
          delivery.errorMessage !== update.errorMessage ||
          delivery.failedAt === null;
        const reportChanged = delivery.reportStatus !== 'failed';

        if (deliveryChanged) {
          await transaction
            .update(whatsappDeliveries)
            .set({
              status: 'failed',
              failedAt,
              errorMessage: update.errorMessage,
            })
            .where(eq(whatsappDeliveries.id, delivery.id));
        }
        if (reportChanged) {
          await transaction
            .update(reports)
            .set({ whatsappStatus: 'failed', updatedAt: failedAt })
            .where(eq(reports.id, delivery.reportId));
        }

        return deliveryChanged || reportChanged ? 'updated' : 'unchanged';
      }

      // An explicit provider failure is terminal for this attempt. Late success
      // callbacks must not hide that failure.
      if (delivery.status === 'failed') return 'unchanged';

      const sentAt = delivery.sentAt ?? update.occurredAt;
      const deliveryChanged =
        delivery.status !== 'sent' || delivery.sentAt === null;
      const reportChanged = delivery.reportStatus !== 'sent';

      if (deliveryChanged) {
        await transaction
          .update(whatsappDeliveries)
          .set({ status: 'sent', sentAt })
          .where(eq(whatsappDeliveries.id, delivery.id));
      }
      if (reportChanged) {
        await transaction
          .update(reports)
          .set({ whatsappStatus: 'sent', updatedAt: sentAt })
          .where(eq(reports.id, delivery.reportId));
      }

      return deliveryChanged || reportChanged ? 'updated' : 'unchanged';
    });
  },
};
