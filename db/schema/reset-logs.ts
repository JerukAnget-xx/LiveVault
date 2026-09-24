import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { user } from './auth';
import { reportCycles } from './report-cycles';

export const resetLogs = pgTable(
  'reset_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    previousCycleId: uuid('previous_cycle_id')
      .notNull()
      .references(() => reportCycles.id),
    newCycleId: uuid('new_cycle_id')
      .notNull()
      .references(() => reportCycles.id),
    performedBy: text('performed_by')
      .notNull()
      .references(() => user.id),
    resetAt: timestamp('reset_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('reset_logs_previous_cycle_id_idx').on(table.previousCycleId),
    index('reset_logs_new_cycle_id_idx').on(table.newCycleId),
    index('reset_logs_performed_by_idx').on(table.performedBy),
    check(
      'reset_logs_distinct_cycles',
      sql`${table.previousCycleId} <> ${table.newCycleId}`,
    ),
  ],
);
