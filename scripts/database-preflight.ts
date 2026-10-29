/**
 * Read-only PostgreSQL preflight for the CMMS JSON-to-PostgreSQL migration.
 *
 * This script never creates tables, modifies records, or imports JSON data.
 * It reports whether the target database has the minimum schema and tenant
 * security structures expected by the current PostgreSQL schema.
 */
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { closePool, query, testConnection } from '../server/pg';

const REQUIRED_TABLES = [
  'tenants', 'branches', 'profiles', 'members', 'families', 'ministries',
  'ministry_members', 'attendance_records', 'pastoral_records',
  'financial_transactions', 'workflow_requests', 'events', 'volunteer_shifts',
  'assets', 'documents', 'lms_courses', 'audit_logs',
] as const;

const REQUIRED_COLUMNS: Record<string, readonly string[]> = {
  members: ['id', 'tenant_id', 'branch_id', 'member_number', 'first_name', 'last_name', 'gender', 'membership_status'],
  profiles: ['id', 'tenant_id', 'branch_id', 'role', 'status'],
  families: ['id', 'tenant_id', 'family_code', 'household_name', 'member_ids'],
  ministries: ['id', 'tenant_id', 'branch_id', 'name'],
  attendance_records: ['id', 'tenant_id', 'branch_id', 'member_id', 'checkin_time'],
  workflow_requests: ['id', 'tenant_id', 'branch_id', 'request_code', 'requester_email', 'status'],
  financial_transactions: ['id', 'tenant_id', 'branch_id', 'amount', 'transaction_type'],
  pastoral_records: ['id', 'tenant_id', 'branch_id', 'category', 'confidentiality'],
  events: ['id', 'tenant_id', 'branch_id', 'title', 'start_date'],
  volunteer_shifts: ['id', 'tenant_id', 'volunteer_member_id', 'ministry_id'],
  audit_logs: ['id', 'tenant_id', 'action', 'module', 'details', 'created_at'],
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured. No database was inspected.');
  }

  const connection = await testConnection();
  if (!connection.ok) {
    throw new Error(connection.message);
  }

  console.log('CMMS PostgreSQL migration preflight (READ ONLY)');
  console.log(`Connected database: ${connection.database || 'unknown'}`);
  console.log(`Connection latency: ${connection.latencyMs ?? 'unknown'} ms`);

  const schemaResult = await query<{ table_name: string }>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'`
  );
  const existingTables = new Set(schemaResult.rows.map((row) => row.table_name));

  const missingTables = REQUIRED_TABLES.filter((table) => !existingTables.has(table));
  console.log(`Required tables present: ${REQUIRED_TABLES.length - missingTables.length}/${REQUIRED_TABLES.length}`);
  if (missingTables.length) {
    console.error('Missing required tables:', missingTables.join(', '));
  }

  const columnResult = await query<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'`
  );
  const columnsByTable = new Map<string, Set<string>>();
  for (const row of columnResult.rows) {
    if (!columnsByTable.has(row.table_name)) columnsByTable.set(row.table_name, new Set());
    columnsByTable.get(row.table_name)!.add(row.column_name);
  }
  const missingColumns: string[] = [];
  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    for (const column of columns) {
      if (existingTables.has(table) && !columnsByTable.get(table)?.has(column)) {
        missingColumns.push(`${table}.${column}`);
      }
    }
  }
  console.log(`Required core columns missing: ${missingColumns.length}`);
  if (missingColumns.length) console.error('Missing columns:', missingColumns.join(', '));

  const migrationDirectory = path.join(process.cwd(), 'server', 'migrations');
  const migrationFiles = fs.existsSync(migrationDirectory)
    ? fs.readdirSync(migrationDirectory).filter((file) => file.endsWith('.sql')).sort()
    : [];
  console.log(`Migration SQL files present: ${migrationFiles.length}`);
  if (!migrationFiles.length) {
    console.error('No server/migrations/*.sql files exist. The CRUD migration cannot proceed.');
  }

  const rowCounts: Record<string, number> = {};
  for (const table of REQUIRED_TABLES) {
    if (!existingTables.has(table)) continue;
    // Table names are from the static allowlist above, never user input.
    const result = await query<{ count: string }>(
      `SELECT count(*)::text AS count FROM public."${table}"`
    );
    rowCounts[table] = Number(result.rows[0]?.count || 0);
  }
  console.log('Existing PostgreSQL row counts (metadata only):');
  for (const [table, count] of Object.entries(rowCounts)) {
    console.log(`  ${table}: ${count}`);
  }

  if (existingTables.has('schema_migrations')) {
    const columns = await query<{ column_name: string }>(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'schema_migrations'`
    );
    const hasChecksum = columns.rows.some((row) => row.column_name === 'checksum');
    console.log(`Migration checksum tracking: ${hasChecksum ? 'available' : 'missing (legacy migration table)'}`);
  } else {
    console.log('Migration tracking table: not initialized');
  }

  const rlsResult = await query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
    `SELECT c.relname,
            c.relrowsecurity,
            c.relforcerowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relname = ANY($1::text[])`,
    [[...REQUIRED_TABLES]]
  );
  const rlsByTable = new Map(rlsResult.rows.map((row) => [row.relname, row]));
  const missingRls = REQUIRED_TABLES.filter((table) => {
    const row = rlsByTable.get(table);
    return existingTables.has(table) && !row?.relrowsecurity;
  });
  console.log(`Tables missing enabled RLS: ${missingRls.length}`);
  if (missingRls.length) console.error('RLS must be reviewed/enabled before multi-tenant production use:', missingRls.join(', '));

  const broadPolicyResult = await query<{tablename:string;policyname:string;cmd:string}>(
    `SELECT tablename,policyname,cmd FROM pg_policies
      WHERE schemaname='public'
        AND (COALESCE(qual,'')='true' OR COALESCE(with_check,'')='true')
      ORDER BY tablename,policyname`
  );
  console.log(`Unrestricted public-table RLS policies: ${broadPolicyResult.rows.length}`);
  for (const policy of broadPolicyResult.rows) {
    console.error(`  ${policy.tablename} / ${policy.policyname} (${policy.cmd})`);
  }

  const policylessResult = await query<{tablename:string}>(
    `SELECT t.tablename FROM pg_tables t
      WHERE t.schemaname='public' AND t.tablename=ANY($1::text[])
        AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=t.tablename)
      ORDER BY t.tablename`,
    [[...REQUIRED_TABLES]]
  );
  console.log(`Required tables without an RLS policy: ${policylessResult.rows.length}`);
  if (policylessResult.rows.length) console.error('Tables without policies:',policylessResult.rows.map(r=>r.tablename).join(', '));

  const unsafeViews = await query<{view_name:string}>(
    `SELECT c.relname AS view_name FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='v'
        AND c.relname IN ('view_member_demographics','view_monthly_attendance_by_week')
        AND NOT ('security_invoker=true'=ANY(COALESCE(c.reloptions,ARRAY[]::text[])))`
  );
  console.log(`Reporting views not using security_invoker: ${unsafeViews.rows.length}`);
  if (unsafeViews.rows.length) console.error('Unsafe views:',unsafeViews.rows.map(r=>r.view_name).join(', '));

  const missingFoundationMigrations = [
    '025_member_model_and_identity_links.sql',
    '026_auth_onboarding_and_role_backfill.sql',
    '027_restrict_direct_member_table_access.sql',
    '028_tenant_branch_role_rls_hardening.sql',
    '029_membership_application_payload.sql',
  ].filter((file) => !migrationFiles.includes(file));
  console.log(`Reviewed foundation migrations present: ${5 - missingFoundationMigrations.length}/5`);
  if (missingFoundationMigrations.length) console.error('Missing migration files:', missingFoundationMigrations.join(', '));

  const passed = missingTables.length === 0 && missingColumns.length === 0 && migrationFiles.length > 0 && missingRls.length === 0 && broadPolicyResult.rows.length === 0 && policylessResult.rows.length === 0 && unsafeViews.rows.length === 0 && missingFoundationMigrations.length === 0;
  console.log(passed
    ? 'Preflight checks passed. This does NOT authorize a data cutover.'
    : 'Preflight found blockers. Do not run a production data cutover.');

  if (!passed) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error('[DB Preflight] Failed:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
