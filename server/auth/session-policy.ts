export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthenticationRequiredError';
  }
}

export async function requireValidSession<Session>(
  loadSession: () => Promise<Session | null | undefined>,
): Promise<Session> {
  const session = await loadSession();

  if (!session) {
    throw new AuthenticationRequiredError();
  }

  return session;
}
