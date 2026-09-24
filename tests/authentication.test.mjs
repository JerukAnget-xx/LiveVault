import assert from 'node:assert/strict';
import test from 'node:test';

import { runEmailSignIn, runSignOut } from '../lib/auth-flow.ts';
import { emailAndPasswordOptions } from '../lib/auth-policy.ts';
import {
  AuthenticationRequiredError,
  requireValidSession,
} from '../server/auth/session-policy.ts';

const credentials = {
  email: 'admin@example.com',
  password: 'correct-password',
  rememberMe: true,
};

test('public email signup is disabled while email login remains enabled', () => {
  assert.deepEqual(emailAndPasswordOptions, {
    enabled: true,
    disableSignUp: true,
  });
});

test('incorrect login returns a safe unsuccessful result', async () => {
  const signedIn = await runEmailSignIn(
    async () => ({ error: { code: 'INVALID_EMAIL_OR_PASSWORD' } }),
    credentials,
  );

  assert.equal(signedIn, false);
});

test('successful login forwards credentials and rememberMe', async () => {
  let receivedCredentials;
  const signedIn = await runEmailSignIn(async (input) => {
    receivedCredentials = input;
    return { error: null };
  }, credentials);

  assert.equal(signedIn, true);
  assert.deepEqual(receivedCredentials, credentials);
});

test('logout invokes Better Auth and succeeds without an error', async () => {
  let calls = 0;
  const signedOut = await runSignOut(async () => {
    calls += 1;
    return { error: null };
  });

  assert.equal(signedOut, true);
  assert.equal(calls, 1);
});

test('unauthenticated protected-page access is rejected', async () => {
  await assert.rejects(
    () => requireValidSession(async () => null),
    AuthenticationRequiredError,
  );
});

test('authenticated protected-page access returns the validated session', async () => {
  const session = { session: { id: 'session-id' }, user: { id: 'user-id' } };

  assert.equal(await requireValidSession(async () => session), session);
});
