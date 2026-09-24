import 'server-only';

import { and, asc, desc, eq, inArray, max, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  recipients,
  reportCycles,
  reports,
  whatsappDeliveries,
} from '@/db/schema';

import { WhatsAppDeliveryError, whatsappError } from './errors';
import type { DeliveryAttempt, WhatsAppDeliveryRepository } from './types';

const WHATSAPP_DELIVERY_LOCK_NAMESPACE = 1_928_702_117;

function postgresErrorCode(error: unknown): string | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }
  return typeof error === 'object' &&
    error !== null &&
    'cause' in error &&
    error.cause !== error
    ? postgresErrorCode(error.cause)
    : null;
}

function isDomainError(error: unknown) {
  return error instanceof WhatsAppDeliveryError;
}

export const whatsappDeliveryRepository: WhatsAppDeliveryRepository = {
  async startAttempt(reportId, mode) {
    try {
      return await db.transaction(async (transaction) => {
        const lock = await transaction.execute<{ acquired: boolean }>(
          sql`select pg_try_advisory_xact_lock(${WHATSAPP_DELIVERY_LOCK_NAMESPACE}, hashtext(${reportId})) as acquired`,
        );
        if (!lock.rows[0]?.acquired) {
          throw whatsappError('WHATSAPP_ALREADY_SENDING');
        }

        const [context] = await transaction
          .select({
            id: reports.id,
            recipientId: reports.recipientId,
            cycleId: reports.cycleId,
            imagePath: reports.imagePath,
            whatsappStatus: reports.whatsappStatus,
            whatsappNumber: recipients.whatsappNumber,
            reportTitle: recipients.reportTitle,
          })
          .from(reports)
          .innerJoin(recipients, eq(reports.recipientId, recipients.id))
          .where(eq(reports.id, reportId))
          .limit(1);
        if (!context) throw whatsappError('WHATSAPP_REPORT_NOT_FOUND');

        const [activeCycle] = await transaction
          .select({ id: reportCycles.id })
          .from(reportCycles)
          .where(eq(reportCycles.isActive, true))
          .limit(1);
        if (!activeCycle || context.cycleId !== activeCycle.id) {
          throw whatsappError('WHATSAPP_REPORT_CYCLE_INACTIVE');
        }

        const [activeAttempt] = await transaction
          .select({ id: whatsappDeliveries.id })
          .from(whatsappDeliveries)
          .where(
            and(
              eq(whatsappDeliveries.reportId, reportId),
              inArray(whatsappDeliveries.status, ['queued', 'sending']),
            ),
          )
          .limit(1);
        if (activeAttempt) throw whatsappError('WHATSAPP_ALREADY_SENDING');

        const [latestAttempt] = await transaction
          .select({ status: whatsappDeliveries.status })
          .from(whatsappDeliveries)
          .where(eq(whatsappDeliveries.reportId, reportId))
          .orderBy(
            desc(whatsappDeliveries.attemptNumber),
            desc(whatsappDeliveries.id),
          )
          .limit(1);

        if (mode === 'send') {
          if (context.whatsappStatus === 'sent') {
            throw whatsappError('WHATSAPP_ALREADY_SENT');
          }
          if (context.whatsappStatus === 'failed') {
            throw whatsappError('WHATSAPP_RETRY_UNAVAILABLE');
          }
        } else if (
          context.whatsappStatus !== 'failed' ||
          latestAttempt?.status !== 'failed'
        ) {
          throw whatsappError('WHATSAPP_RETRY_UNAVAILABLE');
        }

        const [attemptState] = await transaction
          .select({ highestAttempt: max(whatsappDeliveries.attemptNumber) })
          .from(whatsappDeliveries)
          .where(eq(whatsappDeliveries.reportId, reportId));
        const attemptNumber = (attemptState?.highestAttempt ?? 0) + 1;
        const [attempt] = await transaction
          .insert(whatsappDeliveries)
          .values({ reportId, attemptNumber, status: 'queued' })
          .returning();
        if (!attempt) throw whatsappError('WHATSAPP_DATABASE_ERROR');

        await transaction
          .update(reports)
          .set({ whatsappStatus: 'queued', updatedAt: new Date() })
          .where(eq(reports.id, reportId));

        const cumulativeReports = await transaction
          .select({
            id: reports.id,
            reportDate: reports.reportDate,
            income: reports.income,
            createdAt: reports.createdAt,
          })
          .from(reports)
          .where(
            and(
              eq(reports.recipientId, context.recipientId),
              eq(reports.cycleId, activeCycle.id),
            ),
          )
          .orderBy(
            asc(reports.reportDate),
            asc(reports.createdAt),
            asc(reports.id),
          );

        return {
          attempt: attempt as DeliveryAttempt,
          report: {
            id: context.id,
            recipientId: context.recipientId,
            cycleId: context.cycleId,
            imagePath: context.imagePath,
          },
          recipient: {
            whatsappNumber: context.whatsappNumber,
            reportTitle: context.reportTitle,
          },
          reports: cumulativeReports,
        };
      });
    } catch (error) {
      if (isDomainError(error)) throw error;
      if (postgresErrorCode(error) === '23505') {
        throw whatsappError('WHATSAPP_ALREADY_SENDING');
      }
      throw whatsappError('WHATSAPP_DATABASE_ERROR');
    }
  },

  async markSending(attemptId, reportId) {
    try {
      await db.transaction(async (transaction) => {
        const delivery = await transaction
          .update(whatsappDeliveries)
          .set({ status: 'sending' })
          .where(
            and(
              eq(whatsappDeliveries.id, attemptId),
              eq(whatsappDeliveries.reportId, reportId),
              eq(whatsappDeliveries.status, 'queued'),
            ),
          )
          .returning({ id: whatsappDeliveries.id });
        if (delivery.length !== 1) {
          throw whatsappError('WHATSAPP_DATABASE_ERROR');
        }
        await transaction
          .update(reports)
          .set({ whatsappStatus: 'sending', updatedAt: new Date() })
          .where(eq(reports.id, reportId));
      });
    } catch (error) {
      if (isDomainError(error)) throw error;
      throw whatsappError('WHATSAPP_DATABASE_ERROR');
    }
  },

  async markSent({ attemptId, reportId, messageId, sentAt }) {
    try {
      return await db.transaction(async (transaction) => {
        const [attempt] = await transaction
          .update(whatsappDeliveries)
          .set({
            status: 'sent',
            messageId,
            sentAt,
            failedAt: null,
            errorMessage: null,
          })
          .where(
            and(
              eq(whatsappDeliveries.id, attemptId),
              eq(whatsappDeliveries.reportId, reportId),
            ),
          )
          .returning();
        if (!attempt) throw whatsappError('WHATSAPP_DATABASE_ERROR');
        await transaction
          .update(reports)
          .set({ whatsappStatus: 'sent', updatedAt: sentAt })
          .where(eq(reports.id, reportId));
        return attempt as DeliveryAttempt;
      });
    } catch (error) {
      if (isDomainError(error)) throw error;
      throw whatsappError('WHATSAPP_DATABASE_ERROR');
    }
  },

  async markFailed({ attemptId, reportId, errorMessage, failedAt }) {
    try {
      return await db.transaction(async (transaction) => {
        const [attempt] = await transaction
          .update(whatsappDeliveries)
          .set({
            status: 'failed',
            failedAt,
            errorMessage,
          })
          .where(
            and(
              eq(whatsappDeliveries.id, attemptId),
              eq(whatsappDeliveries.reportId, reportId),
            ),
          )
          .returning();
        if (!attempt) throw whatsappError('WHATSAPP_DATABASE_ERROR');
        await transaction
          .update(reports)
          .set({ whatsappStatus: 'failed', updatedAt: failedAt })
          .where(eq(reports.id, reportId));
        return attempt as DeliveryAttempt;
      });
    } catch (error) {
      if (isDomainError(error)) throw error;
      throw whatsappError('WHATSAPP_DATABASE_ERROR');
    }
  },
};
