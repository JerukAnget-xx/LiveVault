import { NextRequest, NextResponse } from 'next/server';

import { createRecipient, listRecipients } from '@/server/recipients';
import { withRecipientApiSession } from '@/server/recipients/api';
import {
  parseCreateRecipient,
  parseJsonBody,
  parseListRecipientsQuery,
} from '@/server/recipients/validation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return withRecipientApiSession(request, async () => {
    const options = parseListRecipientsQuery(request.nextUrl.searchParams);
    const data = await listRecipients(options);

    return NextResponse.json({ data });
  });
}

export async function POST(request: NextRequest) {
  return withRecipientApiSession(request, async () => {
    const input = parseCreateRecipient(await parseJsonBody(request));
    const data = await createRecipient(input);

    return NextResponse.json({ data }, { status: 201 });
  });
}
