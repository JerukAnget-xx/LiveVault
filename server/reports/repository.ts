import 'server-only';

import { and, count, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { recipients, reportCycles, reports } from '@/db/schema';

import { ReportDatabaseError } from './errors';
import type { ReportRepository } from './types';

async function databaseOperation<Result>(operation: () => Promise<Result>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ReportDatabaseError) throw error;
    throw new ReportDatabaseError();
  }
}

const reportSummary = {
  id: reports.id,
  recipientId: reports.recipientId,
  cycleId: reports.cycleId,
  reportDate: reports.reportDate,
  income: reports.income,
  note: reports.note,
  createdAt: reports.createdAt,
};

export const reportRepository: ReportRepository = {
  findRecipientById: (recipientId) =>
    databaseOperation(async () => {
      const [recipient] = await db
        .select({ id: recipients.id, isActive: recipients.isActive })
        .from(recipients)
        .where(eq(recipients.id, recipientId))
        .limit(1);
      return recipient ?? null;
    }),

  findById: (reportId) =>
    databaseOperation(async () => {
      const [report] = await db
        .select()
        .from(reports)
        .where(eq(reports.id, reportId))
        .limit(1);
      return report ?? null;
    }),

  findByImageHash: (imageHash) =>
    databaseOperation(() =>
      db
        .select(reportSummary)
        .from(reports)
        .where(eq(reports.imageHash, imageHash))
        .orderBy(desc(reports.createdAt), desc(reports.id)),
    ),

  findByRecipientDate: (recipientId, reportDate) =>
    databaseOperation(() =>
      db
        .select(reportSummary)
        .from(reports)
        .where(
          and(
            eq(reports.recipientId, recipientId),
            eq(reports.reportDate, reportDate),
          ),
        )
        .orderBy(desc(reports.createdAt), desc(reports.id)),
    ),

  listForRecipient: (recipientId) =>
    databaseOperation(() =>
      db
        .select({
          id: reports.id,
          recipientId: reports.recipientId,
          cycleId: reports.cycleId,
          reportDate: reports.reportDate,
          income: reports.income,
          note: reports.note,
          imagePath: reports.imagePath,
          imageHash: reports.imageHash,
          aiDetectedIncome: reports.aiDetectedIncome,
          aiDetectedDate: reports.aiDetectedDate,
          aiConfidence: reports.aiConfidence,
          aiRawResponse: reports.aiRawResponse,
          whatsappStatus: reports.whatsappStatus,
          createdAt: reports.createdAt,
          updatedAt: reports.updatedAt,
          cycleNumber: reportCycles.cycleNumber,
          cycleStartedAt: reportCycles.startedAt,
          cycleEndedAt: reportCycles.endedAt,
          cycleIsActive: reportCycles.isActive,
        })
        .from(reports)
        .innerJoin(reportCycles, eq(reports.cycleId, reportCycles.id))
        .where(eq(reports.recipientId, recipientId))
        .orderBy(
          desc(reportCycles.cycleNumber),
          desc(reports.reportDate),
          desc(reports.createdAt),
        ),
    ),

  listCountsForCycle: (cycleId) =>
    databaseOperation(() =>
      db
        .select({ recipientId: reports.recipientId, count: count() })
        .from(reports)
        .where(eq(reports.cycleId, cycleId))
        .groupBy(reports.recipientId),
    ),

  create: (values) =>
    databaseOperation(async () => {
      const [report] = await db.insert(reports).values(values).returning();
      if (!report) throw new ReportDatabaseError();
      return report;
    }),

  replace: (reportId, values) =>
    databaseOperation(async () => {
      const [report] = await db
        .update(reports)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(reports.id, reportId))
        .returning();
      return report ?? null;
    }),

  updateMetadata: (reportId, values) =>
    databaseOperation(async () => {
      const [report] = await db
        .update(reports)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(reports.id, reportId))
        .returning();
      return report ?? null;
    }),

  delete: (reportId) =>
    databaseOperation(async () => {
      const deleted = await db
        .delete(reports)
        .where(eq(reports.id, reportId))
        .returning({ id: reports.id });
      return deleted.length > 0;
    }),
};
