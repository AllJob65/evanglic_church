/**
 * ==============================================================================
 * CMMS RBAC ARCHITECTURE & PRIVILEGE ESCALATION AUTOMATED TEST SUITE
 * ==============================================================================
 * Verifies:
 * 1. Hierarchy: users -> user_roles -> roles -> role_permissions -> effective permissions
 * 2. Single Role Matrix:
 *    - SYSTEM_ADMIN
 *    - MANAGER
 *    - PASTOR
 *    - MINISTRY_LEADER
 *    - REGULAR_MEMBER
 * 3. Multi-Role Union & Non-Overwrite of Primary Role:
 *    - PASTOR + MINISTRY_LEADER
 * 4. Explicit Deny Rules & Anti-Escalation:
 *    - A PASTOR must NOT gain system permissions (system.manage, backup.manage,
 *      users.manage, audit.read) merely because they also have MINISTRY_LEADER.
 *    - A user must NOT be able to modify their own SYSTEM_ADMIN permissions.
 *    - A non-admin must NOT assign or revoke SYSTEM_ADMIN.
 * 5. Backend API Enforcement:
 *    - Add role, Remove role, Set primary role, Assign branch/campus, Remove branch/campus,
 *      View effective permissions, and Privilege Escalation rejection over HTTP.
 * ==============================================================================
 */

import assert from 'node:assert/strict';
import {
  computeEffectivePermissions,
  hasPermission,
  validateRoleMutationSecurity,
  ROLES_CATALOG,
  SYSTEM_ONLY_PERMISSIONS,
} from '../src/security/authorization';
import {
  getRolePermissions,
  isModuleAuthorized,
} from '../src/utils/rbac';

let passedCount = 0;
function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passedCount++;
      console.log(`  ✅ PASS: ${name}`);
    })
    .catch((err) => {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(err);
      process.exitCode = 1;
      throw err;
    });
}

async function runSuite() {
  console.log('======================================================================');
  console.log('🛡️  CMMS RBAC ARCHITECTURE & MULTI-ROLE SECURITY TEST SUITE');
  console.log('======================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. ROLES CATALOG & HIERARCHY STRUCTURE
  // ---------------------------------------------------------------------------
  console.log('1. Verifying RBAC Hierarchy (users -> user_roles -> roles -> role_permissions -> effective permissions)...');

  await test('ROLES_CATALOG defines all 5 canonical roles with explicit permissions and deny rules', () => {
    const expectedRoles = ['SYSTEM_ADMIN', 'MANAGER', 'PASTOR', 'MINISTRY_LEADER', 'REGULAR_MEMBER'] as const;
    for (const r of expectedRoles) {
      assert.ok(ROLES_CATALOG[r], `Missing role in ROLES_CATALOG: ${r}`);
      assert.equal(ROLES_CATALOG[r].code, r);
      assert.ok(Array.isArray(ROLES_CATALOG[r].permissions));
      assert.ok(ROLES_CATALOG[r].permissions.length > 0);
    }
    assert.equal(ROLES_CATALOG.SYSTEM_ADMIN.explicitDeniedPermissions.length, 0);
    assert.ok(ROLES_CATALOG.PASTOR.explicitDeniedPermissions.includes('system.manage'));
    assert.ok(ROLES_CATALOG.MINISTRY_LEADER.explicitDeniedPermissions.includes('system.manage'));
  });

  // ---------------------------------------------------------------------------
  // 2. SINGLE ROLE EFFECTIVE PERMISSIONS TESTS
  // ---------------------------------------------------------------------------
  console.log('\n2. Verifying Single Role Effective Permissions...');

  await test('SYSTEM_ADMIN has full system, security, user, backup, and branch management permissions', () => {
    const res = computeEffectivePermissions('SYSTEM_ADMIN', []);
    assert.equal(res.primaryRole, 'SYSTEM_ADMIN');
    assert.deepEqual(res.additionalRoles, []);
    assert.deepEqual(res.allRoles, ['SYSTEM_ADMIN']);
    assert.equal(res.deniedPermissions.length, 0);
    assert.ok(res.effectivePermissions.includes('system.manage'));
    assert.ok(res.effectivePermissions.includes('backup.manage'));
    assert.ok(res.effectivePermissions.includes('users.manage'));
    assert.ok(res.effectivePermissions.includes('audit.read'));
    assert.ok(res.effectivePermissions.includes('branches.manage'));
    assert.ok(res.effectivePermissions.includes('counseling.confidential'));

    const uiPerms = getRolePermissions('SYSTEM_ADMIN');
    assert.equal(uiPerms.canAccessSystemSettings, true);
    assert.equal(uiPerms.canAssignRoles, true);
    assert.equal(uiPerms.canAccessBackupAndRestore, true);
    assert.equal(uiPerms.canManageSystem, true);
  });

  await test('PASTOR has pastoral, counseling, visitation, and devotion permissions but NOT system admin permissions', () => {
    const res = computeEffectivePermissions('PASTOR', []);
    assert.equal(res.primaryRole, 'PASTOR');
    assert.deepEqual(res.additionalRoles, []);
    assert.ok(res.effectivePermissions.includes('prayer.read'));
    assert.ok(res.effectivePermissions.includes('prayer.update'));
    assert.ok(res.effectivePermissions.includes('counseling.confidential'));
    assert.ok(res.effectivePermissions.includes('counseling.read'));
    assert.ok(res.effectivePermissions.includes('counseling.update'));
    assert.ok(res.effectivePermissions.includes('visitations.manage'));
    assert.ok(res.effectivePermissions.includes('devotions.manage'));

    // Explicitly denied system permissions
    assert.equal(res.effectivePermissions.includes('system.manage'), false);
    assert.equal(res.effectivePermissions.includes('backup.manage'), false);
    assert.equal(res.effectivePermissions.includes('users.manage'), false);
    assert.equal(res.effectivePermissions.includes('audit.read'), false);
    assert.equal(res.effectivePermissions.includes('branches.manage'), false);

    const uiPerms = getRolePermissions('PASTOR');
    assert.equal(uiPerms.canManagePrayerRequests, true);
    assert.equal(uiPerms.canManageCounseling, true);
    assert.equal(uiPerms.canManageMinistries, false);
    assert.equal(uiPerms.canAccessSystemSettings, false);
    assert.equal(uiPerms.canAssignRoles, false);
    assert.equal(uiPerms.canAccessBackupAndRestore, false);
  });

  await test('MINISTRY_LEADER has ministry, attendance, events, and volunteer permissions but NOT confidential pastoral or system admin permissions', () => {
    const res = computeEffectivePermissions('MINISTRY_LEADER', []);
    assert.equal(res.primaryRole, 'MINISTRY_LEADER');
    assert.deepEqual(res.additionalRoles, []);
    assert.ok(res.effectivePermissions.includes('ministries.read'));
    assert.ok(res.effectivePermissions.includes('groups.manage'));
    assert.ok(res.effectivePermissions.includes('attendance.create'));
    assert.ok(res.effectivePermissions.includes('attendance.update'));
    assert.ok(res.effectivePermissions.includes('events.manage'));
    assert.ok(res.effectivePermissions.includes('volunteers.read'));

    // Must not have confidential pastoral or system admin permissions
    assert.equal(res.effectivePermissions.includes('counseling.confidential'), false);
    assert.equal(res.effectivePermissions.includes('pastoral.confidential'), false);
    assert.equal(res.effectivePermissions.includes('system.manage'), false);
    assert.equal(res.effectivePermissions.includes('users.manage'), false);

    const uiPerms = getRolePermissions('MINISTRY_LEADER');
    assert.equal(uiPerms.canManageAttendance, true);
    assert.equal(uiPerms.canManageEvents, true);
    assert.equal(uiPerms.canManageMinistries, true);
    assert.equal(uiPerms.canManageCounseling, false);
    assert.equal(uiPerms.canAccessSystemSettings, false);
  });

  await test('MANAGER has branch operations, members, families, assets, and finance permissions, but NOT system.manage or backup.manage', () => {
    const res = computeEffectivePermissions('MANAGER', []);
    assert.equal(res.primaryRole, 'MANAGER');
    assert.ok(res.effectivePermissions.includes('members.create'));
    assert.ok(res.effectivePermissions.includes('members.update'));
    assert.ok(res.effectivePermissions.includes('families.create'));
    assert.ok(res.effectivePermissions.includes('assets.manage'));
    assert.ok(res.effectivePermissions.includes('workflows.manage'));

    // Explicit deny rules for non-SYSTEM_ADMIN still block system.manage & backup.manage
    assert.equal(res.effectivePermissions.includes('system.manage'), false);
    assert.equal(res.effectivePermissions.includes('backup.manage'), false);

    const uiPerms = getRolePermissions('MANAGER');
    assert.equal(uiPerms.canCreateMembers, true);
    assert.equal(uiPerms.canManageFinances, true);
    assert.equal(uiPerms.canAccessSystemSettings, false);
    assert.equal(uiPerms.canAccessBackupAndRestore, false);
  });

  await test('REGULAR_MEMBER has self-service portal permissions ($0 approval limit, no admin modules)', () => {
    const res = computeEffectivePermissions('REGULAR_MEMBER', []);
    assert.equal(res.primaryRole, 'REGULAR_MEMBER');
    assert.ok(res.effectivePermissions.includes('devotions.read'));
    assert.ok(res.effectivePermissions.includes('events.read'));
    assert.ok(res.effectivePermissions.includes('attendance.create'));
    assert.ok(res.effectivePermissions.includes('prayer.create'));
    assert.ok(res.effectivePermissions.includes('bible.read'));

    assert.equal(res.effectivePermissions.includes('members.create'), false);
    assert.equal(res.effectivePermissions.includes('system.manage'), false);
    assert.equal(res.effectivePermissions.includes('users.manage'), false);

    const uiPerms = getRolePermissions('REGULAR_MEMBER');
    assert.equal(uiPerms.financialApprovalLimit, 0);
    assert.equal(uiPerms.canCreateMembers, false);
    assert.equal(uiPerms.canAccessSystemSettings, false);
    assert.equal(isModuleAuthorized('REGULAR_MEMBER', 'settings'), false);
    assert.equal(isModuleAuthorized('REGULAR_MEMBER', 'devotions'), true);
  });

  // ---------------------------------------------------------------------------
  // 3. MULTI-ROLE UNION & ANTI-ESCALATION: PASTOR + MINISTRY_LEADER
  // ---------------------------------------------------------------------------
  console.log('\n3. Verifying Multi-Role Combination (PASTOR + MINISTRY_LEADER)...');

  await test('PASTOR + MINISTRY_LEADER preserves primaryRole=PASTOR, includes additionalRoles=[MINISTRY_LEADER], and computes exact union of permissions without escalating to system permissions', () => {
    const res = computeEffectivePermissions('PASTOR', ['MINISTRY_LEADER']);

    // Primary role MUST NOT be overwritten
    assert.equal(res.primaryRole, 'PASTOR');
    assert.deepEqual(res.additionalRoles, ['MINISTRY_LEADER']);
    assert.deepEqual(res.allRoles, ['PASTOR', 'MINISTRY_LEADER']);

    // user_roles table structure check
    assert.equal(res.userRoles.length, 2);
    assert.deepEqual(res.userRoles[0], { role: 'PASTOR', isPrimary: true });
    assert.deepEqual(res.userRoles[1], { role: 'MINISTRY_LEADER', isPrimary: false });

    // Union includes PASTOR permissions
    assert.ok(res.effectivePermissions.includes('counseling.confidential'));
    assert.ok(res.effectivePermissions.includes('counseling.update'));
    assert.ok(res.effectivePermissions.includes('visitations.manage'));
    assert.ok(res.effectivePermissions.includes('devotions.manage'));

    // Union also includes MINISTRY_LEADER permissions
    assert.ok(res.effectivePermissions.includes('volunteers.read'));
    assert.ok(res.effectivePermissions.includes('events.manage'));
    assert.ok(res.effectivePermissions.includes('attendance.update'));

    // CRITICAL SECURITY RULE: A pastor must NOT gain system permissions merely because they also have MINISTRY_LEADER
    for (const sysPerm of SYSTEM_ONLY_PERMISSIONS) {
      assert.equal(
        res.effectivePermissions.includes(sysPerm),
        false,
        `PASTOR + MINISTRY_LEADER must NOT have ${sysPerm}`
      );
    }
    assert.equal(res.effectivePermissions.includes('users.manage'), false);
    assert.equal(res.effectivePermissions.includes('system.manage'), false);
    assert.equal(res.effectivePermissions.includes('backup.manage'), false);
    assert.equal(res.effectivePermissions.includes('audit.read'), false);
    assert.equal(res.effectivePermissions.includes('branches.manage'), false);

    // Verify hasPermission helper works with multi-role object
    const multiRoleUser = {
      role: 'PASTOR' as const,
      additionalRoles: ['MINISTRY_LEADER' as const],
    };
    assert.equal(hasPermission(multiRoleUser, 'counseling.confidential'), true);
    assert.equal(hasPermission(multiRoleUser, 'volunteers.read'), true);
    assert.equal(hasPermission(multiRoleUser, 'events.manage'), true);
    assert.equal(hasPermission(multiRoleUser, 'system.manage'), false);
    assert.equal(hasPermission(multiRoleUser, 'users.manage'), false);

    // Verify UI permission matrix union
    const uiUnion = getRolePermissions('PASTOR', ['MINISTRY_LEADER']);
    assert.equal(uiUnion.role, 'PASTOR'); // Primary role preserved
    assert.equal(uiUnion.canManagePrayerRequests, true); // From PASTOR
    assert.equal(uiUnion.canManageCounseling, true); // From PASTOR
    assert.equal(uiUnion.canManageMinistries, true); // Added from MINISTRY_LEADER
    assert.equal(uiUnion.canManageEvents, true);
    assert.equal(uiUnion.canManageAttendance, true);
    // Explicitly denied on UI matrix as well
    assert.equal(uiUnion.canAccessSystemSettings, false);
    assert.equal(uiUnion.canAccessBackupAndRestore, false);
    assert.equal(uiUnion.canAssignRoles, false);
    assert.equal(uiUnion.canManageSystem, false);
    assert.equal(isModuleAuthorized(['PASTOR', 'MINISTRY_LEADER'], 'prayer_counseling'), true);
    assert.equal(isModuleAuthorized(['PASTOR', 'MINISTRY_LEADER'], 'ministries'), true);
    assert.equal(isModuleAuthorized(['PASTOR', 'MINISTRY_LEADER'], 'settings'), false);
    assert.equal(isModuleAuthorized(['PASTOR', 'MINISTRY_LEADER'], 'backup'), false);
  });

  // ---------------------------------------------------------------------------
  // 4. PRIVILEGE ESCALATION GUARDS (UNIT TESTS)
  // ---------------------------------------------------------------------------
  console.log('\n4. Verifying Privilege Escalation Prevention Rules...');

  await test('Rule 1: A user must NOT be able to modify their own SYSTEM_ADMIN permissions or role', () => {
    const adminActor = {
      id: 'usr-admin-1',
      email: 'admin@gracecathedral.org',
      role: 'SYSTEM_ADMIN' as const,
      roles: ['SYSTEM_ADMIN' as const],
    };

    // Attempting to demote or alter own SYSTEM_ADMIN role
    const selfModifyCheck = validateRoleMutationSecurity({
      operator: adminActor,
      targetUser: adminActor,
      nextPrimaryRole: 'PASTOR',
      nextAdditionalRoles: [],
    });
    assert.equal(selfModifyCheck.valid, false);
    assert.equal(selfModifyCheck.code, 'SELF_ADMIN_MODIFICATION_FORBIDDEN');
  });

  await test('Rule 2: A non-admin (e.g. MANAGER or PASTOR) must NOT assign SYSTEM_ADMIN as primary or additional role', () => {
    const managerOperator = {
      id: 'usr-mgr-1',
      email: 'manager@gracecathedral.org',
      role: 'MANAGER' as const,
      roles: ['MANAGER' as const],
    };
    const pastorTarget = {
      id: 'usr-pastor-1',
      email: 'pastor@gracecathedral.org',
      role: 'PASTOR' as const,
      roles: ['PASTOR' as const],
    };

    // Manager trying to assign SYSTEM_ADMIN as primary role
    const assignPrimaryAdmin = validateRoleMutationSecurity({
      operator: managerOperator,
      targetUser: pastorTarget,
      nextPrimaryRole: 'SYSTEM_ADMIN',
      nextAdditionalRoles: [],
    });
    assert.equal(assignPrimaryAdmin.valid, false);
    assert.equal(assignPrimaryAdmin.code, 'PRIVILEGE_ESCALATION_FORBIDDEN');

    // Manager trying to sneak SYSTEM_ADMIN into additionalRoles
    const assignAdditionalAdmin = validateRoleMutationSecurity({
      operator: managerOperator,
      targetUser: pastorTarget,
      nextPrimaryRole: 'PASTOR',
      nextAdditionalRoles: ['MINISTRY_LEADER', 'SYSTEM_ADMIN'],
    });
    assert.equal(assignAdditionalAdmin.valid, false);
    assert.equal(assignAdditionalAdmin.code, 'PRIVILEGE_ESCALATION_FORBIDDEN');
  });

  await test('Rule 3: A non-admin must NOT modify an existing SYSTEM_ADMIN account', () => {
    const managerOperator = {
      id: 'usr-mgr-1',
      email: 'manager@gracecathedral.org',
      role: 'MANAGER' as const,
      roles: ['MANAGER' as const],
    };
    const adminTarget = {
      id: 'usr-admin-1',
      email: 'admin@gracecathedral.org',
      role: 'SYSTEM_ADMIN' as const,
      roles: ['SYSTEM_ADMIN' as const],
    };

    const modifyAdminTarget = validateRoleMutationSecurity({
      operator: managerOperator,
      targetUser: adminTarget,
      nextPrimaryRole: 'MANAGER',
      nextAdditionalRoles: [],
    });
    assert.equal(modifyAdminTarget.valid, false);
    assert.equal(modifyAdminTarget.code, 'PRIVILEGE_ESCALATION_FORBIDDEN');
  });

  // ---------------------------------------------------------------------------
  // 5. LIVE BACKEND API MULTI-ROLE & CAMPUS INTEGRATION TESTS
  // ---------------------------------------------------------------------------
  console.log('\n5. Verifying Live Backend RBAC Endpoints (Add/Remove Role, Set Primary Role, Campuses, Effective Permissions)...');

  const BASE = 'http://localhost:3000/api/auth';
  let serverReachable = false;
  try {
    const health = await fetch('http://localhost:3000/api/system/health');
    serverReachable = health.ok;
  } catch {
    serverReachable = false;
  }

  if (serverReachable) {
    const reqJson = async (method: string, url: string, body?: any, token?: string) => {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    };

    const adminLogin = await reqJson('POST', `${BASE}/staff/login`, {
      email: 'admin@gracecathedral.org',
      password: 'Pass@12345',
    });

    assert.equal(adminLogin.status, 200, 'SYSTEM_ADMIN login should succeed');
    const adminToken = adminLogin.data.token;
    const adminId = adminLogin.data.user?.id;

    // Find a pastor or test user
    const usersRes = await reqJson('GET', `${BASE}/users`, undefined, adminToken);
    assert.equal(usersRes.status, 200);
    const targetUser = usersRes.data.find(
      (u: any) => u.email !== 'admin@gracecathedral.org' && u.id !== adminId
    );
    assert.ok(targetUser, 'Should have a non-admin target user');

    await test('Backend: Set primary role to PASTOR, then add MINISTRY_LEADER without overwriting PASTOR', async () => {
      // 1. Set primary role to PASTOR
      const setPrimary = await reqJson(
        'PUT',
        `${BASE}/users/${targetUser.id}/primary-role`,
        { role: 'PASTOR' },
        adminToken
      );
      assert.equal(setPrimary.status, 200);
      assert.equal(setPrimary.data.primaryRole, 'PASTOR');

      // 2. Add MINISTRY_LEADER role
      const addRole = await reqJson(
        'POST',
        `${BASE}/users/${targetUser.id}/roles`,
        { role: 'MINISTRY_LEADER' },
        adminToken
      );
      assert.equal(addRole.status, 200);
      assert.equal(addRole.data.primaryRole, 'PASTOR', 'Primary role MUST remain PASTOR');
      assert.ok(
        addRole.data.additionalRoles.includes('MINISTRY_LEADER'),
        'Additional roles must include MINISTRY_LEADER'
      );
      assert.ok(
        addRole.data.effectivePermissions.includes('counseling.confidential'),
        'Effective permissions must include PASTOR counseling.confidential'
      );
      assert.ok(
        addRole.data.effectivePermissions.includes('volunteers.read'),
        'Effective permissions must include MINISTRY_LEADER volunteers.read'
      );
      assert.equal(
        addRole.data.effectivePermissions.includes('system.manage'),
        false,
        'PASTOR + MINISTRY_LEADER must NOT have system.manage'
      );
    });

    await test('Backend: View Effective Permissions endpoint returns full RBAC hierarchy', async () => {
      const eff = await reqJson(
        'GET',
        `${BASE}/users/${targetUser.id}/effective-permissions`,
        undefined,
        adminToken
      );
      assert.equal(eff.status, 200);
      assert.equal(eff.data.primaryRole, 'PASTOR');
      assert.ok(eff.data.additionalRoles.includes('MINISTRY_LEADER'));
      assert.ok(Array.isArray(eff.data.userRoles));
      assert.ok(Array.isArray(eff.data.roleBreakdown));
      assert.ok(Array.isArray(eff.data.effectivePermissions));
      assert.equal(eff.data.effectivePermissions.includes('system.manage'), false);
    });

    await test('Backend: Remove additional role (MINISTRY_LEADER) preserves primary role (PASTOR)', async () => {
      const remRole = await reqJson(
        'DELETE',
        `${BASE}/users/${targetUser.id}/roles/MINISTRY_LEADER`,
        undefined,
        adminToken
      );
      assert.equal(remRole.status, 200);
      assert.equal(remRole.data.primaryRole, 'PASTOR');
      assert.equal(remRole.data.additionalRoles.includes('MINISTRY_LEADER'), false);
    });

    await test('Backend: Assign branch/campus and Remove branch/campus', async () => {
      const addCamp = await reqJson(
        'POST',
        `${BASE}/users/${targetUser.id}/campuses`,
        { campus: 'Bole Fellowship Campus', campusName: 'Bole Fellowship Campus', branchId: 'br-002' },
        adminToken
      );
      assert.equal(addCamp.status, 200);
      assert.ok(addCamp.data.assignedCampuses.includes('Bole Fellowship Campus'));

      const remCamp = await reqJson(
        'DELETE',
        `${BASE}/users/${targetUser.id}/campuses`,
        { campus: 'Bole Fellowship Campus', campusName: 'Bole Fellowship Campus' },
        adminToken
      );
      assert.equal(remCamp.status, 200);
      assert.equal(remCamp.data.assignedCampuses.includes('Bole Fellowship Campus'), false);
    });

    await test('Backend Security: SYSTEM_ADMIN is blocked from modifying their own SYSTEM_ADMIN permissions', async () => {
      const selfDemote = await reqJson(
        'PUT',
        `${BASE}/users/${adminId}/primary-role`,
        { role: 'PASTOR' },
        adminToken
      );
      assert.equal(selfDemote.status, 403);
      assert.equal(selfDemote.data.code, 'SELF_ADMIN_MODIFICATION_FORBIDDEN');
    });
  } else {
    console.log('  ℹ️ Dev server not reachable on localhost:3000; skipping live HTTP checks.');
  }

  console.log('\n======================================================================');
  console.log(`🎉 ALL ${passedCount} RBAC ARCHITECTURE & SECURITY TESTS PASSED!`);
  console.log('======================================================================');
}

runSuite().catch((err) => {
  console.error('RBAC test suite failed:', err);
  process.exit(1);
});
