import { NextRequest, NextResponse } from 'next/server';

import { getRecipientById, updateRecipient } from '@/server/recipients';
import { withRecipientApiSession } from '@/server/recipients/api';
import {
  parseJsonBody,
  parseRecipientId,
  parseUpdateRecipient,
} from '@/server/recipients/validation';

export const runtime = 'nodejs';

type RecipientRouteContext = {
  params: Promise<{ recipientId: string }>;
};

export async function GET(
  request: NextRequest,
  context: RecipientRouteContext,
) {
  return withRecipientApiSession(request, async () => {
    const { recipientId: rawRecipientId } = await context.params;
    const recipientId = parseRecipientId(rawRecipientId);
    const data = await getRecipientById(recipientId);

    return NextResponse.json({ data });
  });
}

export async function PATCH(
  request: NextRequest,
  context: RecipientRouteContext,
) {
  return withRecipientApiSession(request, async () => {
    const { recipientId: rawRecipientId } = await context.params;
    const recipientId = parseRecipientId(rawRecipientId);
    const input = parseUpdateRecipient(await parseJsonBody(request));
    const data = await updateRecipient(recipientId, input);

    return NextResponse.json({ data });
  });
}
