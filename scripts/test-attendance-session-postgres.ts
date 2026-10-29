import assert from 'node:assert/strict';
import { closePool, query } from '../server/pg';
import {
  closeAttendanceSession,
  createAttendanceSession,
  getAttendanceSession,
  listAttendanceSessions,
  rotateAttendanceSessionQrToken,
} from '../server/repositories/attendanceSessionRepository';

if (process.env.CMMS_TEST_DATABASE !== 'true') throw new Error('CMMS_TEST_DATABASE=true is required.');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const databaseName = new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '');
if (!databaseName.endsWith('_test') || databaseName === 'postgres_test') {
  throw new Error('Refusing to run: database name must end in _test.');
}

const tenantId = '11111111-1111-4111-8111-111111111111';
const branchId = '22222222-2222-4222-8222-222222222222';
const otherBranchId = '33333333-3333-4333-8333-333333333333';
const scope = { tenantId, branchId, branchIds: [branchId] };

async function setup(): Promise<void> {
  await query(`
    DROP TABLE IF EXISTS public.attendance_records CASCADE;
    DROP TABLE IF EXISTS public.attendance_sessions CASCADE;
    DROP TABLE IF EXISTS public.profiles CASCADE;
    DROP TABLE IF EXISTS public.branches CASCADE;
    DROP TABLE IF EXISTS public.tenants CASCADE;
    CREATE TABLE public.tenants (id uuid PRIMARY KEY);
    CREATE TABLE public.branches (id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES public.tenants(id));
    CREATE TABLE public.profiles (id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES public.tenants(id));
    CREATE TABLE public.attendance_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
      session_code text NOT NULL, group_id uuid, group_name text,
      leader_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      leader_name text, session_type text NOT NULL DEFAULT 'instant',
      title text NOT NULL, service_type text NOT NULL DEFAULT 'Ministry Attendance',
      status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
      start_time timestamptz NOT NULL DEFAULT now(), end_time timestamptz,
      qr_payload_token text NOT NULL UNIQUE, location text,
      attendee_count integer NOT NULL DEFAULT 0 CHECK (attendee_count >= 0),
      session_data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(session_data)='object'),
      UNIQUE (tenant_id, session_code), UNIQUE (id, tenant_id, branch_id)
    );
    INSERT INTO public.tenants(id) VALUES ('11111111-1111-4111-8111-111111111111');
    INSERT INTO public.branches(id,tenant_id) VALUES
      ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111'),
      ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111');
    INSERT INTO public.profiles(id,tenant_id) VALUES
      ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111');
  `);
}

async function main(): Promise<void> {
  const identity = await query<{ current_database: string }>('SELECT current_database()');
  assert.equal(identity.rows[0].current_database, databaseName);
  await setup();

  const created = await createAttendanceSession(scope, {
    branchId, leaderUserId: '44444444-4444-4444-8444-444444444444',
    leaderName: 'Test Leader', title: 'Sunday Service', serviceType: 'Sunday Service',
    location: 'Main Hall', sessionData: { source: 'integration-test' },
  });
  assert.equal(created.status, 'active');
  assert.equal(created.attendeeCount, 0);
  assert.equal(created.sessionData.source, 'integration-test');
  assert.ok(created.qrPayloadToken.length >= 64);

  const listed = await listAttendanceSessions(scope, { status: 'active' });
  assert.equal(listed.length, 1);
  assert.equal(listed[0].id, created.id);

  const fetched = await getAttendanceSession(scope, created.id);
  assert.equal(fetched?.sessionCode, created.sessionCode);
  assert.equal(await getAttendanceSession({ ...scope, branchIds: [otherBranchId] }, created.id), null);

  const rotated = await rotateAttendanceSessionQrToken(scope, created.id);
  assert.ok(rotated);
  assert.notEqual(rotated.qrPayloadToken, created.qrPayloadToken);

  const closed = await closeAttendanceSession(scope, created.id);
  assert.equal(closed?.status, 'closed');
  assert.ok(closed?.endTime);
  await assert.rejects(() => rotateAttendanceSessionQrToken(scope, created.id), /closed session/);

  await assert.rejects(
    () => createAttendanceSession(scope, { branchId: otherBranchId, title: 'Unauthorized branch' }),
    /outside the authenticated user scope/,
  );
  await assert.rejects(
    () => createAttendanceSession(scope, { branchId, leaderUserId: '55555555-5555-4555-8555-555555555555', title: 'Invalid leader' }),
    /does not belong to this tenant/,
  );
  console.log('Attendance session PostgreSQL integration tests passed.');
}

main().catch((error) => {
  console.error('Attendance session PostgreSQL integration tests failed:', error);
  process.exitCode = 1;
}).finally(async () => { await closePool(); });
