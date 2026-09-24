import { relations } from 'drizzle-orm';

import { account, session, user } from './auth';
import { recipients } from './recipients';
import { reportCycles } from './report-cycles';
import { reports } from './reports';
import { resetLogs } from './reset-logs';
import { whatsappDeliveries } from './whatsapp-deliveries';

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  reportCyclesCreated: many(reportCycles, { relationName: 'cycleCreator' }),
  resetsPerformed: many(resetLogs, { relationName: 'resetPerformer' }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const recipientRelations = relations(recipients, ({ many }) => ({
  reports: many(reports),
}));

export const reportCycleRelations = relations(
  reportCycles,
  ({ one, many }) => ({
    creator: one(user, {
      fields: [reportCycles.createdBy],
      references: [user.id],
      relationName: 'cycleCreator',
    }),
    reports: many(reports),
    previousCycleResetLogs: many(resetLogs, {
      relationName: 'previousResetCycle',
    }),
    newCycleResetLogs: many(resetLogs, { relationName: 'newResetCycle' }),
  }),
);

export const reportRelations = relations(reports, ({ one, many }) => ({
  recipient: one(recipients, {
    fields: [reports.recipientId],
    references: [recipients.id],
  }),
  cycle: one(reportCycles, {
    fields: [reports.cycleId],
    references: [reportCycles.id],
  }),
  whatsappDeliveries: many(whatsappDeliveries),
}));

export const whatsappDeliveryRelations = relations(
  whatsappDeliveries,
  ({ one }) => ({
    report: one(reports, {
      fields: [whatsappDeliveries.reportId],
      references: [reports.id],
    }),
  }),
);

export const resetLogRelations = relations(resetLogs, ({ one }) => ({
  previousCycle: one(reportCycles, {
    fields: [resetLogs.previousCycleId],
    references: [reportCycles.id],
    relationName: 'previousResetCycle',
  }),
  newCycle: one(reportCycles, {
    fields: [resetLogs.newCycleId],
    references: [reportCycles.id],
    relationName: 'newResetCycle',
  }),
  performer: one(user, {
    fields: [resetLogs.performedBy],
    references: [user.id],
    relationName: 'resetPerformer',
  }),
}));
