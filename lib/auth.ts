import 'server-only';

import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';

import { db } from '@/db';
import { account, session, user, verification } from '@/db/schema';
import { emailAndPasswordOptions } from '@/lib/auth-policy';
import { getServerEnv } from '@/lib/env';

const env = getServerEnv();

export const auth = betterAuth({
  appName: 'Live.Vault',
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: emailAndPasswordOptions,
});
