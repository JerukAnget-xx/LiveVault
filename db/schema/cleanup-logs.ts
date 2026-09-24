import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const cleanupStatusEnum = pgEnum('cleanup_status', [
  'running',
  'success',
  'failed',
]);

export const cleanupLogs = pgTable(
  'cleanup_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    retentionBoundary: date('retention_boundary').notNull(),
    deletedReportsCount: integer('deleted_reports_count').default(0).notNull(),
    deletedImagesCount: integer('deleted_images_count').default(0).notNull(),
    status: cleanupStatusEnum('status').default('running').notNull(),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('cleanup_logs_retention_boundary_idx').on(table.retentionBoundary),
    check(
      'cleanup_logs_deleted_reports_count_nonnegative',
      sql`${table.deletedReportsCount} >= 0`,
    ),
    check(
      'cleanup_logs_deleted_images_count_nonnegative',
      sql`${table.deletedImagesCount} >= 0`,
    ),
  ],
);
