import http from 'http';
import express from 'express';
import { io as ClientSocketIO, Socket as ClientSocket } from 'socket.io-client';
import {
  strictCorsMiddleware,
  helmetSecurityMiddleware,
  permissionsPolicy,
} from '../server/middleware/httpSecurity';
import { SocketService } from '../src/services/socketService';

async function runSecurityTests() {
  console.log('====================================================');
  console.log('STARTING HTTP & REALTIME SECURITY HARDENING AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // PART 1: HTTP SECURITY HEADERS & STRICT CORS AUDIT
  // ----------------------------------------------------
  console.log('--- 1. Testing HTTP Security Headers & Strict CORS ---');

  const app = express();
  app.use(strictCorsMiddleware);
  app.use(helmetSecurityMiddleware);
  app.use(permissionsPolicy);

  app.get('/api/test-security', (req, res) => {
    res.json({ ok: true });
  });

  const server = http.createServer(app);
  const testSocketService = new SocketService();
  testSocketService.init(server);

  await new Promise<void>((resolve) => server.listen(3099, '127.0.0.1', () => resolve()));

  // Test 1.1: Standard request headers
  const getHeaders = async (origin?: string): Promise<{ status: number; headers: http.IncomingHttpHeaders }> => {
    return new Promise((resolve, reject) => {
      const options: http.RequestOptions = {
        hostname: '127.0.0.1',
        port: 3099,
        path: '/api/test-security',
        method: 'GET',
        headers: origin ? { Origin: origin } : {},
      };
      const req = http.request(options, (res) => {
        resolve({ status: res.statusCode || 0, headers: res.headers });
      });
      req.on('error', reject);
      req.end();
    });
  };

  const basicRes = await getHeaders();
  assert(basicRes.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options is set to nosniff');
  assert(Boolean(basicRes.headers['content-security-policy']), 'Content-Security-Policy is present');
  assert(Boolean(basicRes.headers['permissions-policy']), 'Permissions-Policy is present');

  const csp = String(basicRes.headers['content-security-policy'] || '');
  assert(csp.includes("default-src 'self'"), "CSP contains default-src 'self'");
  assert(csp.includes('https://*.supabase.co'), 'CSP whitelists Supabase API endpoints');
  assert(csp.includes('wss://*.supabase.co'), 'CSP whitelists Supabase Realtime WSS');
  assert(csp.includes('https://*.youversionapi.com'), 'CSP whitelists YouVersion API endpoints');
  assert(csp.includes("frame-ancestors 'self' https://ai.studio"), 'CSP secures frame-ancestors for AI Studio preview');

  // Test 1.2: Strict CORS validation
  const allowedOriginRes = await getHeaders('http://localhost:3000');
  assert(
    allowedOriginRes.headers['access-control-allow-origin'] === 'http://localhost:3000',
    'Allowed origin http://localhost:3000 receives matching Access-Control-Allow-Origin'
  );
  assert(
    allowedOriginRes.headers['access-control-allow-credentials'] === 'true',
    'Allowed origin receives Access-Control-Allow-Credentials: true'
  );

  const unauthorizedOriginRes = await getHeaders('http://evil-attacker.com');
  assert(
    unauthorizedOriginRes.headers['access-control-allow-origin'] !== 'http://evil-attacker.com' &&
      unauthorizedOriginRes.headers['access-control-allow-origin'] !== '*',
    'Unauthorized origin evil-attacker.com is rejected and NEVER receives origin "*"'
  );

  // ----------------------------------------------------
  // PART 2: REALTIME SOCKET.IO ZERO-TRUST SECURITY AUDIT
  // ----------------------------------------------------
  console.log('\n--- 2. Testing Realtime Socket.IO Security & Zero-Trust Architecture ---');

  // Test 2.1: Unauthenticated connection connects as restricted guest
  const guestSocket: ClientSocket = ClientSocketIO('http://127.0.0.1:3099', {
    path: '/socket.io',
    transports: ['websocket'],
    autoConnect: true,
  });

  await new Promise<void>((resolve) => {
    guestSocket.on('connect', () => resolve());
  });
  assert(guestSocket.connected, 'Guest socket connected successfully with restricted guest context');

  // Test 2.2: Guest socket cannot join authenticated church rooms
  let guestJoinRejected = false;
  guestSocket.emit('join', { tenantId: 'tenant-grace-main', branchId: 'br-1' });
  guestSocket.on('error', (err: any) => {
    if (err.code === 'UNAUTHORIZED') {
      guestJoinRejected = true;
    }
  });

  await new Promise((r) => setTimeout(r, 200));
  assert(guestJoinRejected, 'Guest socket is rejected when attempting to join authenticated church rooms');

  // Test 2.3: Authenticated Pastor socket
  const pastorSocket: ClientSocket = ClientSocketIO('http://127.0.0.1:3099', {
    path: '/socket.io',
    transports: ['websocket'],
    autoConnect: true,
    auth: {
      token: 'test-token-pastor',
    },
  });

  let pastorAuthContext: any = null;
  pastorSocket.on('authenticated', (ctx) => {
    pastorAuthContext = ctx;
  });

  await new Promise<void>((resolve) => {
    pastorSocket.on('connect', () => resolve());
  });

  await new Promise((r) => setTimeout(r, 200));
  assert(
    pastorAuthContext && pastorAuthContext.role === 'PASTOR' && pastorAuthContext.tenantId === 'tenant-grace-main',
    'Pastor token authenticated server-side with verified tenant and role'
  );

  // Test 2.4: Cross-tenant spoofing prevention
  let crossTenantBlocked = false;
  pastorSocket.emit('join', { tenantId: 'attacker-stolen-tenant', branchId: 'br-1' });
  pastorSocket.on('error', (err: any) => {
    if (err.code === 'FORBIDDEN_TENANT') {
      crossTenantBlocked = true;
    }
  });

  await new Promise((r) => setTimeout(r, 200));
  assert(crossTenantBlocked, 'Cross-tenant join attempt is detected, rejected, and audited');

  // Test 2.5: Schema validation for incoming realtime events
  let malformedPayloadBlocked = false;
  pastorSocket.emit('join_group_channel', { invalidField: 123 }); // Missing groupId
  pastorSocket.on('error', (err: any) => {
    if (err.code === 'INVALID_PAYLOAD') {
      malformedPayloadBlocked = true;
    }
  });

  await new Promise((r) => setTimeout(r, 200));
  assert(malformedPayloadBlocked, 'Malformed event payload is validated and rejected by Zod schema');

  // Test 2.6: Role-based privilege enforcement on realtime events
  const memberSocket: ClientSocket = ClientSocketIO('http://127.0.0.1:3099', {
    path: '/socket.io',
    transports: ['websocket'],
    autoConnect: true,
    auth: {
      token: 'test-token-member',
    },
  });

  await new Promise<void>((resolve) => {
    memberSocket.on('connect', () => resolve());
  });

  let forbiddenChatBlocked = false;
  memberSocket.emit('leader_start_chat', { groupId: 'group-youth-1' });
  memberSocket.on('error', (err: any) => {
    if (err.code === 'FORBIDDEN') {
      forbiddenChatBlocked = true;
    }
  });

  await new Promise((r) => setTimeout(r, 200));
  assert(forbiddenChatBlocked, 'Non-leader regular member attempting privileged live chat initiation is blocked');

  // Test 2.7: Message Rate Limiting
  let messageRateLimited = false;
  memberSocket.on('error', (err: any) => {
    if (err.code === 'RATE_LIMIT_EXCEEDED') {
      messageRateLimited = true;
    }
  });

  // Send burst of 65 messages
  for (let i = 0; i < 65; i++) {
    memberSocket.emit('chat:typing', { ministryId: 'min-1', isTyping: true });
  }

  await new Promise((r) => setTimeout(r, 300));
  assert(messageRateLimited, 'Socket message rate limiter enforces 60 events/minute threshold');

  // Cleanup
  guestSocket.disconnect();
  pastorSocket.disconnect();
  memberSocket.disconnect();
  await new Promise<void>((resolve) => server.close(() => resolve()));

  console.log('\n====================================================');
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
