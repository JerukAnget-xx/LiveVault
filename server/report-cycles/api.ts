import 'server-only';

import { NextResponse } from 'next/server';

import { requireApiSession } from '@/server/auth';

import { classifyReportCycleError } from './http';

export async function withReportCycleApiSession(
  request: Request,
  operation: (
    session: Awaited<ReturnType<typeof requireApiSession>>,
  ) => Promise<Response>,
) {
  try {
    const session = await requireApiSession(request.headers);
    return await operation(session);
  } catch (error) {
    const response = classifyReportCycleError(error);
    return NextResponse.json(
      { error: { code: response.code, message: response.message } },
      { status: response.status },
    );
  }
}
