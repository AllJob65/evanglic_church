# Member PostgreSQL Repository — Implementation Notes

This note accompanies `server/repositories/memberRepository.ts`.

## What is implemented

- Parameterized PostgreSQL queries for scoped member list, detail, create, update, and delete.
- Database UUID validation; new rows receive UUID primary keys rather than legacy `mem-*` IDs.
- Tenant scope is always part of the SQL predicate.
- Branch scope uses only UUIDs from the verified server-side user context; legacy branch aliases and display names are ignored.
- Search and status filtering are performed by PostgreSQL.
- Ministry memberships are read from `ministry_members` and mapped to `Member.ministryIds`.
- Pagination is bounded to 200 rows.

## Important limitations — not ready for production cutover

The repository is deliberately not yet wired into `server/routes/members.ts`. The current frontend Member model is substantially wider than the deployed `public.members` table. Mapping only the columns that exist would discard submitted registration data.

Fields currently represented by the deployed table include member number, names, gender, marital status, DOB, phone, email, address, city, membership status, fellowship group, tenant, branch, and ministry links.

The deployed schema does not currently persist many frontend fields, including title, preferred name, nationality/identity documents, alternate contact details, detailed address fields, household/family role, spiritual history, baptism information, discipleship, employment/education, departure details, emergency contact, health notes, photos, attendance score, and membership date. Some data may belong in normalized related tables or protected document storage rather than columns on `members`.

The deployed schema also does not currently expose a profile-to-member foreign key. Login account association must not be guessed by email during this repository step.

## Required before route integration

1. Approve a field-by-field data model mapping. Decide which fields are core member columns, normalized child tables, private pastoral/medical data, or files in Storage.
2. Add a nullable unique `profiles.member_id` UUID foreign key only after deciding how existing accounts are linked and handling duplicate email/member cases.
3. Confirm the branch-assignment model. The current auth payload includes legacy aliases and campus labels; this repository intentionally ignores non-UUID values rather than treating them as database identifiers.
4. Add integration tests against a disposable PostgreSQL database: tenant isolation, branch isolation, search, pagination, UUID IDs, ministry joins, create/update/delete, invalid branch rejection, and SQL injection attempts.
5. Wire routes only after response compatibility is proven, including CSV export, bulk import, departure transitions, audit logging, and the dashboard state contract.
6. Add database constraints and unique member-number generation strategy. The current random suffix is collision-resistant but should be replaced with a database-enforced per-tenant sequence or equivalent.

## Runtime configuration

The repository uses the existing server-only `DATABASE_URL` pool in `server/pg.ts`. Set it only in server runtime environments (Vercel server environment variables, VPS secrets, local `.env` excluded from Git). For Vercel, use the Supabase pooler connection string appropriate for serverless workloads. Never use a service-role/secret key as a browser environment variable.

No database DDL or data writes are performed by importing this repository. No live Supabase operation has been run by this change.
