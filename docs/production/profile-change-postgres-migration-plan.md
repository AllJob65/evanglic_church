# Profile-change PostgreSQL migration plan

## Scope

Migration `030_profile_change_requests.sql` introduces a dedicated table for member profile-change submissions. It deliberately does not overload `workflow_requests`, which is used by membership applications and other governance workflows.

## Data-integrity controls

- Each request is linked to an existing member through the composite `(member_id, tenant_id, branch_id)` foreign key.
- Submitter and reviewer references are tenant-scoped profile references.
- Requested snapshot must be a JSON object; changed-field summary must be a JSON array.
- Status is constrained to Pending, Approved, or Rejected.
- Pending and decided records have separate timestamp/reviewer consistency requirements.
- Queue and member-history indexes support the approval queue and member history.
- RLS is enabled and direct browser-role access is revoked. The Node API must enforce authenticated user, tenant, branch, and role scope for every operation.

## Required repository transaction behavior

1. Submission: resolve the member from authenticated identity (not an arbitrary client-supplied member ID for regular members), validate allowed profile fields, then insert the request.
2. Listing: regular members see only their own requests; authorized staff see only their tenant and permitted branches.
3. Decision: lock the pending request and existing member row in one transaction; reject stale/already-decided requests; apply only allowlisted mutable fields; never modify member ID, tenant ID, or branch ID from the submitted snapshot.
4. Approval: update normalized `members`, `member_details`, and `member_private_details` sections as appropriate, and update linked profile display fields only through an explicit mapping.
5. Audit: write the decision event in the same transaction. Do not place private/health fields or full snapshots in audit details.
6. Any failed update or audit write rolls back the entire decision.

## Release gate

This is a review-only migration. Do not apply it to staging or production until:
- the matching repository and route cutover are implemented and reviewed;
- the migration is tested on a disposable PostgreSQL database and a staging clone;
- RLS/service-role and connection-role behavior are verified;
- existing JSON-backed profile-change records have a documented, reconciled import plan;
- backup and rollback procedures are approved.

No production database changes are part of this PR.
