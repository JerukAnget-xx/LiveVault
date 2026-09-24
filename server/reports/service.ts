import { createHash } from 'node:crypto';

import {
  ReportDuplicateDecisionRequiredError,
  ReportNotFoundError,
  ReportRecipientInactiveError,
  ReportRecipientNotFoundError,
} from './errors.ts';
import type {
  EditReportInput,
  PrepareReportInput,
  ReportAudit,
  ReportServiceDependencies,
  ReportSummary,
  SaveReportInput,
} from './types.ts';

const extensionByMimeType = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export function sha256Image(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}

function safeDuplicates(rows: ReportSummary[]) {
  return rows.map(
    ({ id, recipientId, cycleId, reportDate, income, note, createdAt }) => ({
      id,
      recipientId,
      cycleId,
      reportDate,
      income,
      note,
      createdAt,
    }),
  );
}

function auditValues(audit: ReportAudit) {
  return {
    aiDetectedIncome: audit.detectedIncome,
    aiDetectedDate: null,
    aiConfidence: audit.confidence === null ? null : String(audit.confidence),
    aiRawResponse:
      audit.status || audit.rawGmv !== null || audit.sourceLabel
        ? {
            provider: 'local_ocr',
            status: audit.status,
            rawGmv: audit.rawGmv,
            sourceLabel: audit.sourceLabel,
          }
        : null,
  };
}

export function createReportService(dependencies: ReportServiceDependencies) {
  const { repository, storage, getActiveCycle, createId, logger } =
    dependencies;

  async function prepare(input: PrepareReportInput, adminUserId: string) {
    const recipient = await repository.findRecipientById(input.recipientId);
    if (!recipient) throw new ReportRecipientNotFoundError();
    if (!recipient.isActive) throw new ReportRecipientInactiveError();

    const cycle = await getActiveCycle(adminUserId);
    const imageHash = sha256Image(input.image.bytes);
    const [duplicateImages, duplicateDates] = await Promise.all([
      repository.findByImageHash(imageHash),
      repository.findByRecipientDate(input.recipientId, input.reportDate),
    ]);

    return {
      cycle,
      imageHash,
      duplicateImages: safeDuplicates(duplicateImages),
      duplicateDates: safeDuplicates(duplicateDates),
    };
  }

  async function checkReport(input: PrepareReportInput, adminUserId: string) {
    return prepare(input, adminUserId);
  }

  async function saveReport(input: SaveReportInput, adminUserId: string) {
    const checked = await prepare(input, adminUserId);
    const unresolvedImage =
      checked.duplicateImages.length > 0 &&
      input.imageDuplicateDecision !== 'upload_anyway';
    const unresolvedDate =
      checked.duplicateDates.length > 0 &&
      input.dateDuplicateDecision === 'cancel';
    if (unresolvedImage || unresolvedDate) {
      throw new ReportDuplicateDecisionRequiredError(
        checked.duplicateImages,
        checked.duplicateDates,
      );
    }

    let reportToReplace = null;
    if (
      checked.duplicateDates.length > 0 &&
      input.dateDuplicateDecision === 'replace'
    ) {
      reportToReplace = checked.duplicateDates.find(
        (report) => report.id === input.replaceReportId,
      );
      if (!reportToReplace) {
        throw new ReportDuplicateDecisionRequiredError(
          checked.duplicateImages,
          checked.duplicateDates,
        );
      }
    }

    const objectId = createId();
    const cycleId = reportToReplace?.cycleId ?? checked.cycle.id;
    const imagePath = `reports/${cycleId}/${input.recipientId}/${objectId}.${extensionByMimeType[input.image.mimeType]}`;

    await storage.upload({
      path: imagePath,
      bytes: input.image.bytes,
      contentType: input.image.mimeType,
    });

    try {
      if (reportToReplace) {
        const existing = await repository.findById(reportToReplace.id);
        if (!existing) throw new ReportNotFoundError();
        const replaced = await repository.replace(existing.id, {
          reportDate: input.reportDate,
          income: input.income,
          note: input.note,
          imagePath,
          imageHash: checked.imageHash,
          ...auditValues(input.audit),
        });
        if (!replaced) throw new ReportNotFoundError();

        let cleanupWarning = false;
        try {
          await storage.remove(existing.imagePath);
        } catch {
          cleanupWarning = true;
          logger.error(
            '[reports] old screenshot cleanup failed after replacement',
          );
        }
        return { report: replaced, replaced: true, cleanupWarning };
      }

      const reportId = createId();
      const report = await repository.create({
        id: reportId,
        recipientId: input.recipientId,
        cycleId: checked.cycle.id,
        reportDate: input.reportDate,
        income: input.income,
        note: input.note,
        imagePath,
        imageHash: checked.imageHash,
        ...auditValues(input.audit),
      });
      return { report, replaced: false, cleanupWarning: false };
    } catch (error) {
      try {
        await storage.remove(imagePath);
      } catch {
        logger.error(
          '[reports] new screenshot cleanup failed after database failure',
        );
      }
      throw error;
    }
  }

  async function listReportsForRecipient(recipientId: string) {
    const recipient = await repository.findRecipientById(recipientId);
    if (!recipient) throw new ReportRecipientNotFoundError();
    return repository.listForRecipient(recipientId);
  }

  function listReportCountsForCycle(cycleId: string) {
    return repository.listCountsForCycle(cycleId);
  }

  async function updateReport(reportId: string, input: EditReportInput) {
    const report = await repository.updateMetadata(reportId, input);
    if (!report) throw new ReportNotFoundError();
    return report;
  }

  async function deleteReport(reportId: string) {
    const report = await repository.findById(reportId);
    if (!report) throw new ReportNotFoundError();
    await storage.remove(report.imagePath);
    const deleted = await repository.delete(report.id);
    if (!deleted) {
      logger.error('[reports] database delete failed after screenshot removal');
      throw new ReportNotFoundError();
    }
    return report;
  }

  return {
    checkReport,
    saveReport,
    listReportsForRecipient,
    listReportCountsForCycle,
    updateReport,
    deleteReport,
  };
}

export type ReportService = ReturnType<typeof createReportService>;
