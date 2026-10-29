# CMMS (New_CMMS_New-main) — Security & Architecture Audit, Phase 1–3

## 0. Scope — read this first

The archive has **351 files / ~34 000 lines** of server and client code. A faithful "rewrite everything line by line" is not something that can be done safely in one pass without running the app against your real Supabase project, so this is what was actually done:

**Audited in depth (read line-by-line where relevant):** `server.ts`, `.env.example`, root configs, `src/middleware/*`, `src/routes/*`, `src/controllers/authController.ts`, `src/security/jwtConfig.ts`, the token-resolution path of `src/security/authorization.ts` (L1280-1470, plus the resource-isolation helper ~L1715), `server/middleware/rateLimiter.ts`, `server/routes/system.ts` (backup/restore/reset/storage/queue), `server/db.ts` (persistence selection), `server/repositories/memberRepository.ts`, `src/services/storageService.ts`, `src/services/socketService.ts` (auth + rooms), the bundled `cmms_db.json` and `backups/`.

**Pattern-scanned only (not read in full):** all of `server/routes/*` (notably `auth.ts` 4 240 lines, `bible.ts` 2 679, `conversations.ts`, `communications.ts`, `registrationLinks.ts`, `ministryPlans.ts`, `externalApi.ts`, `integrations.ts`) for SQL string-building, outbound `fetch`, uploads and JWT signing.

**Not audited:** the SQL migrations and Supabase RLS policies, the ~100 React components, i18n, SMS/e-mail providers, and API-key/webhook handling in `externalApi.ts` / `integrations.ts`. **The RLS review is the most important remaining gap** (see §4).

Everything below marked *verified* was checked in code or by running it. Anything I could not confirm is labelled as such.

## 1. What is already good (don't rewrite it)

- Every SQL statement reviewed in the repositories and `members.ts` is parameterised (`$1…`); dynamic fragments are built from fixed column lists.
- Cookie-authenticated requests get CSRF verification; 5xx responses are masked by `globalErrorHandler`; CORS/Helmet/HSTS are centralised; queue and backup endpoints fail closed; the audit log is HMAC-chained.
- Existing suites pass on the untouched code: `test:security` 89/89, `test:ratelimit` 13/13, `tsc --noEmit` 0 errors.

## 2. Findings

| # | Sev | Finding | Evidence | Status |
|---|-----|---------|----------|--------|
| 1 | **High** | **Upload can be done two ways, both weak.** The server endpoint lets *any* authenticated user choose bucket, folder and content type, uses `upsert: true`, and on failure returns a data-URL of up to 50 MB as "success". The browser client additionally falls back to uploading **directly to Supabase Storage** (`upsert: true`, client-chosen path), bypassing all server checks. No `storage.objects` policies exist anywhere in the repo, so bucket security cannot be verified from code. | `server/routes/system.ts` (original L815-884); `src/services/storageService.ts` L43-88 | **Fixed** (patches 3 & 4). Bucket policies in the Supabase dashboard still need your review. |
| 2 | **High** (config-dependent) | **Local-JWT fallback can re-accept tokens Supabase just rejected.** If `getUser()` returns *any* error, the code falls through to `jwt.verify(token, JWT_SECRET)`. `jwtConfig.ts` allows `SUPABASE_JWT_SECRET` as `JWT_SECRET`; in that configuration a signed-out/banned Supabase session still has a valid signature. Also: no pinned algorithm, `exp` not required, and role/tenant/branch are taken from token claims when no stored account matches. | `src/security/authorization.ts` L1326-1395 (original), `src/security/jwtConfig.ts` | **Fixed**: Supabase-issued tokens are only accepted by Supabase; HS256 pinned; `exp`+subject required; 8 h max age. Claim-derived identity guard is **opt-in** (see §3). |
| 3 | **High** | **Rate limiting is weaker than it claims.** `REDIS_URL` logs "Redis-backed shared store" but no client is ever passed to the adapter; the fallback `Map` never evicts (unbounded memory), and on serverless each invocation has its own counters, so login/OTP brute-force limits are largely ineffective there. | `server/middleware/rateLimiter.ts` L53-160 | **Fixed** (patch 1 + `rateLimitStore.ts`). Needs `ioredis` + `REDIS_URL` to be shared across instances. |
| 4 | **High** | **Runtime data in the archive and shipped to functions.** `cmms_db.json` (a real SYSTEM_ADMIN identity with MFA off, 28 session records with token hashes, 120 audit rows, test accounts) and 10 backup files are in the zip despite `.gitignore`; `vercel.json` explicitly bundles `cmms_db.json` into every serverless function. | `vercel.json`; archive root; `backups/` | `vercel.json` **fixed**. **You must** purge these from the repo/history, revoke all sessions and rotate the admin credentials. |
| 5 | Med | **Tenant middleware trusts the client and invents defaults.** Unauthenticated callers choose tenant/branch via `X-Tenant-ID`/`?tenantId`; missing values default to `'tenant-grace-main'`/`'br-1'`; PASTOR/MANAGER can select any branch string; ids are echoed in response headers. (Currently unreachable unauthenticated because every router authenticates first, but it is a trap for the next route.) | `src/middleware/tenantMiddleware.ts` | **Fixed** (drop-in replacement). |
| 6 | Med | **"Default tenant" aliasing weakens isolation.** Resources and users whose tenant is `tenant-grace-main` *or any id starting `773627bc`* are treated as the same tenant; `'br-001'`/`'br-1'` and `tenantName: 'Grace Cathedral Ministries'` are hard-coded in the auth path. This is a single-tenant assumption inside a multi-tenant design. | `authorization.ts` L800-830, L1136, L1385, L1725 | **Not changed** — needs a design decision. |
| 7 | Med | **Token lifetime contradicts policy.** `securityConfig.jwtLifespanHours` is 8, but the token minted after a password change lives **7 days**. | `server/routes/auth.ts` L1354-1366 | Mitigated by the 8 h max-age check; change `expiresIn` to match. |
| 8 | Med | **State lives in a per-instance JSON file.** On Vercel `server/db.ts` uses `/tmp/cmms_db.json` (L175-177); sessions, revocations, security alerts, system users and the audit chain are in that file, while members etc. are in Postgres, plus Supabase, a vestigial Firestore client and an unused Prisma schema. Revocation/lockout state may not be shared across instances. *(I verified where the file lives; I did not trace every consumer of it.)* | `server/db.ts`, `cmms_db.json` keys | **Not changed** — architectural (§4). |
| 9 | Med | **TypeScript is not strict**; 873 explicit `any`. `npm run lint` passing means little. | `tsconfig.json` | `tsconfig.strict.json` ratchet provided; all new files pass `strict`. |
| 10 | Med | **Pre-existing failing RBAC test.** Spec says PASTOR must *not* have `canManageMinistries`; code grants it. Fails identically before and after my changes. | `scripts/test-rbac-architecture.ts:125` | **Needs your decision** (fix test or policy). |
| 11 | Low | `src/controllers/authController.ts` is dead code (no importers) with dangerous defaults (`'usr-1'`, `'admin@gracecathedral.org'`) and returns raw `err.message` on login. | file | Delete it. |
| 12 | Low | Hard-coded Supabase project URL + anon key as env fallback (`externalApi.ts:655`). The anon key is public by design, but silently pointing at one specific project hides misconfiguration. Firebase web config is committed (also public by design) for a service that `firestore.rules` locks entirely. | `server/routes/externalApi.ts` | Remove fallback; remove Firebase if unused. |
| 13 | Low | `listMembers`: `LIMIT ${limit}` is clamped, but a non-numeric `limit` becomes `NaN` → SQL error (not injection). | `memberRepository.ts` L98 | Guard with `Number.isFinite`. |
| 14 | Low | `/api/approvals` mounts the whole modular router (→ `/api/approvals/approvals/…`); `/api/v1` and `/api/v4` mount the same router; two queue implementations. | `server.ts` | Clean up. |
| 15 | Low | The global limiter runs before authentication, so its `keyType: 'user'` always degrades to IP; churches behind one NAT may be throttled together. *(Inferred from mount order, not load-tested.)* | `server.ts`, `rateLimiter.ts` | Mount a second, per-user limiter after auth. |

## 3. Apply the patches

From the project root (`$H` = this folder):

```bash
# new files
cp $H/server/middleware/rateLimitStore.ts server/middleware/
cp $H/server/routes/storageUpload.ts      server/routes/
cp $H/src/security/sovereignJwt.ts        src/security/
cp $H/src/middleware/tenantMiddleware.ts  src/middleware/      # drop-in, same export name
cp $H/scripts/test-hardening.ts           scripts/
cp $H/config/tsconfig.strict.json         .
cp $H/config/vercel.json                  .

# patches to existing files
patch src/security/authorization.ts   < $H/authorization.patch
patch server/middleware/rateLimiter.ts < $H/rateLimiter.patch
patch server/routes/system.ts         < $H/system.patch
patch src/services/storageService.ts  < $H/storageService.patch

npx tsc --noEmit && npx tsx scripts/test-hardening.ts && npm run test:security && npm run test:ratelimit
```

Then:

1. `npm i ioredis`, and call `await initRateLimitRedisFromEnv()` once at startup (in `server.ts` and `api/index.ts`). Order does not matter; the store reads the client per request.
2. Add `"test:hardening": "tsx scripts/test-hardening.ts"` to `package.json` and to CI.
3. Optional env: `CMMS_PUBLIC_STORAGE_BUCKETS` (comma list), `CMMS_JWT_ISSUER` (add `issuer` to the three `jwt.sign` calls in `auth.ts` first), `CMMS_REQUIRE_STORED_ACCOUNT=true` (see below).
4. Delete `src/controllers/authController.ts`; purge `cmms_db.json` and `backups/` from git history; revoke sessions; rotate admin credentials; enable MFA on the admin.

## 4. Breaking changes & risks

- **Uploads:** per-bucket permission (`documents-vault`→`documents.manage` [SYSTEM_ADMIN, MANAGER], `member-photos`→`members.update`, `church-branding`→`system.manage`, `chat-attachments`→any signed-in user); 10 MB limit (was 50); allowed types: PDF, PNG, JPEG, GIF, WebP, DOCX/XLSX/PPTX, TXT/CSV. **SVG, HTML, video and arbitrary files are now refused.** The UI does not currently call `uploadFileToStorage` from any component I could find, so impact should be small, but check.
- **Signed URLs expire after 1 h** for non-public buckets. If anything *stores* the returned `publicUrl` (photo URLs, branding), either list that bucket in `CMMS_PUBLIC_STORAGE_BUCKETS` (only if it is already public) or store `path` and sign on read.
- **`member-photos` now needs `members.update`**, which REGULAR_MEMBER and MINISTRY_LEADER do not have (SYSTEM_ADMIN, MANAGER and PASTOR do). If members upload their own photos through this endpoint, add a self-service rule for their own record before shipping.
- **Client** no longer falls back to direct Storage upload; failures now surface to the caller.
- **Tokens older than 8 h are rejected**, including the 7-day token minted after a password change.
- **`CMMS_REQUIRE_STORED_ACCOUNT` is off by default on purpose.** Turning it on rejects local tokens whose user is missing from the in-memory `systemUsers`, which on serverless can legitimately be the case on a cold instance. Enable it only after account lookup is backed by Postgres.
- **Tenant middleware** now returns 403 for users with no `tenantId`, and for non-privileged users with no branch or who request another branch. Legacy rows with null tenant/branch will surface.

## 5. What I recommend next (not done)

1. **Audit Supabase RLS and direct table access first.** The frontend has 12 `supabase*Service.ts` modules that call `supabase.from(...)` directly from the browser, so RLS (`supabase/schema.sql`, `server/migrations/019/027/028`) *is* the authorization layer for that path. I did not review it.
2. Audit `externalApi.ts` (API-key hashing, scopes, rate limits) and `integrations.ts` (webhook targets/signing).
3. Move sessions, revocations, lockout counters and system users out of the JSON file into Postgres; then enable `CMMS_REQUIRE_STORED_ACCOUNT` and delete `cmms_db.json` from the runtime entirely.
4. Split `server/routes/auth.ts` (4 240 lines) and `authorization.ts` (1 852) into modules; move server-only code out of `src/` into `server/` so it can never be bundled to the browser (`src/security`, `src/middleware`, `src/routes`, `src/controllers`, `src/lib/supabase.ts` import `express`/`pg`/`jsonwebtoken`/service keys).
5. Turn on `strict` per-directory via `tsconfig.strict.json`, starting with `server/`.

## 6. Verification evidence

| Check | Original | Patched |
|---|---|---|
| `tsc --noEmit` (full project) | 0 errors | 0 errors |
| `tsc -p tsconfig.strict.json` (new files, `strict: true`) | n/a | 0 errors |
| `npm run test:security` | 89/89 | 89/89 |
| `npm run test:ratelimit` | 13/13 | 13/13 |
| `scripts/test-hardening.ts` (new) | n/a | 29/29 |
| `npm run test:rbac` | **fails** at `test-rbac-architecture.ts:125` | identical failure |
| `npm run test:backup` | **fails** (needs server on :3000, ECONNREFUSED) | identical failure |

All four patches were re-applied to pristine copies of the original files with `patch` and the result is byte-identical to the tested copy.

Not verified: behaviour against a live Supabase project, a real Redis, or a deployed Vercel instance.
