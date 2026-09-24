import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const recipients = pgTable('recipients', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  whatsappNumber: text('whatsapp_number').notNull(),
  reportTitle: text('report_title').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
