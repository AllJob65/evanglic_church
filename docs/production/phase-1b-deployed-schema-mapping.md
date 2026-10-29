# Phase 1B — deployed PostgreSQL mapping and blockers

Inspection date: 2026-10-26
Project: `sfyvdzqdbdmnaxwiiwer`
Method: Supabase schema/table metadata, migration ledger, read-only `pg_policies` query, and source inspection. No DDL/DML executed.

## 1. Deployed public tables

The current Supabase public schema exposes these 21 tables:

| Table | Rows reported | RLS | Application mapping / notes |
|---|---:|---|---|
| tenants | 1 | on | Tenant root |
| branches | 1 | on | Branch root; includes city, phone, status and branch_data JSONB |
| profiles | 3 | on | Auth identity profile; references auth.users; optional member_id |
| members | 0 | on | Core member records |
| families | 0 | on | Family/household records |
| ministries | 0 | on | Ministry records; ministry_data JSONB |
| ministry_members | 0 | on | Member-to-ministry join |
| attendance_records | 0 | on | Attendance check-ins; includes session_id |
| attendance_sessions | 0 | **off** | Attendance sessions and QR payload; critical RLS exposure |
| pastoral_records | 0 | on | General pastoral record table; sensitivity and authorization need review |
| financial_transactions | 0 | on | Finance records |
| workflow_requests | 0 | on | Includes pending_member_data JSONB and membership applications |
| events | 0 | on | Event records; event_data JSONB |
| volunteer_shifts | 0 | on | Volunteer scheduling |
| assets | 0 | on | Asset register |
| documents | 0 | on | Document metadata; file bytes should be in protected storage |
| lms_courses | 0 | on | Course catalogue |
| audit_logs | 0 | on | Audit records |
| profile_role_assignments | 0 | on | Multi-role grants |
| profile_branch_assignments | 0 | on | Branch grants |
| member_details | 0 | on | Extended registration/spiritual/household/professional/lifecycle JSONB |
| member_private_details | 0 | on | Emergency/health information; highly sensitive |

Row counts are the table-listing metadata at inspection time, not a guarantee that no records exist in external JSON backups, Auth, Storage, or other schemas.

## 2. Existing PostgreSQL repositories

Source inspection confirms PostgreSQL repositories already exist for:

- Core member CRUD and member details: `server/repositories/memberRepository.ts`.
- Membership application submission/listing/approval: `server/repositories/membershipWorkflowRepository.ts`.
- Direct PostgreSQL connectivity and transactions: `server/pg.ts`.

Attendance route has a mixed implementation: session and record operations at the beginning of `server/routes/attendance.ts` still mutate `db.getState()` / `db.persist()`, while event CRUD later in the same route uses SQL against `public.events`.

This mixed persistence is a concrete migration target. Do not replace it by simply changing the database adapter: the route handlers are currently synchronous and require deliberate async repository/service conversion and transaction handling.

## 3. Security finding — current RLS policies are not tenant isolated

Read-only inspection of `pg_policies` returned permissive policies with `qual = true` on:
- members
- families
- attendance_records
- events
- financial_transactions
- lms_courses
- pastoral_records
- workflow_requests

Their write policies also use `qual = true` and no `with_check` expression. These policies grant broad access to the authenticated database role; they do not enforce tenant, branch, ownership, or pastoral confidentiality boundaries at the database policy level.

Additionally, `attendance_sessions` has RLS disabled entirely. It contains `qr_payload_token` and session metadata.

**This is a production security blocker.** Application middleware may provide some checks, but it is not a substitute for database-level tenant/branch isolation, especially if clients can reach Supabase directly. No policy was changed. Enabling RLS on attendance_sessions without replacement policies could interrupt application access; policy design must be tested in staging and account for the backend service role versus authenticated client access.

## 4. Migration ledger and runner discrepancy to resolve

The live Supabase migration ledger currently reports only:
- `20261015174551 / 025_member_model_and_identity_links`
- `20261015174556 / 029_membership_application_payload`

The repository's Node PostgreSQL migration runner in `server/pg.ts` separately creates/uses `public.schema_migrations`, checks migration names/checksums, and executes discovered migration files. This is a second migration bookkeeping mechanism. Before any migration execution, determine which runner is authoritative, how the Supabase ledger and `schema_migrations` relate, and whether the repository's migration directories contain duplicate numbering or already-applied DDL.

The Supabase ledger and repository runner must not be assumed to be interchangeable. Prior constraints remain: do not apply 026–028 and do not merge PR #4.

## 5. Priority source-to-target map

| Module | Existing target(s) | Required work |
|---|---|---|
| Members and profile links | members, member_details, member_private_details, profiles, role/branch assignments | Existing repository review; verify private details and ministry membership writes are fully scoped and atomic |
| Membership applications | workflow_requests, members, member_details, member_private_details, ministry_members | Existing repository; verify full approval transaction and API/UI contract |
| Attendance | attendance_sessions, attendance_records | Replace all JSON session/check-in reads and writes; define safe QR token lifecycle and tenant/branch policies |
| Pastoral care | pastoral_records | Map prayer, counseling, visitation fields; preserve distinct confidentiality/access rules; likely schema extension or carefully modelled subtype |
| Events | events | Already SQL-backed in attendance route; review tenant/branch constraints and role permissions |
| Finance | financial_transactions | Audit remaining JSON use and finance authorization; no UI/runtime assumption |
| Volunteers | volunteer_shifts | Map JSON shift state; verify branch dimension and ministry/member FKs |
| Assets | assets | Map asset CRUD; verify branch_id and constraints |
| Documents | documents + Supabase Storage | Metadata mapping plus protected object storage, signed URL policy, confidentiality |
| LMS | lms_courses | Map course CRUD; identify missing enrollment/module/progress destinations |
| Audit | audit_logs | Move writes to durable append-only transactional path; preserve existing JSON audit history for controlled import |
| Roles/branches | profiles, profile_role_assignments, profile_branch_assignments | Verify authoritative role model; do not rely on profile.role alone |
| Workflows | workflow_requests | Map non-membership workflow types and state transitions; verify JSON columns/shape |
| Remaining modules | No confirmed target yet | Bible, devotions, conversations/chat, ministry plans/reports, collaboration, invitations, MFA/session/revocation, system settings, backup logs require explicit schema mapping or a decision to store elsewhere |

## 6. Immediate engineering sequence

1. Fix the data-access security design on a separate staging target: tenant/branch-aware RLS and least-privilege policies, including attendance_sessions. Test actual authenticated roles and service-role paths.
2. Complete a field-level map for attendance, pastoral, workflow, Bible, chat, ministry plans, and security/session state. Identify missing relational tables before writing migration SQL.
3. Inspect and reconcile both migration systems; validate exact deployed DDL and source migration files.
4. Convert one bounded module at a time (attendance is a candidate because its tables already exist) with repository methods, async route handlers, transaction tests, and no JSON fallback.
5. Keep all production DDL, data imports, RLS changes, deployment, and cutover behind explicit approval.

## 7. Explicit non-actions

No production data was read beyond schema metadata and policy definitions. No row contents, credentials, pastoral notes, or backup contents were accessed. No SQL writes, migrations, policy changes, source runtime edits, merges, or deployments were performed.
