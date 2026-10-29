# Phase 1 — PostgreSQL source-of-truth migration inventory

Status: **Discovery and design only. No data or schema changes have been made.**

## Objective

Move all operational CMMS state to the existing PostgreSQL/Supabase database. PostgreSQL must be the sole authoritative store across Vercel, VPS, and local development. The JSON store must not remain a fallback write path after migration.

## Confirmed legacy persistence design

`server/db.ts` defines a process-wide `DatabaseStore` that loads `cmms_db.json`, and writes snapshots with filesystem operations. In serverless mode it selects `/tmp/cmms_db.json`; it can also fall back to the bundled repository copy. This is not durable shared storage across Vercel instances or cold starts.

The store includes far more than member records: authentication/security state, audit history, pastoral information, attendance, communication, Bible reader state, collaboration/chat, LMS, ministry plans, assets/documents, workflows, backup configuration and logs.

## Initial route/service inventory

The following server areas have direct dependencies on `db.getState()`, `db.persist()`, `db.save()`, or other JSON-store methods. This is a source scan, not a claim that every operation in each file has been exhaustively classified.

| Area | Files | Data domains requiring PostgreSQL mapping |
|---|---|---|
| Attendance | `server/routes/attendance.ts` | attendance sessions, attendance records, member lookups, audit events |
| Pastoral care | `server/routes/pastoral.ts` | prayer requests, counseling sessions, visitations, broadcast communications |
| Identity and security | `server/routes/auth.ts` | local system users, invitation state, MFA secrets, sessions, refresh-token consumption, revocations, security alerts, audit events |
| Audit | `server/routes/audit.ts` | audit history, integrity metadata/checkpoints |
| Bible | `server/routes/bible.ts` | notes, highlights, bookmarks, reading history/plans/settings, messages and recipients |
| Communications | `server/routes/communications.ts` | communication logs, recipients/member lookups, message state |
| Collaboration | `server/routes/conversations.ts`, `server/services/conversationService.ts` | conversations, participants, messages |
| Devotions | `server/routes/devotions.ts` | devotion content, reactions, comments |
| Group chat | `server/routes/groupChats.ts` | group chat sessions and membership/state |
| LMS and workflows | `server/routes/lms.ts`, `server/routes/workflows.ts` | courses, workflow requests and transitions |
| Ministry collaboration/plans | `server/routes/ministryCollab.ts`, `server/routes/ministryPlans.ts`, `server/services/membershipService.ts` | ministry membership, annual plans, review history, quarterly/annual reports, permission-denied telemetry |
| System settings | `server/routes/system.ts` | branding, security configuration, backup configuration, system-state/dashboard counts |
| Volunteers and resources | `server/routes/volunteers.ts` | volunteer shifts, assets, documents and document categories |
| Backup/restore | `server/services/backupService.ts` | snapshot creation, restore, backup logs and configuration |

Other routes/services may use direct PostgreSQL or Supabase repositories already. They must be audited for mixed read/write paths and tenant scoping before the migration is complete.

## Migration design principles

1. **No blind JSON import.** First inventory the deployed schema, constraints, foreign keys, enum/check constraints, RLS policies, triggers, and existing row counts.
2. **Preserve identifiers and relationships.** Keep existing IDs where compatible; explicitly map legacy IDs and tenant/branch ownership. Resolve collisions before writes.
3. **No destructive cleanup.** Preserve the source JSON and backups as restricted, immutable migration inputs until row counts, checksums, and relationship checks pass and a restore has been tested.
4. **Tenant and branch isolation.** Every tenant-owned record must carry or inherit a verified tenant boundary and, where applicable, branch boundary. Do not infer tenant ownership from a default tenant when it is ambiguous.
5. **Sensitive data separation.** Counseling, prayer/pastoral notes, MFA secrets, tokens, API keys, and session state require least-privilege access and appropriate encryption/retention. Never copy secrets into logs or migration reports.
6. **Transactional, idempotent import.** Use deterministic upserts or a migration ledger, batch writes, and explicit conflict handling. Re-running a completed batch must not duplicate records.
7. **Audit integrity.** Preserve historical audit records exactly; verify their existing hashes before import. New audit events must be committed durably with the business transaction or through a reliable outbox.
8. **No dual-write as a permanent architecture.** Any temporary compatibility period must have one authoritative write path, explicit reconciliation, and a defined removal date.
9. **Backups before cutover.** Produce encrypted database backup and source snapshot; test restore into a non-production target before changing runtime reads/writes.
10. **No mock-data seeding in production.** Production initialization must not silently insert demo members/users/records or reset live data.

## Required schema mapping before implementation

| Legacy state collection/config | Required destination review |
|---|---|
| branches, members, families, ministries | Existing relational tables and tenant/branch foreign keys |
| attendanceRecords, attendanceSessions | `attendance_records`, session table(s), session-member uniqueness and status constraints |
| prayerRequests, counselingSessions, visitations | Dedicated pastoral tables with strict RLS and role-based authorization |
| communications, communicationLogs | communication/message tables and delivery logs |
| workflows, profileChangeRequests, registrationInvitations | workflow/application/invitation tables and approval history |
| systemUsers, securitySessions, consumedRefreshTokens, securityAlerts, userRevocations | Supabase Auth/profile/RBAC/session/revocation design; never import plaintext credentials or tokens |
| auditLogs, permissionDeniedLogs | append-only audit/security event tables and integrity verification |
| assets, documents, documentCategories, volunteerShifts | resource/document metadata tables; file bytes belong in protected object storage |
| courses | LMS course tables |
| devotions, devotionReactions, devotionComments | devotion/content/reaction/comment tables |
| bibleNotes, bibleHighlights, bibleBookmarks, bibleReadingHistory, bibleReadingPlans, bibleSettings, bibleMessages, bibleMessageRecipients | per-user Bible data tables with owner-scoped RLS |
| ministryMembers, ministryAnnualPlans | ministry membership/planning/reporting tables |
| conversations, conversationParticipants, conversationMessages, groupChatSessions | collaboration/chat tables with participant-level access |
| branding, smsConfig, securityConfig, apiKeys, webhooks, backupConfig, backupLogs | tenant settings and protected secret/configuration storage; secrets must not be stored in ordinary JSON or exposed to clients |

The mapping above is a checklist, **not confirmation that each destination table exists**. Confirm exact deployed table names and columns before authoring SQL.

## Migration phases and acceptance gates

### 1A — Complete inventory (current)
- Enumerate every JSON-store consumer in server routes, services, background jobs, scripts, and tests.
- Inventory deployed PostgreSQL tables, columns, constraints, policies, triggers, and row counts.
- Classify each legacy field as relational data, protected secret, object-storage metadata, derived cache, or obsolete/demo data.
- Identify tracked JSON/backup files and assess whether they contain real personal or security-sensitive data without publishing record contents.

**Gate:** reviewed source-to-target mapping with no unexplained fields or modules.

### 1B — Schema and repository implementation
- Add/adjust migrations only after validating against the live schema and existing migration ledger.
- Implement typed repositories and transactional service methods.
- Replace route-level in-memory mutation with repository calls.
- Preserve API contracts and enforce tenant/branch scoping in the repository layer and RLS.

**Gate:** tests prove all writes are PostgreSQL-backed and all reads use the authoritative database.

### 1C — Controlled data migration
- Create verified, encrypted source and destination backups.
- Run dry-run validation, then idempotent batch import in staging.
- Compare per-table counts, IDs, checksums, foreign-key integrity, tenant/branch ownership, and audit-chain integrity.
- Test restore and application workflows against migrated staging data.

**Gate:** zero unexplained record loss, duplication, orphaning, or authorization leakage.

### 1D — Cutover and JSON retirement
- Schedule approved production backup and maintenance window.
- Switch all runtime paths to PostgreSQL.
- Monitor error rates and data consistency.
- Keep the legacy source read-only and retained for the agreed rollback window.
- Remove runtime JSON fallback only after production validation and explicit cutover approval.

**Gate:** no operational `db.getState()` / `db.persist()` usage remains; no production route depends on local filesystem persistence.

## Known guardrails for this repository

- Do not apply migrations 026–028.
- Do not merge PR #4.
- Validate any proposed SQL against the deployed schema and migration ledger first.
- Do not run production migrations, alter/delete live data, merge this PR, or deploy without explicit approval.
- Do not expose database credentials, member records, pastoral notes, MFA secrets, tokens, or backup contents in source control or PR discussion.

## Current result

This document records the initial inventory and migration plan only. No PostgreSQL writes, migrations, JSON edits, deployments, or production configuration changes were performed.
