import { z } from 'zod';

const requiredTrimmedText = z.string().trim().min(1);

export const whatsappNumberSchema = z
  .string()
  .min(8)
  .max(15)
  .regex(/^62[0-9]+$/, {
    message:
      'WhatsApp number must contain digits only and begin with Indonesian country code 62.',
  });

export const createRecipientSchema = z
  .object({
    name: requiredTrimmedText,
    whatsappNumber: whatsappNumberSchema,
    reportTitle: requiredTrimmedText,
    isActive: z.boolean().optional().default(true),
  })
  .strict();

export const updateRecipientSchema = z
  .object({
    name: requiredTrimmedText,
    whatsappNumber: whatsappNumberSchema,
    reportTitle: requiredTrimmedText,
    isActive: z.boolean(),
  })
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one recipient field is required.',
  });

const recipientIdSchema = z.uuid();
const listRecipientsQuerySchema = z
  .object({
    activeOnly: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional()
      .default(false),
  })
  .strict();

export type RecipientValidationCode =
  | 'INVALID_JSON'
  | 'INVALID_QUERY'
  | 'INVALID_RECIPIENT'
  | 'INVALID_RECIPIENT_ID';

export type RecipientValidationIssue = {
  field: string;
  message: string;
};

export class RecipientValidationError extends Error {
  readonly code: RecipientValidationCode;
  readonly issues: RecipientValidationIssue[];

  constructor(
    code: RecipientValidationCode,
    message: string,
    issues: RecipientValidationIssue[] = [],
  ) {
    super(message);
    this.name = 'RecipientValidationError';
    this.code = code;
    this.issues = issues;
  }
}

function issuesFromZod(error: z.ZodError): RecipientValidationIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'request',
    message: issue.message,
  }));
}

export function parseRecipientId(value: string): string {
  const result = recipientIdSchema.safeParse(value);

  if (!result.success) {
    throw new RecipientValidationError(
      'INVALID_RECIPIENT_ID',
      'Recipient ID must be a valid UUID.',
    );
  }

  return result.data;
}

export function parseCreateRecipient(input: unknown) {
  const result = createRecipientSchema.safeParse(input);

  if (!result.success) {
    throw new RecipientValidationError(
      'INVALID_RECIPIENT',
      'Recipient data is invalid.',
      issuesFromZod(result.error),
    );
  }

  return result.data;
}

export function parseUpdateRecipient(input: unknown) {
  const result = updateRecipientSchema.safeParse(input);

  if (!result.success) {
    throw new RecipientValidationError(
      'INVALID_RECIPIENT',
      'Recipient data is invalid.',
      issuesFromZod(result.error),
    );
  }

  return result.data;
}

export function parseListRecipientsQuery(searchParams: URLSearchParams) {
  const result = listRecipientsQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  );

  if (!result.success) {
    throw new RecipientValidationError(
      'INVALID_QUERY',
      'Recipient query is invalid.',
      issuesFromZod(result.error),
    );
  }

  return result.data;
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new RecipientValidationError(
      'INVALID_JSON',
      'Request body must contain valid JSON.',
    );
  }
}
