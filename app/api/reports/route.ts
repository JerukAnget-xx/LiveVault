import { NextResponse } from 'next/server';

import { saveReport } from '@/server/reports';
import { withReportApiSession } from '@/server/reports/api';
import {
  parseReportFormData,
  parseSaveDecisions,
} from '@/server/reports/validation';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return withReportApiSession(request, async ({ user }) => {
    const formData = await request.formData();
    const prepared = await parseReportFormData(formData);
    const input = parseSaveDecisions(formData, prepared);
    const data = await saveReport(input, user.id);
    return NextResponse.json({ data }, { status: data.replaced ? 200 : 201 });
  });
}
