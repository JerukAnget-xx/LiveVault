import { NextResponse } from 'next/server';

import { checkReport } from '@/server/reports';
import { withReportApiSession } from '@/server/reports/api';
import { parseReportFormData } from '@/server/reports/validation';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return withReportApiSession(request, async ({ user }) => {
    const input = await parseReportFormData(await request.formData());
    const data = await checkReport(input, user.id);
    return NextResponse.json({ data });
  });
}
