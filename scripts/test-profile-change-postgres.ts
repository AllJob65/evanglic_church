import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pool, query } from '../server/pg';

if (process.env.CMMS_TEST_DATABASE !== 'true') throw new Error('CMMS_TEST_DATABASE=true is required.');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const databaseName = new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '');
if (databaseName !== 'cmms_profile_change_test') throw new Error('Refusing to run: expected dedicated cmms_profile_change_test database.');

const tenant = '11111111-1111-4111-8111-111111111111';
const otherTenant = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const branch = '22222222-2222-4222-8222-222222222222';
const otherBranch = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const member = '33333333-3333-4333-8333-333333333333';
const user = '44444444-4444-4444-8444-444444444444';

async function main() {
  const identity = await query<{name:string}>('SELECT current_database() AS name');
  assert.equal(identity.rows[0].name, databaseName);

  await query(`
    DROP TABLE IF EXISTS public.profile_change_requests CASCADE;
    DROP TABLE IF EXISTS public.members CASCADE;
    DROP TABLE IF EXISTS public.profiles CASCADE;
    DROP TABLE IF EXISTS public.branches CASCADE;
    DROP TABLE IF EXISTS public.tenants CASCADE;
    CREATE TABLE public.tenants(id uuid PRIMARY KEY);
    CREATE TABLE public.branches(
      id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES public.tenants(id),
      UNIQUE(id,tenant_id)
    );
    CREATE TABLE public.profiles(
      id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES public.tenants(id),
      UNIQUE(id,tenant_id)
    );
    CREATE TABLE public.members(
      id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES public.tenants(id),
      branch_id uuid NOT NULL,
      UNIQUE(id,tenant_id,branch_id),
      FOREIGN KEY(branch_id,tenant_id) REFERENCES public.branches(id,tenant_id)
    );
    DO $roles$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
        CREATE ROLE anon NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
    END;
    $roles$;
  `);
  await query('INSERT INTO public.tenants(id) VALUES ($1), ($2)',[tenant,otherTenant]);
  await query('INSERT INTO public.branches(id,tenant_id) VALUES ($1,$2), ($3,$2)',[branch,tenant,otherBranch]);
  await query('INSERT INTO public.profiles(id,tenant_id) VALUES ($1,$2)',[user,tenant]);
  await query('INSERT INTO public.members(id,tenant_id,branch_id) VALUES ($1,$2,$3)',[member,tenant,branch]);

  const migrationPath = path.join(process.cwd(),'server','migrations','030_profile_change_requests.sql');
  await query(fs.readFileSync(migrationPath,'utf8'));

  const inserted = await query<{id:string}>(
    `INSERT INTO public.profile_change_requests
      (tenant_id,branch_id,member_id,submitted_by,member_name,requested_snapshot,changed_fields)
     VALUES ($1,$2,$3,$4,'Test Member','{"firstName":"Updated"}','[{"fieldKey":"firstName"}]')
     RETURNING id`,
    [tenant,branch,member,user]
  );
  assert.equal(inserted.rowCount,1);
  const requestId=inserted.rows[0].id;

  await assert.rejects(query(
    `INSERT INTO public.profile_change_requests
      (tenant_id,branch_id,member_id,member_name,requested_snapshot)
     VALUES ($1,$2,$3,'Cross-branch','{}')`,
    [tenant,otherBranch,member]
  ), /foreign key/i);

  await assert.rejects(query(
    `INSERT INTO public.profile_change_requests
      (tenant_id,branch_id,member_id,member_name,requested_snapshot)
     VALUES ($1,$2,$3,'Bad snapshot','[]')`,
    [tenant,branch,member]
  ), /check constraint/i);

  await assert.rejects(query(
    `INSERT INTO public.profile_change_requests
      (tenant_id,branch_id,member_id,member_name,changed_fields,requested_snapshot)
     VALUES ($1,$2,$3,'Bad fields','{}','{}')`,
    [tenant,branch,member]
  ), /check constraint/i);

  await assert.rejects(query(
    `UPDATE public.profile_change_requests SET status='Approved' WHERE id=$1`,
    [requestId]
  ), /check constraint/i);

  await query(
    `UPDATE public.profile_change_requests
       SET status='Approved', reviewed_at=now(), reviewed_by=$2, reviewed_by_name='Integration Tester'
     WHERE id=$1`,
    [requestId,user]
  );
  const final=await query<{status:string;tenant_id:string;branch_id:string;member_id:string}>(
    'SELECT status,tenant_id,branch_id,member_id FROM public.profile_change_requests WHERE id=$1',[requestId]
  );
  assert.equal(final.rows[0].status,'Approved');
  assert.equal(final.rows[0].tenant_id,tenant);
  assert.equal(final.rows[0].branch_id,branch);
  assert.equal(final.rows[0].member_id,member);

  const security=await query<{rls:boolean;anon:boolean;authenticated:boolean}>(
    `SELECT c.relrowsecurity AS rls,
      has_table_privilege('anon','public.profile_change_requests','SELECT') AS anon,
      has_table_privilege('authenticated','public.profile_change_requests','SELECT') AS authenticated
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname='profile_change_requests'`
  );
  assert.equal(security.rows[0].rls,true);
  assert.equal(security.rows[0].anon,false);
  assert.equal(security.rows[0].authenticated,false);
  console.log('Profile-change PostgreSQL migration integration tests passed.');
}

main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await pool.end();});
