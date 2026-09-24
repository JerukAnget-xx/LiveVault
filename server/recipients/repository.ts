import 'server-only';

import { asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { recipients } from '@/db/schema';
import type {
  CreateRecipientInput,
  RecipientRepository,
  UpdateRecipientInput,
} from '@/server/recipients/types';

export class RecipientDatabaseError extends Error {
  constructor() {
    super('Recipient database operation failed');
    this.name = 'RecipientDatabaseError';
  }
}

async function runDatabaseOperation<Result>(
  operation: () => Promise<Result>,
): Promise<Result> {
  try {
    return await operation();
  } catch {
    throw new RecipientDatabaseError();
  }
}

export const recipientRepository: RecipientRepository = {
  list: (options) =>
    runDatabaseOperation(() =>
      db
        .select()
        .from(recipients)
        .where(options.activeOnly ? eq(recipients.isActive, true) : undefined)
        .orderBy(
          asc(recipients.name),
          asc(recipients.createdAt),
          asc(recipients.id),
        ),
    ),

  findById: (recipientId) =>
    runDatabaseOperation(async () => {
      const [recipient] = await db
        .select()
        .from(recipients)
        .where(eq(recipients.id, recipientId))
        .limit(1);

      return recipient ?? null;
    }),

  create: (input: CreateRecipientInput) =>
    runDatabaseOperation(async () => {
      const [recipient] = await db.insert(recipients).values(input).returning();

      if (!recipient) throw new RecipientDatabaseError();
      return recipient;
    }),

  update: (recipientId: string, input: UpdateRecipientInput) =>
    runDatabaseOperation(async () => {
      const [recipient] = await db
        .update(recipients)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(recipients.id, recipientId))
        .returning();

      return recipient ?? null;
    }),
};
