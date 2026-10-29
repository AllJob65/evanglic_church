import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../src/security/jwtConfig';
import { ROLE_PERMISSIONS } from '../src/security/authorization';
import { createServerBackup, restoreServerBackup, resetServerDatabase, validateDatabaseSchema } from '../server/services/backupService';
import { db } from '../server/db';
import fs from 'fs';
import path from 'path';

function createToken(role: string, email: string = 'system.admin@gracecathedral.org', userId: string = 'usr-101-alt') {
  const permissions = (ROLE_PERMISSIONS as any)[role] || [];
  return jwt.sign(
    {
      sub: userId,
      user_id: userId,
      email,
      name: `${role} User`,
      role,
      tenantId: 'tenant-grace-main',
      tenant_id: 'tenant-grace-main',
      branchId: 'b-001',
      branchIds: ['b-001'],
      branchName: 'Main Sanctuary Headquarters',
      permissions,
      status: 'Active',
      aal: 'aal2',
      last_max_auth_at: new Date().toISOString(),
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runTests() {
  console.log('\n=== RUNNING PHASE 25 BACKUP & RESTORE VERIFICATION ===\n');

  // Test 1: Full DatabaseSchema Validation
  const currentState = db.getState();
  const validation = validateDatabaseSchema(currentState);
  console.log(`[Test 1] Current DatabaseSchema validation: valid=${validation.valid}, collections checked=${Object.keys(validation.stats).length}`);
  if (!validation.valid) {
    console.error('Validation errors:', validation.errors);
    process.exit(1);
  }

  // Test 2: Incomplete payload rejection
  const incompletePayload = {
    branding: currentState.branding,
    members: currentState.members,
    // Missing all other 33 collections
  };
  const incompleteVal = validateDatabaseSchema(incompletePayload);
  console.log(`[Test 2] Incomplete payload correctly rejected: valid=${incompleteVal.valid}, errorsCount=${incompleteVal.errors.length}`);
  if (incompleteVal.valid) {
    console.error('FAILED: Incomplete payload should have been rejected!');
    process.exit(1);
  }

  // Test 3: Real Server Backup Creation
  const backupResult = createServerBackup({
    type: 'Full System',
    triggeredBy: 'test-admin@gracecathedral.org',
  });
  console.log(`[Test 3] Server backup created: ${backupResult.filename} (${backupResult.size}, ${backupResult.bytes} bytes)`);
  if (!fs.existsSync(backupResult.filePath)) {
    console.error('FAILED: Backup file does not exist on disk at:', backupResult.filePath);
    process.exit(1);
  }

  // Test 4: Restore with confirm=false (Dry run validation preview)
  const preview = restoreServerBackup({
    content: backupResult.payload,
    confirmed: false,
    triggeredBy: 'test-admin@gracecathedral.org',
  });
  console.log(`[Test 4] Restore dry-run: requiresConfirmation=${preview.requiresConfirmation}, message="${preview.message}"`);
  if (!preview.requiresConfirmation) {
    console.error('FAILED: Dry-run restore should require confirmation!');
    process.exit(1);
  }

  // Test 5: Restore with confirm=true (Real execution with automatic pre-restore snapshot)
  const initialLogCount = db.getBackupLogs().length;
  const restoreRes = restoreServerBackup({
    content: backupResult.payload,
    confirmed: true,
    triggeredBy: 'test-admin@gracecathedral.org',
  });
  console.log(`[Test 5] Restore execution: success=${restoreRes.success}, preRestoreSnapshot="${restoreRes.preRestoreSnapshot}"`);
  if (!restoreRes.success || !restoreRes.preRestoreSnapshot) {
    console.error('FAILED: Real restore execution failed!');
    process.exit(1);
  }
  const newLogCount = db.getBackupLogs().length;
  console.log(`[Test 5b] Pre-restore snapshot logged: newLogCount=${newLogCount} (was ${initialLogCount})`);

  // Test 6: Factory Reset with confirm=true (Real execution with automatic pre-reset snapshot)
  const resetRes = resetServerDatabase({
    confirmed: true,
    triggeredBy: 'test-admin@gracecathedral.org',
  });
  console.log(`[Test 6] Factory reset: success=${resetRes.success}, preResetSnapshot="${resetRes.preResetSnapshot}"`);
  if (!resetRes.success || !resetRes.preResetSnapshot) {
    console.error('FAILED: Factory reset failed!');
    process.exit(1);
  }

  // Test 7: HTTP endpoint testing against local server
  const adminToken = createToken('SYSTEM_ADMIN', 'system.admin@gracecathedral.org', 'usr-101-alt');
  const memberToken = createToken('REGULAR_MEMBER', 'member@gracecathedral.org', 'usr-105');

  // Member should get 403 on POST /api/system/backup
  const memberRes = await fetch('http://localhost:3000/api/system/backup', {
    method: 'POST',
    headers: { Authorization: `Bearer ${memberToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'Full System' }),
  });
  console.log(`[Test 7] Member access blocked (HTTP status): ${memberRes.status} (expected 403)`);
  if (memberRes.status !== 403) {
    console.error('FAILED: Regular member was not blocked from backup endpoint!');
    process.exit(1);
  }

  // SYSTEM_ADMIN should get 200 on POST /api/system/backup
  const adminRes = await fetch('http://localhost:3000/api/system/backup', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'Full System' }),
  });
  console.log(`[Test 8] Admin backup trigger (HTTP status): ${adminRes.status} (expected 200)`);
  if (adminRes.status !== 200) {
    console.error('FAILED: SYSTEM_ADMIN backup trigger failed!');
    process.exit(1);
  }

  // Admin schedule fetch & update
  const schedRes = await fetch('http://localhost:3000/api/system/backup/schedule', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const schedData = await schedRes.json();
  console.log(`[Test 9] Backup schedule fetched: frequency=${schedData.schedule?.frequency}, time=${schedData.schedule?.time}`);

  // Invalid destination rejection test
  const invalidDestRes = await fetch('http://localhost:3000/api/system/backup/schedule', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination: 'Cloud Storage' }),
  });
  console.log(`[Test 10] Unsupported destination rejected (HTTP status): ${invalidDestRes.status} (expected 400)`);
  if (invalidDestRes.status !== 400) {
    console.error('FAILED: Unsupported destination was not rejected!');
    process.exit(1);
  }

  console.log('\n=== ALL PHASE 25 VERIFICATION TESTS PASSED SUCCESSFULLY! ===\n');
}

runTests().catch((e) => {
  console.error('Test suite failed:', e);
  process.exit(1);
});
