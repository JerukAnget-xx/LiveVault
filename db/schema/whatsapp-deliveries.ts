import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { reports } from './reports';

export const whatsappDeliveryStatusEnum = pgEnum('whatsapp_delivery_status', [
  'queued',
  'sending',
  'sent',
  'failed',
]);

export const whatsappDeliveries = pgTable(
  'whatsapp_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    attemptNumber: integer('attempt_number').notNull(),
    messageId: text('message_id'),
    status: whatsappDeliveryStatusEnum('status').default('queued').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('whatsapp_deliveries_report_id_idx').on(table.reportId),
    uniqueIndex('whatsapp_deliveries_report_attempt_uidx').on(
      table.reportId,
      table.attemptNumber,
    ),
    check(
      'whatsapp_deliveries_attempt_number_positive',
      sql`${table.attemptNumber} > 0`,
    ),
  ],
);
