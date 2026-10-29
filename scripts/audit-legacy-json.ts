/**
 * Read-only inventory of a legacy CMMS JSON database before data migration.
 *
 * Set CMMS_JSON_SOURCE to an explicit local file path. The script never writes
 * to the source file and never prints member names, email addresses, phone
 * numbers, pastoral notes, passwords, or other record contents.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ENTITY_KEYS = [
  'branches',
  'members',
  'families',
  'ministries',
  'attendanceRecords',
  'attendanceSessions',
  'events',
  'communications',
  'communicationLogs',
  'prayerRequests',
  'counselingSessions',
  'visitations',
  'volunteerShifts',
  'assets',
  'documents',
  'courses',
  'workflows',
  'auditLogs',
  'systemUsers',
  'apiKeys',
  'webhooks',
  'devotions',
  'devotionReactions',
  'devotionComments',
  'bibleNotes',
  'bibleHighlights',
  'bibleBookmarks',
  'bibleReadingHistory',
  'bibleReadingPlans',
  'bibleMessages',
  'bibleMessageRecipients',
  'ministryMembers',
  'conversations',
  'conversationParticipants',
  'conversationMessages',
] as const;

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object' && !Array.isArray(item)
      )
    : [];
}

function main(): void {
  const configuredPath = process.env.CMMS_JSON_SOURCE;
  if (!configuredPath) {
    throw new Error(
      'Set CMMS_JSON_SOURCE to the exact local path of a verified JSON export. No default or bundled database file is read.'
    );
  }

  const sourcePath = path.resolve(configuredPath);
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    throw new Error('CMMS_JSON_SOURCE does not point to an existing regular file.');
  }

  const raw = fs.readFileSync(sourcePath);
  const parsed: unknown = JSON.parse(raw.toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Legacy database root must be a JSON object.');
  }

  const data = parsed as Record<string, unknown>;
  const counts: Record<string, number> = {};
  const duplicateIds: Record<string, number> = {};
  const missingIds: Record<string, number> = {};

  for (const key of ENTITY_KEYS) {
    const list = records(data[key]);
    counts[key] = list.length;
    const seen = new Set<string>();
    let duplicates = 0;
    let missing = 0;
    for (const record of list) {
      const id = typeof record.id === 'string' ? record.id.trim() : '';
      if (!id) {
        missing++;
      } else if (seen.has(id)) {
        duplicates++;
      } else {
        seen.add(id);
      }
    }
    duplicateIds[key] = duplicates;
    missingIds[key] = missing;
  }

  const branches = new Set(records(data.branches).map((item) => String(item.id || '')));
  const members = records(data.members);
  const ministries = new Set(records(data.ministries).map((item) => String(item.id || '')));
  const missingMemberBranches = members.filter(
    (item) => item.branchId && !branches.has(String(item.branchId))
  ).length;
  const ministryMembers = records(data.ministryMembers);
  const orphanMinistryMemberships = ministryMembers.filter(
    (item) => !ministries.has(String(item.ministryId || ''))
  ).length;

  console.log('CMMS legacy JSON audit — READ ONLY');
  console.log(`Source bytes: ${raw.byteLength}`);
  console.log(`SHA-256: ${crypto.createHash('sha256').update(raw).digest('hex')}`);
  console.log('Record counts:');
  for (const [key, count] of Object.entries(counts)) {
    console.log(`  ${key}: ${count}`);
  }
  console.log('ID integrity:');
  for (const key of ENTITY_KEYS) {
    if (duplicateIds[key] || missingIds[key]) {
      console.log(`  ${key}: duplicate IDs=${duplicateIds[key]}, missing IDs=${missingIds[key]}`);
    }
  }
  console.log(`Members referencing missing branches: ${missingMemberBranches}`);
  console.log(`Ministry memberships referencing missing ministries: ${orphanMinistryMemberships}`);
  console.log('No data was changed. This report is an inventory, not a migration.');
}

try {
  main();
} catch (error) {
  console.error('[Legacy JSON Audit]', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
