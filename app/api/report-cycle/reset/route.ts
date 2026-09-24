import { NextResponse } from 'next/server';

import { resetReportCycle } from '@/server/report-cycles';
import { withReportCycleApiSession } from '@/server/report-cycles/api';
import { parseResetReportCycleRequest } from '@/server/report-cycles/validation';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return withReportCycleApiSession(request, async ({ user }) => {
    const { expectedCycleId } = await parseResetReportCycleRequest(request);
    const data = await resetReportCycle(user.id, expectedCycleId);
    return NextResponse.json({ data });
  });
}
