import assert from 'node:assert/strict';
import { closePool, query } from '../server/pg';
import { createSessionCheckIn, type AttendanceScope } from '../server/repositories/attendanceCheckInRepository';

if (process.env.CMMS_TEST_DATABASE !== 'true') throw new Error('CMMS_TEST_DATABASE=true is required.');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const databaseName = new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '');
if (!databaseName.endsWith('_test') || databaseName === 'postgres_test') {
  throw new Error('Refusing to run: database name must end in _test.');
}

const tenantId = '11111111-1111-4111-8111-111111111111';
const branchId = '22222222-2222-4222-8222-222222222222';
const otherBranchId = '33333333-3333-4333-8333-333333333333';
const memberId = '44444444-4444-4444-8444-444444444444';
const otherMemberId = '55555555-5555-4555-8555-555555555555';
const rollbackMemberId = '88888888-8888-4888-8888-888888888888';
const sessionId = '66666666-6666-4666-8666-666666666666';
const closedSessionId = '77777777-7777-4777-8777-777777777777';
const scope: AttendanceScope = { tenantId, branchId, branchIds: [branchId] };
const now = new Date('2026-10-26T08:00:00.000Z');

async function setup(): Promise<void> {
  await query(`
    DROP TABLE IF EXISTS public.attendance_records CASCADE;
    DROP TABLE IF EXISTS public.attendance_sessions CASCADE;
    DROP TABLE IF EXISTS public.members CASCADE;
    DROP TABLE IF EXISTS public.branches CASCADE;
    DROP TABLE IF EXISTS public.tenants CASCADE;
    CREATE TABLE public.tenants (id uuid PRIMARY KEY);
    CREATE TABLE public.branches (id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES public.tenants(id));
    CREATE TABLE public.members (
      id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES public.tenants(id),
      branch_id uuid NOT NULL REFERENCES public.branches(id),
      first_name text NOT NULL, last_name text NOT NULL
    );
    CREATE TABLE public.attendance_sessions (
      id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES public.tenants(id),
      branch_id uuid NOT NULL REFERENCES public.branches(id), session_code text NOT NULL,
      title text NOT NULL, service_type text NOT NULL,
      status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
      attendee_count integer NOT NULL DEFAULT 0 CHECK (attendee_count >= 0),
      UNIQUE (tenant_id, session_code), UNIQUE (id, tenant_id, branch_id)
    );
    CREATE TABLE public.attendance_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES public.tenants(id),
      branch_id uuid NOT NULL REFERENCES public.branches(id),
      event_name text NOT NULL, service_type text NOT NULL, member_id uuid,
      checkin_method text, checkin_time timestamptz NOT NULL DEFAULT now(),
      session_id uuid, member_name text, status text NOT NULL DEFAULT 'Present', notes text,
      FOREIGN KEY (branch_id) REFERENCES public.branches(id),
      FOREIGN KEY (member_id) REFERENCES public.members(id),
      FOREIGN KEY (session_id, tenant_id, branch_id)
        REFERENCES public.attendance_sessions(id, tenant_id, branch_id)
    );
    INSERT INTO public.tenants(id) VALUES ('11111111-1111-4111-8111-111111111111');
    INSERT INTO public.branches(id,tenant_id) VALUES
      ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111'),
      ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111');
    INSERT INTO public.members(id,tenant_id,branch_id,first_name,last_name) VALUES
      ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','Test','Member'),
      ('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','Other','Branch'),
      ('88888888-8888-4888-8888-888888888888','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','Rollback','Fixture');
    INSERT INTO public.attendance_sessions(id,tenant_id,branch_id,session_code,title,service_type,status) VALUES
      ('66666666-6666-4666-8666-666666666666','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','TEST-OPEN','Sunday Service','Sunday Service','active'),
      ('77777777-7777-4777-8777-777777777777','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','TEST-CLOSED','Closed Service','Sunday Service','closed');
  `);
}
async function rejects(work: () => Promise<unknown>, message: string): Promise<void> {
  await assert.rejects(work, (error: unknown) => error instanceof Error && error.message.includes(message));
}
async function main(): Promise<void> {
  const identity = await query<{ current_database: string }>('SELECT current_database()');
  assert.equal(identity.rows[0].current_database, databaseName);
  await setup();

  const first = await createSessionCheckIn(scope, {
    sessionCode: 'TEST-OPEN', memberId, checkInMethod: 'Manual Web Click', checkedInAt: now,
  });
  assert.equal(first.alreadyCheckedIn, false);
  assert.equal(first.record.memberName, 'Test Member');
  assert.equal(first.attendeeCount, 1);

  const duplicate = await createSessionCheckIn(scope, {
    sessionCode: 'TEST-OPEN', memberId, checkInMethod: 'Manual Web Click', checkedInAt: now,
  });
  assert.equal(duplicate.alreadyCheckedIn, true);
  assert.equal(duplicate.record.id, first.record.id);
  assert.equal(duplicate.attendeeCount, 1);

  await rejects(() => createSessionCheckIn(
    { ...scope, branchId: otherBranchId },
    { sessionCode: 'TEST-OPEN', memberId, checkInMethod: 'Manual Web Click', checkedInAt: now },
  ), 'outside the authenticated user scope');
  await rejects(() => createSessionCheckIn(scope, {
    sessionCode: 'TEST-CLOSED', memberId, checkInMethod: 'Manual Web Click', checkedInAt: now,
  }), 'closed');
  await rejects(() => createSessionCheckIn(scope, {
    sessionCode: 'TEST-OPEN', memberId: otherMemberId,
    checkInMethod: 'Manual Web Click', checkedInAt: now,
  }), 'does not exist');
  await rejects(() => createSessionCheckIn(
    { ...scope, branchIds: [otherBranchId] },
    { sessionCode: 'TEST-OPEN', memberId, checkInMethod: 'Manual Web Click', checkedInAt: now },
  ), 'outside the authenticated user scope');

  await query(`
    CREATE FUNCTION public.reject_test_attendance() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.notes = 'force-test-rollback' THEN RAISE EXCEPTION 'forced integration-test failure'; END IF;
      RETURN NEW;
    END; $$;
    CREATE TRIGGER reject_test_attendance BEFORE INSERT ON public.attendance_records
    FOR EACH ROW EXECUTE FUNCTION public.reject_test_attendance();
  `);
  await assert.rejects(createSessionCheckIn(scope, {
    sessionCode: 'TEST-OPEN', memberId: rollbackMemberId,
    checkInMethod: 'Manual Web Click', checkedInAt: now, notes: 'force-test-rollback',
  }));
  const rollbackState = await query<{ records: string; attendee_count: number }>(`
    SELECT (SELECT count(*)::text FROM public.attendance_records) records,
           (SELECT attendee_count FROM public.attendance_sessions WHERE id=$1) attendee_count
  `, [sessionId]);
  assert.equal(rollbackState.rows[0].records, '1');
  assert.equal(rollbackState.rows[0].attendee_count, 1);

  await query('DROP TRIGGER reject_test_attendance ON public.attendance_records');
  const concurrentMember = '99999999-9999-4999-8999-999999999999';
  await query(`INSERT INTO public.members(id,tenant_id,branch_id,first_name,last_name)
    VALUES ($1,$2,$3,'Concurrent','Member')`, [concurrentMember, tenantId, branchId]);
  const attempts = await Promise.all([1, 2].map(() => createSessionCheckIn(scope, {
    sessionCode: 'TEST-OPEN', memberId: concurrentMember,
    checkInMethod: 'QR Code Scanning', checkedInAt: now,
  })));
  assert.equal(attempts.filter((r) => !r.alreadyCheckedIn).length, 1);
  assert.equal(attempts.filter((r) => r.alreadyCheckedIn).length, 1);
  const counts = await query<{ attendee_count: number; record_count: string }>(`
    SELECT s.attendee_count,
      (SELECT count(*)::text FROM public.attendance_records r WHERE r.session_id=s.id) record_count
    FROM public.attendance_sessions s WHERE s.id=$1
  `, [sessionId]);
  assert.equal(counts.rows[0].attendee_count, 2);
  assert.equal(counts.rows[0].record_count, '2');
  console.log('Attendance PostgreSQL integration tests passed.');
}
main().catch((error) => {
  console.error('Attendance PostgreSQL integration tests failed:', error);
  process.exitCode = 1;
}).finally(async () => { await closePool(); });
