# Repository Runtime Data Exposure Audit

**Assessment date:** 2026-10-27  
**Scope:** Git tree at `main` commit `8040000b7bcb92b6432b836bd9eb2a87216b9a4e`  
**Disposition:** Security remediation required before production release.

## Verified findings

The current Git tree contains application runtime data files, not merely templates:

- `cmms_db.json` is tracked in the repository root.
- Multiple dated full-system and automatic-snapshot JSON files are tracked under `backups/`.

These files may contain member, staff, authentication-profile, pastoral, financial, or other operational records. This audit intentionally does not reproduce their contents. Their presence in source control creates an unnecessary disclosure and retention risk and means the repository cannot be treated as code-only.

The existing `.gitignore` rules prevent some future untracked files from being added, but ignore rules do not untrack files already committed and do not remove historical Git objects.

## Required remediation sequence

1. **Preserve operational records first.** The system owner must identify the authoritative data source and verify a separately secured, encrypted backup outside Git. Do not delete these repository files until that backup is verified.
2. **Remove runtime data from the active source tree.** In an approved change, remove `cmms_db.json` and the tracked `backups/` artifacts from the repository while retaining ignore rules for future runtime files.
3. **Assess Git history exposure.** Removing files in a new commit does not erase their earlier blobs. The repository owner/security administrator must decide whether a coordinated history rewrite is required, including force-push coordination, fresh clones, CI caches, forks, mirrors, and retention systems.
4. **Rotate exposed credentials where applicable.** Review repository history and CI/deployment logs for API keys, tokens, SMTP credentials, database URLs, signing secrets, and provider credentials. Rotate any value that was real and exposed. Do not assume a value is safe merely because it appears in an old commit.
5. **Verify access and retention.** Review repository collaborators, deploy keys, GitHub Actions permissions, Vercel integration access, and any forks or mirrors. Record the review.
6. **Add preventive controls.** Add secret scanning and a CI guard that rejects runtime database/backup artifacts from future commits. Validate the guard against fixtures without scanning or printing sensitive values in CI logs.

## Approval and safety boundary

This document does not delete, rewrite, export, or modify any user data. It does not rotate credentials or change repository history. Those operations require explicit owner approval and a verified recovery copy. In particular, a history rewrite is disruptive and must be coordinated with all collaborators and deployment integrations.

## Release gate

Production remains **NO-GO** until runtime data has been removed from the active repository, historical exposure has been assessed and remediated as approved, relevant credentials have been reviewed/rotated, and preventive CI controls are passing.
