/**
 * Static security architecture checks for the CMMS PostgreSQL foundation.
 * This script is deliberately offline and read-only. It never probes or writes
 * to the production Supabase project.
 */
import fs from 'node:fs';
import path from 'node:path';

type Check={name:string;passed:boolean;details:string};
const checks:Check[]=[];
const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const test=(name:string,passed:boolean,details:string)=>checks.push({name,passed,details});

function main(){
 const rls=read('server/migrations/028_tenant_branch_role_rls_hardening.sql');
 const identity=read('server/migrations/025_member_model_and_identity_links.sql');
 const onboarding=read('server/migrations/026_auth_onboarding_and_role_backfill.sql');
 const directAccess=read('server/migrations/027_restrict_direct_member_table_access.sql');
 const runner=read('server/pg.ts');
 const members=read('server/routes/members.ts');
 const repository=read('server/repositories/memberRepository.ts');
 const branches=read('server/routes/branches.ts');
 const attendance=read('server/routes/attendance.ts');
 const pastoral=read('server/routes/pastoral.ts');
 const system=read('server/routes/system.ts');
 const smsService=read('server/services/smsService.ts');
 test('SMS service never fabricates successful delivery without provider configuration', !smsService.includes('Default EthioTelecom Gateway Relay') && !smsService.includes('generatedMessageId') && smsService.includes('SMS delivery is unavailable because no supported SMS provider is fully configured') && smsService.includes("providerKey === 'twilio'"), 'SMS service must fail closed without a fully configured provider and must not generate a fake message ID or SENT status.');
 const communications=read('server/routes/communications.ts');
 test('Communication summaries do not treat provider acceptance as delivery or open', (communications.match(/delivered: 0/g) || []).length >= 3 && (communications.match(/opened: 0/g) || []).length >= 3 && (communications.match(/deliveryRatePercentage: 0/g) || []).length >= 3 && !communications.includes('delivered: sentCount') && !communications.includes('opened: sentCount'), 'Direct SMS, email and broadcast summaries must not claim delivery or opens without provider delivery/open receipts.');
 const communicationLog=read('server/services/communicationLogService.ts');
 test('Communication log PostgreSQL failures are surfaced', communicationLog.includes('COMMUNICATION_LOG_PERSISTENCE_FAILED') && communicationLog.includes('COMMUNICATION_LOG_UPDATE_FAILED') && !communicationLog.includes('PostgreSQL insert note:') && !communicationLog.includes('PostgreSQL update note:'), 'When PostgreSQL is configured, communication log insert/update errors must not be silently swallowed.');
 const communicationsRoutes=read('server/routes/communications.ts');
 test('Communication retry lookup is tenant and branch scoped in PostgreSQL', communicationsRoutes.includes("SELECT * FROM communication_logs WHERE id = $1 AND tenant_id = $2 LIMIT 1") && communicationsRoutes.includes("Access denied: communication log belongs to another branch.") && communicationsRoutes.includes("if (isPgConfigured())"), 'Retry must load the log from PostgreSQL for the authenticated tenant and reject branch-inaccessible records.');
 test('Communication log reads use PostgreSQL when configured', communicationsRoutes.includes('if (isPgConfigured())') && communicationsRoutes.includes('FROM communication_logs WHERE tenant_id = $1') && communicationsRoutes.includes('WHERE id = $1 AND tenant_id = $2 LIMIT 1') && communicationsRoutes.includes('COMMUNICATION_LOG_READ_UNAVAILABLE'), 'Communication log list/detail reads must use tenant-scoped PostgreSQL queries when DATABASE_URL is configured and fail closed on query errors.');
 test('Communication log updates are PostgreSQL authoritative and tenant scoped', communicationLog.includes('WHERE id = $7 AND tenant_id = $8') && communicationLog.includes('RETURNING *') && communicationLog.indexOf('if (isPgConfigured())') < communicationLog.indexOf('const state = db.getState();'), 'Configured PostgreSQL updates must write first, scope by tenant, return the persisted row, and avoid JSON dual writes.');
 test('Communication log creation is PostgreSQL authoritative when configured', communicationLog.includes('INSERT INTO communication_logs') && communicationLog.includes('RETURNING *') && communicationLog.includes('if (isPgConfigured())') && communicationLog.indexOf('if (isPgConfigured())') < communicationLog.indexOf('const state = db.getState();', communicationLog.indexOf('public async recordLog')) && !communicationLog.includes('ON CONFLICT (id) DO NOTHING'), 'Configured PostgreSQL inserts must happen before JSON fallback, return the persisted row, and must not silently ignore duplicate IDs.');
 test('Communication member resolution uses tenant and branch scoped PostgreSQL repository', communicationsRoutes.includes("import { isDatabaseUuid, listMembers } from '../repositories/memberRepository'") && communicationsRoutes.includes('await listMembers(scope, { search: identifier.trim(), limit: 50 })') && communicationsRoutes.includes('await findMemberInDb(memberId, req.user)') && communicationsRoutes.includes('if (isPgConfigured())'), 'Configured PostgreSQL communication recipient resolution must use the scoped member repository rather than the global JSON member array.');
 test('Communication family and ministry lookup use tenant and branch scoped PostgreSQL queries', communicationsRoutes.includes("FROM families WHERE id = $1 AND tenant_id = $2") && communicationsRoutes.includes("FROM ministries WHERE id = $1 AND tenant_id = $2") && communicationsRoutes.includes('await findFamilyInDb(familyId, req.user)') && communicationsRoutes.includes('await findMinistryInDb(ministryId, req.user)'), 'Family and ministry recipient lookups must be tenant/branch scoped when PostgreSQL is configured.');

 test('Communication campaign summaries persist to PostgreSQL when configured', communicationsRoutes.includes('INSERT INTO communications') && communicationsRoutes.includes('await persistCommunicationSummary(commSummary, user, state)') && communicationsRoutes.includes('await persistCommunicationSummary(commRecord, user, state)') && communicationsRoutes.includes('COMMUNICATION_SUMMARY_PERSISTENCE_FAILED'), 'Campaign summaries must use the communications table when PostgreSQL is configured and must fail closed on persistence errors.');
 test('Email campaign summaries use the shared PostgreSQL persistence path', communicationsRoutes.includes('await persistCommunicationSummary(commSummary, user, state)') && communicationsRoutes.includes('await persistCommunicationSummary(commRecord, user, state)'), 'Email and broadcast summaries must both use the shared persistence helper.');

 test('Communication history detail and retry SQL enforce branch scope', communicationsRoutes.includes('branch_id = ANY($3::uuid[])') && communicationsRoutes.includes('detailBranchIds') && communicationsRoutes.includes('retryBranchIds') && communicationsRoutes.includes('branch_id = ANY($2::uuid[])'), 'Communication list, detail and retry PostgreSQL reads must enforce UUID branch scope.');
 test('Broadcast audience uses tenant and branch scoped PostgreSQL member repository', communicationsRoutes.includes('async function listCommunicationMembers') && communicationsRoutes.includes("await listCommunicationMembers(user, targetType === 'branch' ? branchId : undefined)") && communicationsRoutes.includes('const min = await findMinistryInDb(ministryId, req.user)') && communicationsRoutes.includes('const allMembers: Member[] = isPgConfigured()'), 'PostgreSQL broadcasts must never select recipients from the global JSON member array.');
 test('Communication personalization metadata uses tenant and branch scoped PostgreSQL lookups', communicationsRoutes.includes('async function findBranchInDb') && communicationsRoutes.includes('await findFamilyInDb(mem.familyId, req.user)') && communicationsRoutes.includes('await findMinistryInDb(ministryId, req.user)') && communicationsRoutes.includes('await findBranchInDb(mem.branchId, req.user)'), 'SMS, email and broadcast personalization must not read family, ministry or branch metadata from global JSON state when PostgreSQL is configured.');
 test('Communication PostgreSQL history uses database filtering and bounded pagination', communicationsRoutes.includes('COUNT(*) FILTER (WHERE channel = \'SMS\')') && communicationsRoutes.includes('ORDER BY created_at DESC LIMIT') && communicationsRoutes.includes('ILIKE') && communicationsRoutes.includes('COUNT(*)::text AS total'), 'PostgreSQL communication history must filter and paginate in SQL instead of loading every log into application memory.');
 test('Communication JSON fallback detail and retry enforce tenant scope', communicationsRoutes.includes("find((l) => l.id === id && (!l.tenant_id || isSameTenant(l.tenant_id, user.tenantId)))"), 'Legacy communication detail and retry lookups must constrain records to the authenticated tenant.');
 test('Communication retry atomically claims only FAILED records before provider send', communicationLog.includes('public async claimRetry') && communicationLog.includes("status = 'FAILED'") && communicationLog.includes("SET status = 'QUEUED'") && communicationsRoutes.includes('COMMUNICATION_RETRY_ALREADY_CLAIMED') && communicationsRoutes.includes('Only failed communications can be retried'), 'Retry must atomically transition FAILED to QUEUED before provider dispatch and reject already claimed or successful records.');
 test('Communication retry preserves ambiguous provider outcomes as non-retryable queued records', communicationLog.includes('public async markRetryOutcomeUnknown') && communicationLog.includes('RETRY_OUTCOME_UNKNOWN') && communicationsRoutes.includes('retryClaimed = true') && communicationsRoutes.includes('COMMUNICATION_RETRY_OUTCOME_UNKNOWN') && communicationsRoutes.toLowerCase().includes('do not resend automatically'), 'After a retry claim, thrown provider or persistence errors must remain queued with an explicit reconciliation marker, never become blindly retryable.');
 const auth=read('server/routes/auth.ts');
 const emailService=read('server/services/emailService.ts');
 test('Email service never reports local JSON transport as sent', !emailService.includes('jsonTransport: true') && emailService.includes('Email delivery is unavailable because no SMTP or email API provider is configured'), 'Email service must fail closed when no real SMTP/API provider is configured; local JSON transport is not delivery.');

 test('Email templates use current New Church branding', emailService.includes('>New Church</h2>') && emailService.includes('Sent via New Church Management System') && !emailService.includes('Grace Cathedral International') && !emailService.includes('Sovereign Church Management System'), 'Generated email templates and fallback sender display name must use the current New Church brand.');

 const resetMfaStart=auth.indexOf("router.post('/users/:id/reset-mfa'");
 const resetMfaEnd=auth.indexOf("// 4. GET ALL SYSTEM USERS", resetMfaStart);
 const resetMfa=auth.slice(resetMfaStart, resetMfaEnd);
 test('MFA reset targets Supabase Auth directly without requiring or mutating JSON user mirrors', resetMfa.includes('getUserById(targetId)') && resetMfa.includes('listFactors({ userId: targetId })') && resetMfa.includes('MFA_RESET_FAILED') && !resetMfa.includes('db.getState()') && !resetMfa.includes('db.persist()'), 'Administrator MFA reset must work for Supabase-provisioned users even when no legacy JSON mirror exists, and must not mutate JSON credentials or MFA state.');

 const updateUserStart=auth.indexOf("router.put('/users/:id'");
 const updateUserEnd=auth.indexOf("// 5B. ADMIN RESET STAFF PASSWORD", updateUserStart);
 const updateUser=auth.slice(updateUserStart, updateUserEnd);
 test('Staff account updates are Supabase-first and never persist the JSON user mirror', updateUser.includes('AUTHORITATIVE_USER_ID_REQUIRED') && updateUser.includes('USER_PROFILE_UPDATE_FAILED') && updateUser.includes('USER_AUTH_UPDATE_FAILED') && updateUser.includes("admin.auth.admin.updateUserById") && !updateUser.includes('db.persist()') && !updateUser.includes('user.name = updatedName'), 'Staff account updates must require an authoritative Supabase identity, check profile and Auth update errors, and avoid mutating the JSON systemUsers mirror.');

 const createUserStart=auth.indexOf("router.post('/users'");
 const createUserEnd=auth.indexOf("router.put('/users/:id'", createUserStart);
 const createUser=auth.slice(createUserStart, createUserEnd);
 test('Staff account provisioning fails closed and never writes JSON credentials', createUser.includes('USER_PROVISIONING_FAILED') && createUser.includes('adminClient.auth.admin.deleteUser') && !createUser.includes('db.persist()') && !createUser.includes('hashedPassword'), 'A staff account is successful only after Supabase Auth, profile, role and branch assignments succeed; failed partial provisioning is rolled back and no credential-bearing JSON mirror is written.');

 const staffLoginStart=auth.indexOf("router.post('/staff/login'");
 const staffLoginEnd=auth.indexOf('// 1A-1. REQUEST PASSWORD RESET', staffLoginStart);
 const staffLogin=auth.slice(staffLoginStart, staffLoginEnd);
 test('Staff login does not write a JSON user mirror', staffLoginStart >= 0 && staffLoginEnd > staffLoginStart && !staffLogin.includes('db.getState()') && !staffLogin.includes('db.persist()'), 'Successful staff login must rely on authoritative Supabase identity and must not mutate the legacy JSON store.');
 const changePasswordStart=auth.indexOf("router.post('/change-password'");
 const changePasswordEnd=auth.indexOf("router.post('/staff/forgot-password'", changePasswordStart);
 const changePassword=auth.slice(changePasswordStart, changePasswordEnd);
 test('Supabase password changes do not write a duplicate JSON credential mirror', changePassword.includes('if (!isSupabaseConfigured)') && changePassword.includes('db.persist()'), 'The JSON mirror update must be restricted to the non-Supabase compatibility path.');

 const passwordChangeStart=auth.indexOf("router.post('/change-password'");
 const passwordChangeEnd=auth.indexOf("router.post('/staff/forgot-password'", passwordChangeStart);
 const passwordChange=passwordChangeEnd > passwordChangeStart ? auth.slice(passwordChangeStart, passwordChangeEnd) : auth.slice(passwordChangeStart);
 test('Legacy password change fails closed without a bcrypt credential', passwordChange.includes('PASSWORD_CHANGE_VERIFICATION_UNAVAILABLE') && passwordChange.includes("storedPass.startsWith('$2')") && !passwordChange.includes('passwordMatch = true') && !passwordChange.includes('storedPass === currentPassword'), 'A valid session token without a verifiable current-password hash must not authorize password replacement.');


 const protectedTables=[
  'tenants','branches','profiles','members','member_details','member_private_details',
  'profile_role_assignments','profile_branch_assignments','families','ministries',
  'ministry_members','attendance_records','pastoral_records','financial_transactions',
  'workflow_requests','events','volunteer_shifts','assets','documents','lms_courses','audit_logs',
 ];
 for(const table of protectedTables){
  const policyPattern=new RegExp('CREATE POLICY [a-zA-Z0-9_]+ ON public\\.'+table+'\\b','i');
  test(`RLS policy exists for public.${table}`,policyPattern.test(rls),'Policy must be present in migration 028.');
 }
 test('RLS helper functions are isolated in private schema', rls.includes('CREATE SCHEMA IF NOT EXISTS private') && rls.includes('private.current_tenant_id()') && rls.includes('private.has_cmms_role(text)'), 'Tenant and role helper functions must be defined in the private schema.');
 test('RLS helpers have locked search_path', ['SET search_path = pg_catalog, public'].every(value => rls.includes(value)), 'SECURITY DEFINER helpers must use a fixed search_path.');
 test('RLS helper execute is not granted to anon', rls.includes('REVOKE ALL ON FUNCTION private.current_tenant_id() FROM PUBLIC, anon') && rls.includes('REVOKE ALL ON FUNCTION private.has_cmms_role(text) FROM PUBLIC, anon'), 'Only authenticated clients may invoke policy helpers.');
 test('Unrestricted permissive policies are removed',/DROP POLICY IF EXISTS/.test(rls)&&!(/USING\\s*\\(true\\)/i.test(rls)||/WITH CHECK\\s*\\(true\\)/i.test(rls)),'Migration must drop existing broad policies and must not recreate USING(true).');
 test('Profile self-update cannot change role or tenant',!(/CREATE POLICY [a-zA-Z0-9_]+ ON public\\.profiles[\\s\\S]{0,250}FOR UPDATE/i.test(rls)),'Profiles are read-only to browser clients; updates go through the trusted API.');
 test('Finance has no browser delete policy',!(/CREATE POLICY [a-zA-Z0-9_]+ ON public\\.financial_transactions[\\s\\S]{0,180}FOR DELETE/i.test(rls)),'Financial records are not directly deletable through the browser Data API.');
 test('Confidential pastoral access excludes admin-only role', rls.includes("COALESCE(upper(confidentiality),'GENERAL') IN ('CONFIDENTIAL','SEALED','MINISTERIAL')") && rls.includes("AND private.has_cmms_role('PASTOR')"), 'Confidential/SEALED/MINISTERIAL records require a pastor role or assigned counselor.');
 test('Reporting views use security_invoker', rls.includes('ALTER VIEW public.view_member_demographics SET (security_invoker = true)') && rls.includes('ALTER VIEW public.view_monthly_attendance_by_week SET (security_invoker = true)'), 'Views must honor the caller RLS context.');
 test('Signup ignores editable role metadata',!/raw_user_meta_data->>'role'/.test(onboarding)&&/REGULAR_MEMBER/.test(onboarding),'Public signup always receives least-privilege role.');
 test('Signup function locks search_path', onboarding.includes('ALTER FUNCTION public.handle_new_user() SET search_path = pg_catalog, public'), 'Trigger function has fixed search_path.');
 test('Signup trigger execution revoked from browser roles', onboarding.includes('REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated'), 'Trigger function cannot be invoked as a public RPC.');
 test('Member table browser privileges are revoked after API cutover', directAccess.includes('FROM PUBLIC, anon, authenticated'), 'Member reads/writes must go through the authenticated server API.');
 test('Migration runner requires explicit allowlist',/CMMS_MIGRATION_ALLOWLIST/.test(runner),'Existing databases never auto-run the legacy migration chain.');
 test('Member routes no longer import JSON state', !members.includes("from '../db'") && !members.includes('db.getState('), 'Member routes must use PostgreSQL repositories.');
 test('Branch and ministry routes no longer import JSON state', !branches.includes("from '../db'") && !branches.includes('db.getState('), 'Branch/ministry routes must use PostgreSQL repositories.');
 test('Standard member repository excludes private detail reads', !/FROM\\s+public\\.member_private_details/i.test(repository), 'Health/emergency data must not appear in standard reads.');
 test('Private detail API requires pastoral permission', members.includes("requirePermission('pastoral.confidential')"), 'Private member fields require a dedicated permissioned endpoint.');
 test('Event calendar routes do not read legacy JSON events', !/db\\.getState\\(\\)\\.events/.test(attendance), 'Event CRUD must use PostgreSQL.');
 test('Attendance route no longer reads or writes legacy JSON state', !attendance.includes('db.getState()') && !attendance.includes('db.persist()'), 'Attendance records and sessions must use PostgreSQL repositories rather than JSON state.');

 test('Sealed counseling list has no SYSTEM_ADMIN bypass', pastoral.includes("if ((c as any).confidentialityLevel === 'SEALED')") && pastoral.includes('return c.counselorId === user.id;') && !pastoral.includes("c.counselorId === user.id || user.role === 'SYSTEM_ADMIN'"), 'SEALED list entries are limited to the assigned counselor account.');
 test('Sealed counseling detail uses account identity, not display name', pastoral.includes('const isCounselor = session.counselorId === user.id;') && !pastoral.includes('session.counselorName === user.name'), 'Display names are mutable and non-unique; authorization uses stable user ID.');
 test('Sealed counseling detail preserves member ownership check', pastoral.includes('const isOwner = session.memberId === user.id || (user.memberId && session.memberId === user.memberId);') && pastoral.includes('if (!isCounselor && !isOwner)'), 'Member ownership remains an explicit independent access path.');

 test('Pastoral prayer list fails closed on missing tenant IDs', pastoral.includes('Boolean(p.tenantId) && p.tenantId === user.tenantId'), 'A record without an explicit tenant must not be visible in a tenant-scoped list.');
 test('Pastoral counseling list fails closed on missing tenant IDs', pastoral.includes('Boolean(c.tenantId) && c.tenantId === user.tenantId'), 'Counseling records require explicit tenant ownership.');
 test('Pastoral visitation list fails closed on missing branch IDs', pastoral.includes('Boolean(v.branchId) && user.branchIds.includes(v.branchId)'), 'Unassigned branch records must not leak across branch-scoped pastoral lists.');
 test('Pastoral branch-scoped communication list fails closed on missing branch IDs', pastoral.includes('Boolean(c.branchId) && user.branchIds.includes(c.branchId)'), 'Communications without branch ownership are not returned to scoped staff.')
 test('Pastoral record creation validates branch assignment', pastoral.includes('function canWritePastoralBranch') && (pastoral.match(/if \(!canWritePastoralBranch\(user, targetBranchId\)\)/g) || []).length === 4, 'Prayer, counseling, visitation, and communication creation must reject unassigned branches.');
 test('Pastoral record creation persists only the validated branch', (pastoral.match(/branchId: targetBranchId/g) || []).length === 4, 'Client-supplied branch IDs must be validated before persistence.');
 test('Public prayer submissions require explicit tenant configuration', pastoral.includes('process.env.CMMS_PUBLIC_PRAYER_TENANT_ID?.trim()') && pastoral.includes('code: \'PUBLIC_PRAYER_SCOPE_NOT_CONFIGURED\'') && !pastoral.includes("tenantId: 'default'"), 'Public prayer requests must never be assigned to a hard-coded shared tenant.');
 test('Public prayer submissions require explicit branch configuration', pastoral.includes('process.env.CMMS_PUBLIC_PRAYER_BRANCH_ID?.trim()') && pastoral.includes('branchId,') && !pastoral.includes("branchId: 'br-1'"), 'Public prayer requests must be assigned only to an explicitly configured branch.');
 test('Prayer list ownership never falls back to display-name matching', !pastoral.includes('p.memberName && p.memberName.toLowerCase() === user.name.toLowerCase()') && pastoral.includes('p.memberId === user.id'), 'Prayer ownership must use stable account/member identifiers, never mutable display names.');
 test('Generic pastoral ID lookup enforces SEALED counselor or member ownership', pastoral.includes("if ((session as any).confidentialityLevel === 'SEALED')") && pastoral.includes('const isCounselor = session.counselorId === user.id;') && pastoral.includes('const isOwner = session.memberId === user.id || (user.memberId && session.memberId === user.memberId);') && pastoral.includes("code: 'SEALED_CONFIDENTIAL'"), 'Every counseling detail route must preserve SEALED confidentiality even when shared authorization grants an administrator bypass.');
 test('System queue stats require SYSTEM_ADMIN', /router\.get\('\/queue\/stats',[\s\S]{0,260}req\.user\?\.role !== 'SYSTEM_ADMIN'[\s\S]{0,180}FORBIDDEN_ROLE/.test(system), 'Queue operational metadata is restricted to system administrators.');
 test('System queue submission requires SYSTEM_ADMIN', /router\.post\('\/queue\/jobs',[\s\S]{0,260}req\.user\?\.role !== 'SYSTEM_ADMIN'[\s\S]{0,180}FORBIDDEN_ROLE/.test(system), 'Only system administrators may enqueue background work.');
 test('System queue rejects unsupported job names and oversized payloads', system.includes('allowedJobNames.includes(name as typeof allowedJobNames[number])') && system.includes('JOB_DATA_TOO_LARGE') && system.includes('16 * 1024'), 'Queue submission accepts only known task types and bounded object payloads.');
 const queue=read('src/services/queueService.ts');
 test('Background queue never reports simulated delivery as completed', !queue.includes('dispatchedCount') && !queue.includes('financialsReconciled') && !queue.includes('remindersSent: true') && !queue.includes('setInterval('), 'No fake worker may report SMS, email, backup, pastoral or financial work as completed.');
 test('Background queue fails closed without a durable backend', queue.includes("backend: 'unavailable'") && queue.includes('available: false') && queue.includes("code = 'QUEUE_BACKEND_UNAVAILABLE'") && queue.includes('throw new QueueBackendUnavailableError()'), 'Queue submissions must be rejected until a durable backend is implemented.');
 test('Queue API returns 503 when durable backend is unavailable', system.includes("code: 'QUEUE_BACKEND_UNAVAILABLE'") && system.includes('res.status(503)'), 'Callers must receive an explicit service-unavailable response, not a false accepted status.');
 const backupService=read('server/services/backupService.ts');
 test('Backup service rejects ephemeral serverless storage', backupService.includes('if (IS_SERVERLESS)') && backupService.includes("code: 'BACKUP_STORAGE_UNAVAILABLE'") && backupService.includes('Local /tmp storage is ephemeral'), 'Vercel temporary storage must not be presented as durable backup storage.');
 test('Backup endpoints expose explicit unavailable status for ephemeral storage', (system.match(/BACKUP_STORAGE_UNAVAILABLE/g) || []).length >= 2, 'Both backup creation endpoints must return HTTP 503 when durable storage is unavailable.');
 const queueRoutes=read('src/routes/queueRoutes.ts');
 test('Secondary queue API restricts stats and job listing to SYSTEM_ADMIN', (queueRoutes.match(/requireRoles\('SYSTEM_ADMIN'\)/g) || []).length >= 3 && !queueRoutes.includes("requireRoles('SYSTEM_ADMIN', 'MANAGER')"), 'No manager or ordinary authenticated user may inspect operational queue data.');
 test('Secondary queue API fails closed when durable backend is unavailable', queueRoutes.includes("code: 'QUEUE_BACKEND_UNAVAILABLE'") && queueRoutes.includes('res.status(503)') && queue.includes('public getJobs('), 'All queue entry points must return an unavailable result rather than fake or unhandled jobs.');
 const failed=checks.filter(x=>!x.passed);
 for(const item of checks)console.log(`${item.passed?'PASS':'FAIL'}  ${item.name} — ${item.details}`);
 console.log(`\\n${checks.length-failed.length}/${checks.length} architecture checks passed.`);
 if(failed.length)process.exitCode=1;
}
main();
