# Production Release Blockers and Controlled Cutover Plan

**Release decision: NO-GO.** This is a source-code audit and implementation plan, not authorization to change a live environment.

## Verified blockers

### 1. JSON persistence remains active
`server/db.ts` loads `cmms_db.json` from the working directory, or `/tmp/cmms_db.json` on serverless deployments, and maintains in-memory application state. This is not durable shared persistence for multi-instance/serverless production.

Route inspection found JSON state reads/writes in authentication, Bible, communications, devotions, external API, LMS, ministry planning, pastoral, registration links, system, volunteers and workflows. PostgreSQL implementations exist for selected domains, including members, branches/ministries, attendance and ministry planning, but coverage is incomplete.

**Gate:** PostgreSQL must become the authoritative store for every production business domain. Production traffic must not rely on local JSON files or process memory for durable state.

### 2. Password recovery endpoints are disabled
In `server/routes/auth.ts`, `/forgot-password`, `/staff/forgot-password`, `/verify-reset-code` and `/reset-password` return HTTP 503 with `PASSWORD_RECOVERY_UNAVAILABLE`.

**Gate:** Implement and test provider-backed challenge delivery, verification, expiry, replay protection, password update, session revocation and audit trail. Do not use locally stored reset codes or unauthenticated password updates.

### 3. Authentication still writes a JSON user mirror
Staff login resolves a Supabase session/profile, then synchronizes a local `db.systemUsers` mirror.

**Gate:** System-user administration, roles, tenant/branch assignments, MFA state and account status must be authoritative in the identity/profile database. Password hashes and recovery secrets must never be copied into application JSON state.

### 4. Tenant/branch isolation and pastoral confidentiality need end-to-end proof
Tenant filters in selected route handlers do not prove deployed RLS policies, database grants, cross-tenant isolation or confidential pastoral-record boundaries.

**Gate:** Run negative tests across at least two tenants and multiple branches for SYSTEM_ADMIN, PASTOR, MINISTRY_LEADER and REGULAR_MEMBER. Verify direct SQL access using each application database role. Validate the deployed schema without applying migrations during this audit.

### 5. Backup and recovery are not production-evidenced
Local backup features do not prove durable off-host backups or successful restoration.

**Gate:** Configure encrypted off-host backups, retention, access controls and alerting. Complete a restore drill in an isolated environment and record RPO/RTO.

## Implementation sequence

1. Map every JSON-backed entity to PostgreSQL tables, keys, tenant/branch scope and relationships. Identify unmapped fields before writing migrations.
2. Complete identity/profile persistence and provider-backed password recovery. Test login, refresh, MFA, password change, recovery and portal/role redirects.
3. Complete families, events, finance reporting, assets, documents and workflows with transaction-safe repositories.
4. Complete communications, devotions, Bible, pastoral, volunteers, LMS, integrations, chat and registration workflows.
5. Verify RLS, grants, tenant/branch isolation, least privilege, audit coverage and secret handling.
6. Rehearse migration in isolated staging; reconcile counts, relationships, duplicate handling and rollback. Do not use production for destructive rehearsal.
7. Prove off-host backup/restore, monitoring, incident response, deployment rollback and environment configuration.
8. Complete staging acceptance and obtain explicit release approval.

## Migration safety constraints

- Do not apply migrations 026–028.
- Do not apply any staging or production migration without explicit authorization and deployed-schema validation.
- Do not merge release changes or deploy production without explicit authorization.
- Preserve existing accounts, password hashes, MFA configuration, roles, tenant/branch relationships and business records.
- Prefer additive, reversible changes. Destructive cleanup requires separately approved backup and rollback plans.

## Final release gate

Production remains **NO-GO** until every requirement has implementation evidence, passing automated tests, successful staging acceptance and explicit deployment approval.
