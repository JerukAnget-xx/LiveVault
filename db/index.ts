import 'server-only';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { getServerEnv } from '@/lib/env';

import * as schema from './schema';

const globalForDatabase = globalThis as typeof globalThis & {
  liveVaultPool?: Pool;
};

const pool =
  globalForDatabase.liveVaultPool ??
  new Pool({
    connectionString: getServerEnv().DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.liveVaultPool = pool;
}

export const db = drizzle({
  client: pool,
  schema,
});

export { pool as databasePool };
