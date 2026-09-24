import { NextResponse } from 'next/server';

import { getActiveReportCycle } from '@/server/report-cycles';
import { withReportCycleApiSession } from '@/server/report-cycles/api';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return withReportCycleApiSession(request, async ({ user }) => {
    const data = await getActiveReportCycle(user.id);
    return NextResponse.json({ data });
  });
}
