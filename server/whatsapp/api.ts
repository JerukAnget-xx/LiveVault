import 'server-only';

import { NextResponse } from 'next/server';

import { requireApiSession } from '@/server/auth';

import { classifyWhatsAppError } from './http';

export async function withWhatsAppApiSession(
  request: Request,
  operation: () => Promise<Response>,
) {
  try {
    await requireApiSession(request.headers);
    return await operation();
  } catch (error) {
    const result = classifyWhatsAppError(error);
    if (result.status >= 500) {
      console.error('[whatsapp] delivery request failed', {
        type: error instanceof Error ? error.name : 'UnknownError',
        code:
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          typeof error.code === 'string'
            ? error.code
            : undefined,
      });
    }
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: result.status },
    );
  }
}
