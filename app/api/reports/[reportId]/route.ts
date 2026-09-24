import { NextResponse } from 'next/server';

import { deleteReport, updateReport } from '@/server/reports';
import { withReportApiSession } from '@/server/reports/api';
import { parseEditReport, parseReportId } from '@/server/reports/validation';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ reportId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return withReportApiSession(request, async () => {
    const { reportId } = await context.params;
    const data = await updateReport(
      parseReportId(reportId),
      parseEditReport(await request.json()),
    );
    return NextResponse.json({ data });
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return withReportApiSession(request, async () => {
    const { reportId } = await context.params;
    await deleteReport(parseReportId(reportId));
    return new NextResponse(null, { status: 204 });
  });
}
