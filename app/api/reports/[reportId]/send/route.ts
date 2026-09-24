import { NextResponse } from 'next/server';

import { deliverReport } from '@/server/whatsapp';
import { withWhatsAppApiSession } from '@/server/whatsapp/api';
import { parseWhatsAppReportId } from '@/server/whatsapp/validation';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  return withWhatsAppApiSession(request, async () => {
    const { reportId } = await params;
    const data = await deliverReport(parseWhatsAppReportId(reportId), 'send');
    return NextResponse.json({ data });
  });
}
