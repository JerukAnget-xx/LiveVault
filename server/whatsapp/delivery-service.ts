import { WhatsAppDeliveryError, whatsappError } from './errors.ts';
import { generateCumulativeReportList } from './report-message.ts';
import type { DeliveryMode, WhatsAppDeliveryDependencies } from './types.ts';

const whatsappNumberPattern = /^62\d{6,13}$/u;

export function createWhatsAppDeliveryService(
  dependencies: WhatsAppDeliveryDependencies,
) {
  const { repository, imageReader, client, clock, logger } = dependencies;

  async function recordFailure(
    attemptId: string,
    reportId: string,
    error: WhatsAppDeliveryError,
  ) {
    try {
      await repository.markFailed({
        attemptId,
        reportId,
        errorMessage: error.code,
        failedAt: clock(),
      });
    } catch {
      logger.error('[whatsapp] failed to persist delivery failure', {
        code: error.code,
      });
    }
    throw error;
  }

  async function deliverReport(reportId: string, mode: DeliveryMode = 'send') {
    const context = await repository.startAttempt(reportId, mode);
    const { attempt, report, recipient, reports } = context;

    if (!whatsappNumberPattern.test(recipient.whatsappNumber)) {
      return recordFailure(
        attempt.id,
        report.id,
        whatsappError('WHATSAPP_RECIPIENT_INVALID'),
      );
    }

    try {
      await repository.markSending(attempt.id, report.id);
    } catch {
      return recordFailure(
        attempt.id,
        report.id,
        whatsappError('WHATSAPP_DATABASE_ERROR'),
      );
    }

    let mediaId: string;
    try {
      const image = await imageReader.download(report.imagePath);
      const uploaded = await client.uploadMedia(image);
      mediaId = uploaded.mediaId;
    } catch (error) {
      const safeError =
        error instanceof WhatsAppDeliveryError &&
        error.code === 'WHATSAPP_NOT_CONFIGURED'
          ? error
          : whatsappError('WHATSAPP_MEDIA_UPLOAD_FAILED');
      return recordFailure(attempt.id, report.id, safeError);
    }

    const reportList = generateCumulativeReportList(
      recipient.reportTitle,
      reports,
    );
    let messageId: string;
    try {
      const sent = await client.sendTemplate({
        to: recipient.whatsappNumber,
        mediaId,
        reportTitle: recipient.reportTitle,
        reportList,
      });
      messageId = sent.messageId;
    } catch {
      return recordFailure(
        attempt.id,
        report.id,
        whatsappError('WHATSAPP_TEMPLATE_SEND_FAILED'),
      );
    }

    const completedAttempt = await repository.markSent({
      attemptId: attempt.id,
      reportId: report.id,
      messageId,
      sentAt: clock(),
    });
    return { attempt: completedAttempt, reportList };
  }

  return { deliverReport };
}

export type WhatsAppDeliveryService = ReturnType<
  typeof createWhatsAppDeliveryService
>;
