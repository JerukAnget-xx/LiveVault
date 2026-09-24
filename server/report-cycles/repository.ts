import 'server-only';

import { and, desc, eq, max, sql } from 'drizzle-orm';

import { db } from '@/db';
import { reportCycles, resetLogs } from '@/db/schema';

import {
  ReportCycleConflictError,
  ReportCycleDatabaseError,
  ReportCycleUnavailableError,
} from './errors';
import type { ReportCycleRepository } from './types';

// Stable application-specific key for transaction-scoped cycle serialization.
const REPORT_CYCLE_ADVISORY_LOCK = 1_928_601_117;

function postgresErrorCode(error: unknown): string | null {
  const directCode =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : null;

  if (directCode) return directCode;

  return typeof error === 'object' &&
    error !== null &&
    'cause' in error &&
    error.cause !== error
    ? postgresErrorCode(error.cause)
    : null;
}

function isDomainError(error: unknown) {
  return (
    error instanceof ReportCycleConflictError ||
    error instanceof ReportCycleUnavailableError
  );
}

export const reportCycleRepository: ReportCycleRepository = {
  async getOrCreateActive({ adminUserId, now }) {
    try {
      return await db.transaction(async (transaction) => {
        await transaction.execute(
          sql`select pg_advisory_xact_lock(${REPORT_CYCLE_ADVISORY_LOCK})`,
        );

        const [activeCycle] = await transaction
          .select()
          .from(reportCycles)
          .where(eq(reportCycles.isActive, true))
          .orderBy(desc(reportCycles.cycleNumber))
          .limit(1);

        if (activeCycle) return activeCycle;

        const [cycleState] = await transaction
          .select({ highestCycleNumber: max(reportCycles.cycleNumber) })
          .from(reportCycles);

        if (typeof cycleState?.highestCycleNumber === 'number') {
          throw new ReportCycleUnavailableError();
        }

        const [firstCycle] = await transaction
          .insert(reportCycles)
          .values({
            cycleNumber: 1,
            startedAt: now,
            endedAt: null,
            isActive: true,
            createdBy: adminUserId,
          })
          .returning();

        if (!firstCycle) throw new ReportCycleDatabaseError();
        return firstCycle;
      });
    } catch (error) {
      if (isDomainError(error)) throw error;
      if (postgresErrorCode(error) === '23505') {
        throw new ReportCycleConflictError();
      }
      throw new ReportCycleDatabaseError();
    }
  },

  async reset({ adminUserId, expectedCycleId, now }) {
    try {
      return await db.transaction(async (transaction) => {
        const lockResult = await transaction.execute<{
          acquired: boolean;
        }>(
          sql`select pg_try_advisory_xact_lock(${REPORT_CYCLE_ADVISORY_LOCK}) as acquired`,
        );

        if (!lockResult.rows[0]?.acquired) {
          throw new ReportCycleConflictError();
        }

        const [activeCycle] = await transaction
          .select()
          .from(reportCycles)
          .where(eq(reportCycles.isActive, true))
          .orderBy(desc(reportCycles.cycleNumber))
          .limit(1)
          .for('update');

        if (!activeCycle) throw new ReportCycleUnavailableError();
        if (activeCycle.id !== expectedCycleId) {
          throw new ReportCycleConflictError();
        }

        const [archivedCycle] = await transaction
          .update(reportCycles)
          .set({ isActive: false, endedAt: now })
          .where(
            and(
              eq(reportCycles.id, activeCycle.id),
              eq(reportCycles.isActive, true),
            ),
          )
          .returning({ id: reportCycles.id });

        if (!archivedCycle) throw new ReportCycleConflictError();

        const [newCycle] = await transaction
          .insert(reportCycles)
          .values({
            cycleNumber: activeCycle.cycleNumber + 1,
            startedAt: now,
            endedAt: null,
            isActive: true,
            createdBy: adminUserId,
          })
          .returning();

        if (!newCycle) throw new ReportCycleDatabaseError();

        await transaction.insert(resetLogs).values({
          previousCycleId: activeCycle.id,
          newCycleId: newCycle.id,
          performedBy: adminUserId,
          resetAt: now,
        });

        return newCycle;
      });
    } catch (error) {
      if (isDomainError(error)) throw error;
      if (postgresErrorCode(error) === '23505') {
        throw new ReportCycleConflictError();
      }
      throw new ReportCycleDatabaseError();
    }
  },
};
