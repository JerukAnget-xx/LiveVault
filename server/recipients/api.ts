import 'server-only';

import { NextResponse } from 'next/server';

import { AuthenticationRequiredError, requireApiSession } from '@/server/auth';
import { RecipientDatabaseError } from '@/server/recipients/repository';
import { RecipientNotFoundError } from '@/server/recipients/service';
import { RecipientValidationError } from '@/server/recipients/validation';

function errorResponse(
  status: number,
  code: string,
  message: string,
  issues?: RecipientValidationError['issues'],
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(issues?.length ? { issues } : {}),
      },
    },
    { status },
  );
}

function recipientApiError(error: unknown) {
  if (error instanceof AuthenticationRequiredError) {
    return errorResponse(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication is required.',
    );
  }

  if (error instanceof RecipientValidationError) {
    return errorResponse(400, error.code, error.message, error.issues);
  }

  if (error instanceof RecipientNotFoundError) {
    return errorResponse(404, 'RECIPIENT_NOT_FOUND', 'Recipient not found.');
  }

  if (error instanceof RecipientDatabaseError) {
    return errorResponse(
      500,
      'DATABASE_ERROR',
      'The recipient operation could not be completed.',
    );
  }

  return errorResponse(
    500,
    'INTERNAL_ERROR',
    'The recipient operation could not be completed.',
  );
}

export async function withRecipientApiSession(
  request: Request,
  operation: () => Promise<Response>,
) {
  try {
    await requireApiSession(request.headers);
    return await operation();
  } catch (error) {
    return recipientApiError(error);
  }
}
