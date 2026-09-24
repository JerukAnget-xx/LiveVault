import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import {
  AuthenticationRequiredError,
  requireValidSession,
} from '@/server/auth/session-policy';

export { AuthenticationRequiredError } from '@/server/auth/session-policy';

export async function getServerSession(requestHeaders?: Headers) {
  return auth.api.getSession({
    headers: requestHeaders ?? (await headers()),
  });
}

/**
 * Required at the start of every sensitive Server Action and protected page.
 * It validates the session with Better Auth instead of trusting cookie presence.
 */
export async function requireSession() {
  try {
    return await requireValidSession(() => getServerSession());
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect('/login');
    }

    throw error;
  }
}

/**
 * Every sensitive Route Handler must call this with request.headers and return
 * HTTP 401 when AuthenticationRequiredError is thrown.
 */
export async function requireApiSession(requestHeaders: Headers) {
  return requireValidSession(() => getServerSession(requestHeaders));
}
