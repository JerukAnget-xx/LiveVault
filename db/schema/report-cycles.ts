import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { user } from './auth';

export const reportCycles = pgTable(
  'report_cycles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    cycleNumber: integer('cycle_number').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    isActive: boolean('is_active').default(true).notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('report_cycles_cycle_number_uidx').on(table.cycleNumber),
    uniqueIndex('report_cycles_single_active_uidx')
      .on(table.isActive)
      .where(sql`${table.isActive} = true`),
    index('report_cycles_created_by_idx').on(table.createdBy),
    check('report_cycles_cycle_number_positive', sql`${table.cycleNumber} > 0`),
  ],
);
