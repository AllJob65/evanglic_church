# Phase 1–2: PostgreSQL and Security Audit

Date: 2026-10-15
Repository: `AllJob65/New_CMMS_New`
Target branch: `main`
Working branch: `audit/phase-1-2-postgres-foundation`

## Scope and safety

This branch contains an audit and a migration-runner safety guard only. No live database DDL, data writes, migrations, policy changes, or auth-trigger changes were executed. Supabase inspection was read-only.

## Verified live database observations

- Supabase project has PostgreSQL 17 and the supplied core tables are already present.
- At inspection time: 1 tenant, 1 branch, 3 profiles, 0 member rows.
- Supabase migration history API returned an empty list.
- Live `profiles.id` is UUID and references `auth.users(id)`; the deployed profile table has only the basic profile columns (no `member_id`, `branch_ids`, or additional-role columns).
- Live `members.id` is UUID. The member table includes `member_number`, `phone`, and date/status fields; it does not match the full frontend Member interface.
- Live `ministry_members` uses UUID `ministry_id` and `member_id` foreign keys.

## Critical security findings

1. Eight exposed business tables have broad authenticated RLS policies with `USING (true)`; write policies use `FOR ALL` without a tenant or role predicate. This includes members, families, attendance, events, finance, pastoral records, workflows, and LMS courses.
2. The `auth.users` insert trigger calls `public.handle_new_user()`, a SECURITY DEFINER function owned by postgres. Its source trusts `new.raw_user_meta_data->>'role'`, picks an arbitrary tenant/branch using `LIMIT 1`, and has no fixed `search_path`.
3. Two public views, `view_member_demographics` and `view_monthly_attendance_by_week`, have no `security_invoker=true` reloption. Review grants and access before altering them.
4. Security advisor also flagged tables with RLS enabled but no policies, leaked-password protection disabled, and multiple permissive policies / missing FK indexes.
5. Existing helper migration 019 is incompatible with the deployed profile shape: it references profile fields such as `member_id` not present in the live table; it also compares UUID profile IDs through text casts and its ministry helper references legacy membership columns absent from the supplied deployed schema.
6. Existing migration 004 creates a legacy profiles shape (TEXT primary key and many extra columns), unlike the deployed UUID/auth.users-linked profile table. Migration 005 and later migrations also need a table/column-by-column drift review.
7. Existing migration filenames have duplicate numeric prefixes (001, 002, 018), while the custom runner sorts lexicographically and tracks filenames in `schema_migrations`. Supabase migration history is empty, so it is unsafe to run this chain against the already-provisioned project.
8. The current API path remains JSON-backed: `server/routes/members.ts` uses `db.getState().members`; `server/routes/system.ts` builds `/system/state` from the JSON store; `server/db.ts` uses `/tmp/cmms_db.json` in serverless environments. PostgreSQL pool utilities exist but are not the active member repository.
9. The API client sends a local-storage `x-tenant-id` defaulting to a legacy string. This must never be used as the authority for tenant access; tenant and branch scope must come from a verified server-side profile.
10. `src/lib/supabase.ts` chooses among several key environment variables, including service-role/secret names. Browser filtering exists, but configuration must be tightened so privileged secrets are never compiled into client bundles.

## Migration-runner safeguard in this branch

`server/pg.ts` now checks for existing CMMS application tables before creating migration tracking metadata. If application tables exist but no migration history is recorded, it returns a clear safety error before running any DDL. This is intentionally conservative. It does not reconcile the existing schema or make any live database change.

## Target architecture

- One authoritative PostgreSQL database for durable CMMS application data. Remove JSON files as a production source of truth after each module is migrated and verified.
- Keep Supabase Auth for identity/session issuance if desired; PostgreSQL remains the authoritative profile, role, tenant, branch, member, and module data store.
- For Vercel, use the Supabase pooler with bounded connection pooling and serverless-safe lifecycle settings. For VPS/local, use the same PostgreSQL repository layer and environment-based connection configuration.
- Resolve the authenticated user from a verified Supabase access token; derive tenant UUID, branch UUIDs, active status, primary role, and additional roles from trusted server-side profile/role tables. Ignore client-supplied tenant headers for authorization.
- Keep UUID database primary keys and separate human-readable member numbers. Map frontend fields explicitly; ministry membership belongs in `ministry_members`.
- Apply least-privilege RLS per table. Pastoral records need confidentiality-specific predicates; financial records need distinct read/report and write permissions. Do not give SYSTEM_ADMIN automatic access to sealed pastoral notes unless explicitly authorized.
- Dual-role support should use normalized role assignments (or the already-designed role tables after confirming their live presence), not trust user metadata.
- Public registration must create a REGULAR_MEMBER profile through a constrained onboarding flow. Role elevation must be a privileged admin operation, never a user-editable metadata value.

## Required next implementation steps

### Phase 1 — security baseline
1. Capture a database backup/snapshot and export current schema, grants, policies, views, triggers, and functions.
2. Agree the exact permission matrix for SYSTEM_ADMIN, PASTOR, MINISTRY_LEADER, REGULAR_MEMBER, including dual-role combinations, branch scope, pastoral confidentiality, finance reporting, and public registration.
3. Build a new idempotent security migration specifically against the deployed schema. Replace permissive policies with tenant/branch/permission-aware policies; fix the auth trigger to ignore user metadata for roles, set a fixed search_path, and use a controlled tenant/branch onboarding context.
4. Change views to security-invoker only after verifying the required grants and intended behavior.
5. Re-run Supabase security/performance advisors and test positive and negative cases for each role and tenant.

### Phase 2 — PostgreSQL application foundation
1. Add a single typed PostgreSQL repository layer with parameterized queries and explicit row-to-domain mapping.
2. Migrate Members GET/POST/PUT/DELETE/export and dashboard state counts to PostgreSQL; preserve current API response contracts and pagination/filter behavior.
3. Add an explicit account-to-member link using a UUID FK/unique constraint and safe backfill rules; do not rely only on matching email.
4. Derive tenant/branch context from verified profile data; never accept a client tenant header as an authorization source.
5. Keep all remaining modules on the legacy store until each has its own repository and tests; do not run dual writes as a permanent architecture.
6. Add integration tests for role/tenant/branch isolation, member create/list/update, dashboard counts, and concurrent requests.

## Release gates

- No migration is run against production until a schema diff and backup have been reviewed.
- Do not baseline old migrations as applied unless each file is proven equivalent to the deployed schema.
- No migration auto-runs during Vercel cold start.
- Production cutover requires verified backup/restore, RLS tests, app smoke tests on Vercel and VPS, and a rollback plan.
