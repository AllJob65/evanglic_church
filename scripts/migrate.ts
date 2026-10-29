import dotenv from 'dotenv';
dotenv.config();

import { runMigrations, testConnection, closePool } from '../server/pg';

async function main() {
  console.log('====================================================');
  console.log(' CMMS PostgreSQL Database Migration Runner');
  console.log('====================================================');

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not defined.');
    console.error('Please configure DATABASE_URL in your .env file or environment.');
    console.error('Example: postgres://user:pass@localhost:5432/cmms');
    process.exit(1);
  }

  console.log('Checking database connection...');
  const conn = await testConnection();
  if (!conn.ok) {
    console.error(`Connection failed: ${conn.message}`);
    process.exit(1);
  }

  console.log(`Connected to database '${conn.database || 'default'}' (${conn.latencyMs}ms latency)`);
  console.log('Running pending migrations from server/migrations/ in numerical order...');

  const result = await runMigrations();

  if (result.skipped.length > 0) {
    console.log(`[Migrations] Already applied (${result.skipped.length}):`);
    result.skipped.forEach((f) => console.log(`  - ${f}`));
  }

  if (result.applied.length > 0) {
    console.log(`[Migrations] Successfully executed (${result.applied.length}):`);
    result.applied.forEach((f) => console.log(`  + ${f}`));
  } else if (result.skipped.length > 0 && result.success) {
    console.log('[Migrations] Database schema is already up to date. No new migrations.');
  }

  if (!result.success) {
    console.error(`\n[Migrations FAILED]: ${result.error}`);
    await closePool();
    process.exit(1);
  }

  console.log('\nAll migrations completed successfully.');
  await closePool();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Unexpected migration execution error:', err);
  await closePool();
  process.exit(1);
});
