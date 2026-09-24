export type EmailSignInCredentials = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type AuthOperationResult = {
  error?: unknown;
};

export async function runEmailSignIn(
  signInEmail: (
    credentials: EmailSignInCredentials,
  ) => Promise<AuthOperationResult>,
  credentials: EmailSignInCredentials,
): Promise<boolean> {
  const result = await signInEmail(credentials);
  return !result.error;
}

export async function runSignOut(
  signOut: () => Promise<AuthOperationResult>,
): Promise<boolean> {
  const result = await signOut();
  return !result.error;
}
