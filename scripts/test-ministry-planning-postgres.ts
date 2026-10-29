import assert from 'node:assert/strict';
import { pool, query } from '../server/pg';
import { saveMinistryAnnualPlan } from '../server/repositories/ministryPlanWriteRepository';
import { persistMinistryPlanAuditLog } from '../server/repositories/ministryPlanAuditRepository';
import type { MinistryAnnualPlan, AuditLog } from '../src/types';

if (process.env.CMMS_TEST_DATABASE !== 'true') throw new Error('CMMS_TEST_DATABASE=true is required.');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const databaseName = new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '');
if (!databaseName.endsWith('_test') || databaseName === 'postgres_test') throw new Error('Refusing to run: database name must end in _test.');

const tenantId = '11111111-1111-4111-8111-111111111111';
const otherTenantId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const branchId = '22222222-2222-4222-8222-222222222222';
const planId = 'mplan-integration-test-001';
const auditId = 'audit-integration-test-001';

function fixturePlan(overrides: Partial<MinistryAnnualPlan> = {}): MinistryAnnualPlan {
  const now = '2026-10-27T00:00:00.000Z';
  return {
    id: planId, planCode: 'TEST-PLAN-001', tenantId, branchId, ministryId: 'ministry-test',
    ministryName: 'Integration Test Ministry', year: 2026, title: 'Integration Test Plan',
    visionStatement: 'Test vision', objectives: [], activities: [], responsiblePerson: 'Test Owner',
    targetAudience: 'Test members', expectedParticipants: 10, requiredResources: 'None',
    optionalBudget: 1000, currency: 'ETB', kpis: [], expectedOutcomes: [], risks: [],
    mitigationSummary: '', quarterlyMilestones: [], monthlyActivities: [], status: 'Draft',
    revisionNumber: 1, submittedBy: 'test-user', submittedByName: 'Test User',
    reviewHistory: [], quarterlyReports: [], createdAt: now, updatedAt: now, ...overrides,
  };
}

function fixtureAudit(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: auditId, timestamp: '2026-10-27T00:00:00.000Z', userEmail: 'tester@example.invalid',
    userName: 'Integration Tester', userRole: 'SYSTEM_ADMIN', action: 'MINISTRY_PLAN_TEST',
    module: 'Ministry Annual Planning & Reporting', details: 'Disposable integration test event',
    actorId: 'test-user', eventType: 'MINISTRY_PLAN_TEST', outcome: 'SUCCESS', severity: 'LOW',
    prevHash: 'previous-test-hash', integrityHash: 'test-integrity-hash', schemaVersion: '2.0',
    ...overrides,
  } as AuditLog;
}

async function setup(): Promise<void> {
  await query('DROP TABLE IF EXISTS public.ministry_annual_plans CASCADE; DROP TABLE IF EXISTS public.audit_logs CASCADE;');
  await query(`CREATE TABLE public.ministry_annual_plans (
    id text PRIMARY KEY, plan_code text NOT NULL UNIQUE, tenant_id text NOT NULL, branch_id text NOT NULL,
    ministry_id text NOT NULL, ministry_name text NOT NULL, year integer NOT NULL, title text NOT NULL,
    vision_statement text, objectives jsonb NOT NULL DEFAULT '[]', activities jsonb NOT NULL DEFAULT '[]',
    responsible_person text NOT NULL, responsible_person_id text, target_audience text NOT NULL,
    expected_participants integer NOT NULL DEFAULT 0, required_resources text, optional_budget numeric(15,2) NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'ETB', kpis jsonb NOT NULL DEFAULT '[]', expected_outcomes jsonb NOT NULL DEFAULT '[]',
    risks jsonb NOT NULL DEFAULT '[]', mitigation_summary text, quarterly_milestones jsonb NOT NULL DEFAULT '[]',
    monthly_activities jsonb NOT NULL DEFAULT '[]', status text NOT NULL, revision_number integer NOT NULL DEFAULT 1,
    submitted_by text, submitted_by_name text, submitted_at timestamptz, reviewed_by text, reviewed_by_name text,
    reviewed_at timestamptz, approved_by text, approved_by_name text, approved_at timestamptz,
    returned_reason text, rejected_reason text, review_history jsonb NOT NULL DEFAULT '[]',
    quarterly_reports jsonb NOT NULL DEFAULT '[]', annual_report jsonb, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
  );`);
  await query(`CREATE TABLE public.audit_logs (
    id text PRIMARY KEY, tenant_id uuid, timestamp timestamptz NOT NULL DEFAULT now(), user_id text, actor_id text,
    user_email text, user_name text, user_role text, event_type text, outcome text NOT NULL DEFAULT 'SUCCESS',
    severity text NOT NULL DEFAULT 'LOW', correlation_id text, action text NOT NULL, module text NOT NULL,
    target_user_id text, target_user_email text, ip_address text, user_agent text, device_fingerprint text,
    session_id text, details text NOT NULL, commit_data text, device text, prev_hash text, integrity_hash text,
    schema_version text NOT NULL DEFAULT '2.0', created_at timestamptz NOT NULL DEFAULT now()
  );`);
}

async function main(): Promise<void> {
  const identity = await query<{ current_database: string }>('SELECT current_database()');
  assert.equal(identity.rows[0].current_database, databaseName);
  await setup();

  await saveMinistryAnnualPlan(fixturePlan({ objectives: [{ id: 'obj-1', title: 'Test objective' } as any] }));
  let saved = await query<{ tenant_id: string; branch_id: string; revision_number: number; objectives: any; status?: string; title?: string }>(
    'SELECT tenant_id, branch_id, revision_number, objectives FROM public.ministry_annual_plans WHERE id=$1', [planId]);
  assert.equal(saved.rowCount, 1);
  assert.equal(saved.rows[0].tenant_id, tenantId);
  assert.equal(saved.rows[0].branch_id, branchId);
  assert.equal(saved.rows[0].revision_number, 1);
  assert.equal(saved.rows[0].objectives[0].id, 'obj-1');

  await saveMinistryAnnualPlan(fixturePlan({ revisionNumber: 2, status: 'Submitted', submittedAt: '2026-10-27T01:00:00.000Z' }));
  saved = await query('SELECT tenant_id, branch_id, revision_number, status FROM public.ministry_annual_plans WHERE id=$1', [planId]);
  assert.equal(saved.rows[0].revision_number, 2);
  assert.equal(saved.rows[0].status, 'Submitted');

  await assert.rejects(saveMinistryAnnualPlan(fixturePlan({ tenantId: otherTenantId, revisionNumber: 3 })), /scope conflict/);
  saved = await query('SELECT tenant_id, revision_number FROM public.ministry_annual_plans WHERE id=$1', [planId]);
  assert.equal(saved.rows[0].tenant_id, tenantId);
  assert.equal(saved.rows[0].revision_number, 2, 'scope conflict must not overwrite the original plan');

  await query(`CREATE FUNCTION public.reject_test_ministry_plan() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.title = 'force-test-rollback' THEN RAISE EXCEPTION 'forced test rollback'; END IF; RETURN NEW; END; $$;
    CREATE TRIGGER reject_test_ministry_plan BEFORE INSERT OR UPDATE ON public.ministry_annual_plans
    FOR EACH ROW EXECUTE FUNCTION public.reject_test_ministry_plan();`);
  await assert.rejects(saveMinistryAnnualPlan(fixturePlan({ title: 'force-test-rollback', revisionNumber: 3 })));
  saved = await query('SELECT title, revision_number FROM public.ministry_annual_plans WHERE id=$1', [planId]);
  assert.equal(saved.rows[0].title, 'Integration Test Plan');
  assert.equal(saved.rows[0].revision_number, 2);
  await query('DROP TRIGGER reject_test_ministry_plan ON public.ministry_annual_plans; DROP FUNCTION public.reject_test_ministry_plan();');

  const audit = fixtureAudit();
  await persistMinistryPlanAuditLog(audit, tenantId);
  await persistMinistryPlanAuditLog(audit, tenantId);
  let auditRows = await query('SELECT tenant_id, action, integrity_hash FROM public.audit_logs WHERE id=$1', [auditId]);
  assert.equal(auditRows.rowCount, 1, 'same audit event retry must be idempotent');
  assert.equal(auditRows.rows[0].tenant_id, tenantId);
  assert.equal(auditRows.rows[0].integrity_hash, 'test-integrity-hash');
  await assert.rejects(persistMinistryPlanAuditLog(fixtureAudit({ action: 'DIFFERENT_EVENT' }), tenantId), /ID collision/);
  await assert.rejects(persistMinistryPlanAuditLog(audit, otherTenantId), /ID collision/);
  auditRows = await query('SELECT count(*)::int AS count FROM public.audit_logs WHERE id=$1', [auditId]);
  assert.equal(auditRows.rows[0].count, 1);
  console.log('Ministry PostgreSQL integration tests passed.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await pool.end(); });