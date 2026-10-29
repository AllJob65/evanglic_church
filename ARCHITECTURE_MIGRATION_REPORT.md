# CMMS Production Architecture Audit & Migration Report

## 1. Target Production Architecture

| Layer | Authoritative Production Technology | Entry Point / Implementation |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite SPA | `src/main.tsx`, `src/App.tsx`, `src/services/api.ts` |
| **Backend** | Node.js + Express REST API | `server.ts`, `server/routes/*` |
| **Database** | PostgreSQL / Supabase PostgreSQL | `server/pg.ts` + `server/db.ts` (PostgreSQL-backed engine) + `server/migrations/*.sql` |
| **Authentication** | Supabase Auth + Express JWT Verification | `src/lib/supabase.ts`, `src/context/AuthContext.tsx`, `server/routes/auth.ts`, `src/security/authorization.ts` |
| **Storage** | Supabase Storage | `src/services/storageService.ts`, `server/routes/system.ts` (`/api/system/storage/upload`) |
| **Realtime** | Socket.IO on VPS (`/socket.io`) | `src/services/socketService.ts`, `src/components/RealtimeConnectionIndicator.tsx`, `src/hooks/useMinistryRealtime.ts` |

---

## 2. Classification & Audit of Duplicate / Legacy Systems

### 2.1 Firebase (`src/firebase.ts`, `firebase-applet-config.json`, `package.json`)
1. **Production code usage**: **No.** Zero components or backend routes import `src/firebase.ts`.
2. **Dependent features**: None in production. Previously used as an early prototype auth/database experiments.
3. **Migration to target architecture**: Authentication is handled by **Supabase Auth** (`src/lib/supabase.ts` + `server/routes/auth.ts`).
4. **Obsolete implementation removed**: `src/firebase.ts`, `firebase` manual chunk in `vite.config.ts`, Firebase CSP domains in `server/middleware/httpSecurity.ts`.
5. **Imports updated**: Removed all references to `firebase`.
6. **Environment variables**: Standardized on `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### 2.2 Firestore (`src/services/firestoreService.ts`, `scripts/inspect-firestore.ts`)
1. **Production code usage**: **No.** Zero modules import `src/services/firestoreService.ts`. `src/components/SearchModal.tsx` had a stale UI subtitle mentioning "snapshot Firestore".
2. **Dependent features**: None in production.
3. **Migration to target architecture**: All CRUD operations flow through `src/services/api.ts` -> Express Backend (`/api/*`) -> PostgreSQL / Supabase PostgreSQL.
4. **Obsolete implementation removed**: `src/services/firestoreService.ts`, `scripts/inspect-firestore.ts`.
5. **Imports & UI copy updated**: Updated `src/components/SearchModal.tsx` to reference PostgreSQL / Supabase backups.

### 2.3 Prisma (`src/prisma/index.ts`, `src/prisma/schema.prisma`, `src/controllers/*`, `src/routes/*`, `src/services/{member,attendance,pastoral,approval,auth}Service.ts`)
1. **Production code usage**: `src/prisma/index.ts` was a **mock adapter** (`PrismaClientAdapter`) wrapping `server/db.ts`, not a real Prisma client (`@prisma/client` is not installed). It was only referenced by legacy v4 controllers (`src/controllers/*`) and `src/routes/index.ts`.
2. **Dependent features**: Legacy `/api/v4` and `/api/approvals` routes in `server.ts`, while the frontend exclusively uses `/api/auth`, `/api/members`, `/api/attendance`, `/api/pastoral`, `/api/workflows`, `/api/system`, `/api/conversations`, `/api/bible`, `/api/devotions` in `server/routes/*`.
3. **Migration to target architecture**: All REST endpoints are consolidated under `server/routes/*` with strict RBAC (`src/security/authorization.ts`).
4. **Obsolete implementation removed**:
   - `src/prisma/index.ts` & `src/prisma/schema.prisma`
   - `src/controllers/memberController.ts`, `attendanceController.ts`, `pastoralController.ts`, `approvalController.ts`, `authController.ts`
   - `src/services/memberService.ts`, `attendanceService.ts`, `pastoralService.ts`, `approvalService.ts`, `authService.ts`
   - `src/routes/index.ts`, `memberRoutes.ts`, `attendanceRoutes.ts`, `pastoralRoutes.ts`, `approvalRoutes.ts`, `authRoutes.ts`, `queueRoutes.ts`, `members.server.tsx`
   - `app/routes/members.tsx`, `app/utils/supabase.server.ts`, `src/utils/supabase.server.ts`
   - `src/middleware/authMiddleware.ts`, `rbacMiddleware.ts`, `tenantMiddleware.ts` (superseded by `src/security/authorization.ts`)

### 2.4 Duplicate Frontend Supabase Table Services (`src/services/supabase*Service.ts` & `src/utils/supabase.ts`)
1. **Production code usage**: `src/services/api.ts` previously contained split-brain conditional logic (`if (isSupabaseConfigured) { try { return supabase*Service... } catch {} } return request('/api/...')`) that randomly bypassed the Express backend's RBAC, audit logging, rate-limiting, and camelCase/snake_case normalization. Additionally, `src/utils/supabase.ts` duplicated `src/lib/supabase.ts`.
2. **Dependent features**:
   - `src/services/api.ts` (Members, Families, Ministries, Attendance, Events, Pastoral, Workflows, Assets, Documents, LMS Courses, Volunteers, Audit Logs)
   - `src/components/AttendanceModule.tsx` & `src/components/Member/MemberAttendancePortal.tsx` (`supabaseAttendanceService`)
   - `src/components/MinistryModule.tsx`, `src/components/MinistryLiveChatModal.tsx`, `src/components/GroupLeader/StartConference.tsx`, `src/components/Member/MemberGroupPortal.tsx`, `src/hooks/useMinistryRealtime.ts` (`supabaseMinistryService`)
   - `src/components/RealtimeConnectionIndicator.tsx` (previously used Supabase Realtime `postgres_changes` instead of Socket.IO on VPS)
3. **Migration to target architecture**:
   - **API Calls**: `src/services/api.ts` now routes **100% of data operations** through the authoritative Node.js + Express backend (`/api/*`), eliminating split-brain client-side table queries.
   - **Realtime**: `src/components/RealtimeConnectionIndicator.tsx` and `src/hooks/useMinistryRealtime.ts` now connect to **Socket.IO on VPS** (`/socket.io`) and `/api/ministry-collab/*` Express endpoints.
   - **Storage**: File uploads (profile photos, church branding assets, documents, chat attachments) use the unified **Supabase Storage** service (`src/services/storageService.ts` + `/api/system/storage/upload`).
   - **Single Supabase Auth Client**: Consolidated onto `src/lib/supabase.ts`; removed duplicate `src/utils/supabase.ts`, `src/utils/supabase.server.ts`, and `app/utils/supabase.server.ts`.
4. **Obsolete implementation removed**:
   - `src/utils/supabase.ts`, `src/utils/supabase.server.ts`, `app/utils/supabase.server.ts`
   - `src/services/supabaseAssetService.ts`, `supabaseAuditService.ts`, `supabaseDocumentService.ts`, `supabaseEventService.ts`, `supabaseFamilyService.ts`, `supabaseLmsService.ts`, `supabaseMemberService.ts`, `supabasePastoralService.ts`, `supabaseVolunteerService.ts`, `supabaseWorkflowService.ts`
   - Refactored `src/services/supabaseAttendanceService.ts` and `src/services/supabaseMinistryService.ts` to delegate exclusively to the Express API (`/api/attendance/*`, `/api/ministry-collab/*`, `/api/video-conferences/*`) and Socket.IO (`/socket.io`) without direct browser table queries or hardcoded mock fallbacks.

### 2.5 Direct `pg` (`server/pg.ts`) & Local Persistence Engine (`server/db.ts`)
1. **Production code usage**: **Yes.** `server/pg.ts` manages the PostgreSQL connection pool (`DATABASE_URL` / Supabase PostgreSQL connection string) and SQL schema migrations (`server/migrations/*.sql`). `server/db.ts` provides the synchronous relational state engine backed by PostgreSQL synchronization and transactional snapshots for `server/routes/*`.
2. **Dependent features**: All Express routes (`server/routes/*`), automated backup/restore (`server/services/backupService.ts`), and migration runner (`scripts/migrate.ts`).
3. **Target architecture alignment**: Unified so `server/pg.ts` + `server/db.ts` operate as one cohesive PostgreSQL-backed persistence layer for the Express backend.

### 2.6 Mock Data (`src/data/mockData.ts` & inline mock fallbacks)
1. **Production code usage**:
   - `src/context/CMMSContext.tsx` previously fell back to `initialMembers`, `initialBranches`, etc. from `src/data/mockData.ts` if an API request failed.
   - `server/routes/workflows.ts` imported `initialWorkflows` as a fallback when updating a non-existent workflow ID.
   - `src/services/supabaseMinistryService.ts` had inline `fallbackMessages`, `fallbackMembers`, `fallbackActivityLogs`, and `getDefaultMinistries()`.
2. **Migration to target architecture**:
   - Removed mock data fallbacks from `src/context/CMMSContext.tsx` (state is strictly loaded from the Express backend `/api/system/state` and `/api/*` endpoints).
   - Removed `initialWorkflows` fallback from `server/routes/workflows.ts` (returns proper `404 Not Found` if a workflow ID does not exist).
   - Removed inline mock arrays from `src/services/supabaseMinistryService.ts` (fetches real records from `/api/ministry-collab/*`).
   - Retained `src/data/mockData.ts` solely as the initial database seed catalog for `server/db.ts` when bootstrapping an empty database or running factory reset.

### 2.7 In-Memory Stores
1. **Production code usage**:
   - `server/middleware/rateLimiter.ts` & `src/services/socketService.ts`: In-memory sliding-window rate-limiting and active Socket.IO connection tracking (appropriate for single-VPS Node.js + Socket.IO runtime).
   - `src/services/queueService.ts`: In-memory async job queue for background notifications.
2. **Target architecture alignment**: Retained strictly for ephemeral runtime state (Socket.IO connections, rate limit counters, and background job metrics), never as a competing database for domain entities.
