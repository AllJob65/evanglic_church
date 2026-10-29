# Phase 1C — attendance conversion: schema compatibility and implementation gate

Inspection date: 2026-10-26
Scope: source code and deployed schema only. No database writes, migrations, RLS changes, or runtime edits.

## Decision

**Do not convert attendance route handlers yet.** The current API/domain identifiers and the deployed relational schema are not compatible without a deliberate mapping and API compatibility layer. A mechanical rewrite would cause UUID cast errors, broken foreign keys, or changed client contracts.

This is a verified implementation blocker, not a reason to retain JSON as the long-term store.

## 1. Deployed attendance schema

### `public.attendance_sessions`

| Column | Type | Null | Default |
|---|---|---:|---|
| id | uuid | no | gen_random_uuid() |
| tenant_id | uuid | no | — |
| branch_id | uuid | no | — |
| session_code | text | no | — |
| group_id | uuid | yes | — |
| group_name | text | yes | — |
| leader_user_id | uuid | yes | — |
| leader_name | text | yes | — |
| session_type | text | no | 'instant' |
| title | text | no | — |
| service_type | text | no | 'Ministry Attendance' |
| status | text | no | 'active' |
| start_time | timestamptz | no | now() |
| end_time | timestamptz | yes | — |
| qr_payload_token | text | no | — |
| location | text | yes | — |
| attendee_count | integer | no | 0 |
| session_data | jsonb | no | '{}' |

Constraints include UUID primary key, tenant/session-code uniqueness, QR-token uniqueness, tenant/branch relationships and status/count/session_data checks. Exact constraint expressions should be re-read before migration authoring.

### `public.attendance_records`

| Column | Type | Null | Default |
|---|---|---:|---|
| id | uuid | no | gen_random_uuid() |
| tenant_id | uuid | no | — |
| branch_id | uuid | no | — |
| event_name | text | no | — |
| service_type | text | no | — |
| member_id | uuid | yes | — |
| visitor_name | text | yes | — |
| visitor_phone | text | yes | — |
| checkin_method | text | yes | 'Manual' |
| checkin_time | timestamptz | no | now() |
| session_id | uuid | yes | — |
| record_code | text | yes | — |
| member_name | text | yes | — |
| status | text | no | 'Present' |
| absence_reason | text | yes | — |
| notes | text | yes | — |
| service_session | text | yes | — |
| event_id | uuid | yes | — |

The table has tenant, branch, member, event and session foreign-key constraints. The composite tenant/branch/session relationships must be respected by repository writes.

## 2. Current API/domain mismatch

The TypeScript contract in `src/types.ts` defines:
- `AttendanceSession.id` and `sessionId` as strings; handlers currently generate values such as `session-<timestamp>` and `att_<suffix>`.
- `AttendanceRecord.id` and `sessionId` as strings; handlers currently generate values such as `att-rec-<timestamp>` and use the custom session code in `sessionId`.
- The session `groupId` is a string and may default to `min-001`, but the database `group_id` is UUID.
- Member IDs in the API are accepted as arbitrary strings, while database `member_id` is UUID.
- The API record has `date`, `time`, `checkInTime`, and `checkedInTime`; the database persists `checkin_time` as a timestamp and has no independent `date` column.
- The API has multiple check-in status/method spellings; database columns are text but existing check constraints and downstream reporting must be checked before normalizing.

### Required compatibility design

- Database UUID `attendance_sessions.id` is the canonical internal session key.
- `session_code` is the stable public/API session identifier, preserving the existing `sessionId` property without pretending it is a UUID.
- `attendance_records.session_id` stores the canonical UUID, not the public session code.
- `record_code` stores the API-facing attendance record identifier if clients depend on it; the canonical record `id` remains UUID.
- Resolve member IDs against the tenant-scoped members table; reject invalid/nonexistent IDs before insert.
- Derive date/time response properties from `checkin_time` using a documented timezone policy. Do not rely on server locale or UTC date slicing for a local Ethiopian church service.
- Resolve group/ministry IDs to actual UUIDs or store the legacy label/reference safely in `session_data`; do not cast values like `min-001` to UUID.
- Keep response objects backward-compatible while returning canonical UUIDs in an additive field if needed.

## 3. Security and integrity blockers

1. RLS is disabled on `attendance_sessions`. No route conversion or direct client access should proceed until a least-privilege policy model is implemented and tested in staging.
2. Existing policies on `attendance_records` are broad authenticated-role policies with `qual=true`; tenant/branch boundaries are not enforced by those policies.
3. QR tokens are currently generated with `Math.random()` in the route. Replace with cryptographically secure random bytes, sufficient entropy, hashed-at-rest token design if compatible with validation, rotation/revocation, and rate-limited validation.
4. Check-in duplicate prevention currently compares custom session code/service title/member/date in JSON. A database uniqueness strategy needs to account for tenant, session, member and attendance date; avoid title-based deduplication.
5. The check-in handler increments attendee_count and inserts the record as separate in-memory changes. PostgreSQL conversion must perform duplicate detection, insert, and count update in one transaction or use a single atomic SQL operation.
6. Socket notifications currently broadcast to all clients. Review tenant/branch room targeting before production attendance events are emitted from the new repository.
7. Attendance audit events must be durable. The existing route calls JSON-backed `db.addAuditLog`; either use a transactional audit insert/outbox or a reliable post-commit event path.

## 4. Required repository contract

Implement a typed repository with methods equivalent to:

- `listSessions(scope, filters)`
- `getSessionByCode(scope, sessionCode)`
- `createSession(scope, input)`
- `rotateSessionQr(scope, sessionCode, token)`
- `closeSession(scope, sessionCode, endTime)`
- `listAttendanceRecords(scope, filters)`
- `createAttendanceRecord(scope, input)`
- `createSessionCheckIn(scope, input)` (atomic duplicate check, record insert, count update)
- `createBulkAttendanceRecords(scope, inputs)` (transactional and bounded)
- `getAttendanceLiveCounts(scope, date) `

Every query must include tenant scope and branch scope. Do not trust client-supplied tenant, leader, member, branch, or role fields. The service layer must derive actor and scope from the verified authentication context.

## 5. Conversion and test sequence

1. Confirm exact check constraints, FK definitions, unique indexes and deployed migration history.
2. Agree the public ID compatibility strategy above; identify any client code relying on legacy IDs.
3. Write repository and mapping tests against a disposable local/staging database matching the live schema.
4. Add RLS policies to a staging target first and test anonymous, authenticated regular member, ministry leader, pastor, system administrator and server service-role behavior.
5. Convert handlers to async repository calls and remove attendance's JSON access only after all endpoint tests pass.
6. Verify concurrency: simultaneous duplicate check-ins, QR rotation vs check-in, close vs check-in, and bulk import failure rollback.
7. Test response compatibility with existing attendance UI and socket consumers.
8. Only then plan controlled data import and production cutover.

## 6. Endpoints that must be covered

- GET `/attendance/sessions`
- GET `/attendance/sessions/:sessionId`
- POST `/attendance/sessions`
- POST `/attendance/sessions/:sessionId/rotate`
- POST `/attendance/sessions/:sessionId/close`
- POST `/attendance/sessions/:sessionId/checkin`
- GET `/attendance`
- POST `/attendance`
- POST `/attendance/check-in/qr`
- POST `/attendance/bulk`
- GET `/attendance/live-counts`

The event endpoints in the same route file already use PostgreSQL and must remain unchanged by the attendance conversion.

## 7. Non-actions

No source runtime code changed. No SQL migrations, DDL/DML, RLS policies, production data access beyond metadata/constraint definitions, merge, or deployment occurred.
