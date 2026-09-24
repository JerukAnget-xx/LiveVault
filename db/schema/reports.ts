import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { recipients } from './recipients';
import { reportCycles } from './report-cycles';

export const reportWhatsappStatusEnum = pgEnum('report_whatsapp_status', [
  'not_sent',
  'queued',
  'sending',
  'sent',
  'failed',
]);

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => recipients.id),
    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => reportCycles.id),
    reportDate: date('report_date').notNull(),
    income: integer('income').notNull(),
    note: text('note'),
    imagePath: text('image_path').notNull(),
    imageHash: text('image_hash').notNull(),
    aiDetectedIncome: integer('ai_detected_income'),
    aiDetectedDate: date('ai_detected_date'),
    aiConfidence: numeric('ai_confidence', { precision: 5, scale: 4 }),
    aiRawResponse: jsonb('ai_raw_response'),
    whatsappStatus: reportWhatsappStatusEnum('whatsapp_status')
      .default('not_sent')
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('reports_recipient_id_idx').on(table.recipientId),
    index('reports_cycle_id_idx').on(table.cycleId),
    index('reports_report_date_idx').on(table.reportDate),
    index('reports_image_hash_idx').on(table.imageHash),
    index('reports_recipient_cycle_idx').on(table.recipientId, table.cycleId),
    index('reports_recipient_report_date_idx').on(
      table.recipientId,
      table.reportDate,
    ),
    check(
      'reports_ai_confidence_range',
      sql`${table.aiConfidence} is null or (${table.aiConfidence} >= 0 and ${table.aiConfidence} <= 1)`,
    ),
  ],
);
