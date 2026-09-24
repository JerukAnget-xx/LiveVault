import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.local', quiet: true });

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Database connection failed: DATABASE_URL is not configured.');
  process.exitCode = 1;
} else {
  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
    max: 1,
  });
  const db = drizzle({ client: pool });
  let connectionSuccessful = false;

  try {
    await db.execute(sql.raw('SELECT 1'));
    connectionSuccessful = true;
  } catch {
    console.error(
      'Database connection failed. Verify that PostgreSQL is reachable and DATABASE_URL is valid.',
    );
    process.exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch {
      console.error(
        'Database connection check failed while closing the connection.',
      );
      process.exitCode = 1;
    }
  }

  if (connectionSuccessful && process.exitCode !== 1) {
    console.log('Database connection successful.');
  }
}
