import 'server-only';

import { NextResponse } from 'next/server';

import { requireApiSession } from '@/server/auth';

import { classifyReportError } from './http';

export async function withReportApiSession(
  request: Request,
  operation: (
    session: Awaited<ReturnType<typeof requireApiSession>>,
  ) => Promise<Response>,
) {
  try {
    const session = await requireApiSession(request.headers);
    return await operation(session);
  } catch (error) {
    const response = classifyReportError(error);
    if (response.status >= 500) {
      console.error('[reports] request failed', {
        type: error instanceof Error ? error.name : 'UnknownError',
      });
    }
    return NextResponse.json(
      {
        error: {
          code: response.code,
          message: response.message,
          ...('duplicateImages' in response
            ? {
                duplicateImages: response.duplicateImages,
                duplicateDates: response.duplicateDates,
              }
            : {}),
        },
      },
      { status: response.status },
    );
  }
}
