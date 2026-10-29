# Phase 1–2 Implementation Status

Updated: 2026-10-15
Branch: `audit/phase-1-2-postgres-foundation`
Pull request: #4

## Implemented on this branch

### PostgreSQL member data path
- Added `server/repositories/memberRepository.ts` with parameterized PostgreSQL queries for member list/search/detail/create/update/delete.
- Member rows use UUIDs and tenant/branch UUID scope; the repository rejects invalid tenant/branch identifiers.
- The repository maps the deployed `members` columns and persists registration fields absent from the base table in structured JSONB sections in `member_details`.
- Ministry memberships are synchronized with `ministry_members` and checked to belong to the same tenant.
- Emergency contact and health fields are written to the separate `member_private_details` table. Standard member reads do not select or return this private table.
- Create/update writes use PostgreSQL transactions.
- Added tenant/branch ownership checks before member writes.

### API and dashboard
- Replaced the member CRUD/list/export/bulk/transfer/departure route implementations with PostgreSQL repository calls.
- Preserved the existing array response and optional pagination envelope.
- The authenticated server profile supplies tenant and branch scope. Client-supplied `x-tenant-id` is no longer sent by the frontend API client.
- Member create/update/delete/status/transfer/bulk/export actions append best-effort audit events to the PostgreSQL `audit_logs` table.
- The `/system/state` endpoint now loads member records from PostgreSQL when the authenticated profile has `members.read`; other system modules remain on the legacy JSON store.
- System-user creation validates an optional `memberId` against the same tenant before writing `profiles.member_id`.

### Reviewed SQL migrations prepared (not executed)
- `025_member_model_and_identity_links.sql`: profile/member link, normalized role and branch assignments, extended member detail tables, composite tenant/branch integrity constraints, and RLS enablement on the new tables.
- `026_auth_onboarding_and_role_backfill.sql`: backfills current primary roles/default branches and replaces the signup trigger so user-editable metadata cannot grant a privileged role or choose a tenant.
- `027_restrict_direct_member_table_access.sql`: removes direct browser-role privileges from the member tables after the API cutover is verified.
- `028_tenant_branch_role_rls_hardening.sql`: applies tenant/branch/role-scoped RLS after staging verification.
- `029_membership_application_payload.sql`: adds the JSONB member snapshot to PostgreSQL workflow requests so public applications retain registration details until approval.

### Migration runner
- Provisioned schemas now require the explicit `CMMS_MIGRATION_ALLOWLIST` environment variable on every migration run.
- The runner filters to the exact filenames in that allowlist; it does not automatically pick up the legacy migration chain.
- For the reviewed sequence after backup/staging verification, the allowlist is:
  `025_member_model_and_identity_links.sql,026_auth_onboarding_and_role_backfill.sql,027_restrict_direct_member_table_access.sql,028_tenant_branch_role_rls_hardening.sql,029_membership_application_payload.sql`
- Do not set this variable on production until the migration set has been reviewed and separately approved.

## Known limitations and release blockers

1. The live database has not been modified. SQL migrations 025–029 are review artifacts only.
2. Migration 028 now prepares tenant/branch/role-scoped RLS for the deployed public tables, but it has not been executed or tested against the live schema. Staging verification and fresh advisor results are still required. The Supabase Auth leaked-password protection setting must also be enabled in project Auth settings.
3. Session authorization now reads normalized PostgreSQL role and branch assignment tables when available, with a compatibility fallback for deployments that have not applied migrations 025/026. Account provisioning writes normalized assignments.
4. Public `/auth/register-public`, `/auth/register-onboarding`, membership application status, approval queue, and approval decisions now use PostgreSQL workflow requests. Registration invitation metadata remains in the legacy JSON store; invitation tokens are validated and usage counters updated there until that module is migrated.
5. Attendance, pastoral, workflow, communication, ministry annual-plan, Bible/devotion, collaboration, and other non-member module routes still include JSON-backed flows. The JSON store remains active for those modules.
6. Private emergency/health data is deliberately not returned by standard member reads. A separately permissioned API now exists; the member UI still needs a dedicated pastoral-only workflow.
7. Full branch/campus aliases still exist in parts of the legacy auth payload. The PostgreSQL member routes reject non-UUID branch identifiers rather than guessing mappings.
8. CSV export currently emits the PostgreSQL member list, but it needs explicit pagination/streaming for very large exports and audit logging in PostgreSQL.
9. The repository has not been compiled or integration-tested in this environment. GitHub Actions did not report any workflow run for the latest branch commit at inspection time.
10. Vercel/VPS cutover is not performed. Configure `DATABASE_URL` only as a server-side secret and use the correct Supabase pooler mode for serverless Vercel workloads.

## Required verification before merge or production use

- Run `npm ci`, `npm run lint`, and `npm run build` in CI.
- Run integration tests against a disposable PostgreSQL database provisioned from the exact deployed-schema snapshot.
- Test SYSTEM_ADMIN, PASTOR, MINISTRY_LEADER, REGULAR_MEMBER, dual-role combinations, tenant boundaries, all assigned branches, branch filtering, and branch transfer.
- Test registration form round-trip for every Member field and confirm private details are never exposed through ordinary list/state endpoints.
- Test account/member linkage and duplicate member-number behavior.
- Review and apply migrations to staging only after backup and rollback rehearsal.
- Re-run Supabase security/performance advisors and negative RLS tests.
- Only then approve production migration and deployment.

## Source-of-truth transition

Members, public membership applications, and membership approval decisions now use PostgreSQL-backed API paths. The application is not globally PostgreSQL-only: registration invitation metadata, families (some paths), profile changes, general workflows, audit logging, and several other modules still use the JSON state store. Do not delete or disable the JSON store until every remaining module has a repository, migration, parity tests, and a verified cutover.
