/**
 * Behavioural tests for the hardening modules.  Run:  npx tsx scripts/test-hardening.ts
 * No database or network required.
 */
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import {
  sniffAllowedType,
  sanitizeFolder,
  sanitizeBaseName,
  storageUploadHandlers,
  UploadError,
  type StorageClientLike,
} from '../server/routes/storageUpload';
import { createTenantContextMiddleware } from '../src/middleware/tenantMiddleware';
import {
  BoundedRateLimitStore,
  setRateLimitRedisClient,
  type RedisLike,
} from '../server/middleware/rateLimitStore';
import {
  classifyTokenOrigin,
  mayUseLocalVerification,
  requireStoredAccount,
  verifySovereignToken,
  SovereignTokenError,
} from '../src/security/sovereignJwt';

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}\n        ${(err as Error).message}`);
  }
}

function mockRes() {
  const state: { status?: number; body?: any } = {};
  const res = {
    status(code: number) {
      state.status = code;
      return res;
    },
    json(body: unknown) {
      state.body = body;
      return res;
    },
  } as unknown as Response;
  return { res, state };
}

const PDF = Buffer.from('%PDF-1.7\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\n', 'latin1');
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const ZIP = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(32)]);

async function main(): Promise<void> {
  console.log('\n[storageUpload] content & path validation');
  await test('PDF/PNG/ZIP recognised by magic bytes', () => {
    assert.equal(sniffAllowedType(PDF)?.mime, 'application/pdf');
    assert.equal(sniffAllowedType(PNG)?.mime, 'image/png');
    assert.equal(sniffAllowedType(ZIP)?.mime, 'application/zip');
  });
  await test('SVG / HTML / XML text is rejected', () => {
    assert.equal(sniffAllowedType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), null);
    assert.equal(sniffAllowedType(Buffer.from('<!DOCTYPE html><html></html>')), null);
    assert.equal(sniffAllowedType(Buffer.from('  <?xml version="1.0"?><a/>')), null);
  });
  await test('binary garbage and empty buffers are rejected', () => {
    assert.equal(sniffAllowedType(Buffer.from([0, 1, 2, 3, 4, 0xff, 0xfe])), null);
    assert.equal(sniffAllowedType(Buffer.alloc(0)), null);
  });
  await test('plain text / CSV accepted', () => {
    assert.equal(sniffAllowedType(Buffer.from('name,phone\nAbebe,0911'))?.mime, 'text/plain');
  });
  await test('sanitizeFolder blocks traversal and odd characters', () => {
    assert.equal(sanitizeFolder(undefined), 'uploads');
    assert.equal(sanitizeFolder('Reports/2026'), 'reports/2026');
    for (const bad of ['../etc', 'a/../b', '/', 'a b', 'a/b/c/d', 'x'.repeat(60), '.hidden', 'a\\b']) {
      assert.throws(() => sanitizeFolder(bad), UploadError, `should reject ${JSON.stringify(bad)}`);
    }
  });
  await test('sanitizeBaseName strips path and unicode tricks', () => {
    assert.equal(sanitizeBaseName('../../évil name.pdf'), 'evil_name');
    assert.equal(sanitizeBaseName('....pdf'), 'file');
  });

  console.log('\n[storageUpload] handler behaviour');
  const uploads: Array<{ bucket: string; path: string; opts: { contentType: string; upsert: boolean } }> = [];
  const fakeSupabase: StorageClientLike = {
    storage: {
      from: (bucket: string) => ({
        async upload(path, _body, opts) {
          uploads.push({ bucket, path, opts });
          return { error: null };
        },
        getPublicUrl: (path) => ({ data: { publicUrl: `https://pub/${bucket}/${path}` } }),
        async createSignedUrl(path) {
          return { data: { signedUrl: `https://signed/${bucket}/${path}?t=1` }, error: null };
        },
      }),
    },
  };
  const audits: string[] = [];
  const makeHandler = (overrides: Partial<Parameters<typeof storageUploadHandlers>[0]> = {}) =>
    storageUploadHandlers({
      adminSupabase: fakeSupabase,
      audit: (e) => void audits.push(`${e.userId}|${e.tenantId}|${e.details}`),
      isProduction: true,
      ...overrides,
    })[1];
  const user = { id: 'u1', tenantId: 't1' };
  const mkReq = (file: Partial<Express.Multer.File> | undefined, body: Record<string, unknown> = {}, u: any = user) =>
    ({ user: u === null ? undefined : u, file, body }) as any;
  const file = (name: string, buf: Buffer, mimetype = 'text/html') =>
    ({ originalname: name, buffer: buf, size: buf.length, mimetype }) as Express.Multer.File;

  await test('valid PDF is stored under tenant prefix, never upserted, with sniffed content-type', async () => {
    const { res, state } = mockRes();
    await makeHandler()(mkReq(file('Budget 2026.pdf', PDF, 'text/html')), res, (e?: unknown) => assert.fail(String(e)));
    assert.equal(state.status, 201);
    assert.equal(uploads.at(-1)!.opts.upsert, false);
    assert.equal(uploads.at(-1)!.opts.contentType, 'application/pdf'); // client said text/html
    assert.match(uploads.at(-1)!.path, /^t1\/uploads\/[0-9a-f-]{36}-Budget_2026\.pdf$/);
    assert.match(state.body.url, /^https:\/\/signed\//); // private bucket -> signed URL
    assert.ok(audits.at(-1)!.startsWith('u1|t1|'));
  });
  await test('public bucket returns public URL', async () => {
    const { res, state } = mockRes();
    await makeHandler({ publicBuckets: ['documents-vault'] })(mkReq(file('a.png', PNG)), res, () => {});
    assert.match(state.body.url, /^https:\/\/pub\//);
  });
  await test('OOXML gets the right MIME from its extension', async () => {
    const { res } = mockRes();
    await makeHandler()(mkReq(file('x.docx', ZIP)), res, () => {});
    assert.match(uploads.at(-1)!.opts.contentType, /wordprocessingml/);
  });
  await test('SVG upload is refused (415)', async () => {
    const { res, state } = mockRes();
    await makeHandler()(mkReq(file('logo.svg', Buffer.from('<svg onload=alert(1)/>'))), res, () => {});
    assert.equal(state.status, 415);
  });
  await test('extension/content mismatch refused (exe renamed to .pdf is not PDF; PDF named .png)', async () => {
    const a = mockRes();
    await makeHandler()(mkReq(file('x.pdf', Buffer.from('MZ\x90\x00\x03', 'latin1'))), a.res, () => {});
    assert.equal(a.state.status, 415);
    const b = mockRes();
    await makeHandler()(mkReq(file('x.png', PDF)), b.res, () => {});
    assert.equal(b.state.status, 415);
    assert.equal(b.state.body.code, 'EXTENSION_MISMATCH');
  });
  await test('bucket outside allowlist refused (403); traversal folder refused (400)', async () => {
    const a = mockRes();
    await makeHandler()(mkReq(file('a.pdf', PDF), { bucket: 'auth-private' }), a.res, () => {});
    assert.equal(a.state.status, 403);
    const b = mockRes();
    await makeHandler()(mkReq(file('a.pdf', PDF), { folder: '../other-tenant' }), b.res, () => {});
    assert.equal(b.state.status, 400);
  });
  await test('no storage in production -> 503, nothing returned as data URL', async () => {
    const { res, state } = mockRes();
    await makeHandler({ adminSupabase: null })(mkReq(file('a.pdf', PDF)), res, () => {});
    assert.equal(state.status, 503);
    assert.equal(state.body.publicUrl, undefined);
  });
  await test('per-bucket authorize hook can deny (403) and is bypass-proof via bucket allowlist', async () => {
    const { res, state } = mockRes();
    await makeHandler({ authorize: (_u, b) => b !== 'documents-vault' })(mkReq(file('a.pdf', PDF)), res, () => {});
    assert.equal(state.status, 403);
    assert.equal(state.body.code, 'FORBIDDEN');
    const ok = mockRes();
    await makeHandler({ authorize: (_u, b) => b === 'member-photos' })(mkReq(file('a.png', PNG), { bucket: 'member-photos' }), ok.res, () => {});
    assert.equal(ok.state.status, 201);
    assert.equal(ok.state.body.publicUrl, ok.state.body.url); // backwards-compatible alias
  });
  await test('missing user / missing file handled', async () => {
    const a = mockRes();
    await makeHandler()(mkReq(file('a.pdf', PDF), {}, null), a.res, () => {});
    assert.equal(a.state.status, 401);
    const b = mockRes();
    await makeHandler()(mkReq(undefined), b.res, () => {});
    assert.equal(b.state.status, 400);
  });

  console.log('\n[tenantMiddleware]');
  const mw = createTenantContextMiddleware();
  const BR_A = '11111111-1111-4111-8111-111111111111';
  const BR_B = '22222222-2222-4222-8222-222222222222';
  const run = (req: any) => {
    const { res, state } = mockRes();
    let nexted = false;
    const merged = { headers: {}, query: {}, ...req } as any;
    mw(merged, res, () => void (nexted = true));
    return { state, nexted, req: merged };
  };
  await test('unauthenticated request is rejected (no header-supplied tenant)', () => {
    const r = run({ headers: { 'x-tenant-id': 'victim' } });
    assert.equal(r.state.status, 401);
    assert.equal(r.nexted, false);
  });
  await test('anonymous scope comes only from server config', () => {
    const m = createTenantContextMiddleware({ anonymousScope: () => ({ tenantId: 'cfg-t', branchId: 'cfg-b' }) });
    const req: any = { headers: { 'x-tenant-id': 'victim' }, query: { tenantId: 'victim' } };
    let ok = false;
    m(req, mockRes().res, () => void (ok = true));
    assert.ok(ok);
    assert.equal(req.tenantId, 'cfg-t');
  });
  await test('user without tenant is denied rather than defaulted', () => {
    const r = run({ user: { id: 'u', role: 'REGULAR_MEMBER', branchId: BR_A, branchIds: [BR_A] } });
    assert.equal(r.state.status, 403);
  });
  await test('member cannot switch to another branch or request "all"', () => {
    const base = { id: 'u', role: 'REGULAR_MEMBER', tenantId: 't1', branchId: BR_A, branchIds: [BR_A] };
    assert.equal(run({ user: base, headers: { 'x-branch-id': BR_B } }).state.status, 403);
    assert.equal(run({ user: base, query: { branchId: 'all' } }).state.status, 403);
    const own = run({ user: base, headers: { 'x-branch-id': BR_A } });
    assert.ok(own.nexted);
    assert.equal(own.req.branchId, BR_A);
  });
  await test('pastor may use "all" or a well-formed branch; malformed ids are rejected', () => {
    const pastor = { id: 'p', role: 'PASTOR', tenantId: 't1', branchId: BR_A, branchIds: ['*', BR_A] };
    assert.equal(run({ user: pastor, headers: { 'x-branch-id': 'all' } }).req.branchId, 'all');
    assert.equal(run({ user: pastor, headers: { 'x-branch-id': BR_B } }).req.branchId, BR_B);
    assert.equal(run({ user: pastor, headers: { 'x-branch-id': "1' OR '1'='1" } }).state.status, 400);
  });
  await test('tenant always comes from the session', () => {
    const r = run({
      user: { id: 'p', role: 'PASTOR', tenantId: 'real', branchId: BR_A, branchIds: ['*'] },
      headers: { 'x-tenant-id': 'victim' },
      query: { tenantId: 'victim' },
    });
    assert.equal(r.req.tenantId, 'real');
  });

  console.log('\n[rateLimitStore]');
  await test('counts within a window and resets after it', async () => {
    const s = new BoundedRateLimitStore('t', 40);
    assert.equal((await s.increment('k')).totalHits, 1);
    assert.equal((await s.increment('k')).totalHits, 2);
    await new Promise((r) => setTimeout(r, 60));
    assert.equal((await s.increment('k')).totalHits, 1);
    s.dispose();
  });
  await test('local map is bounded under a flood of distinct keys', async () => {
    const s = new BoundedRateLimitStore('flood', 60_000);
    for (let i = 0; i < 50_500; i++) await s.increment(`ip:${i}`);
    assert.ok(s.localSize <= 50_000, `size ${s.localSize}`);
    s.dispose();
  });
  await test('uses Redis when a client is installed, falls back locally when Redis throws', async () => {
    const calls: string[] = [];
    let broken = false;
    const redis: RedisLike = {
      async incr(k) {
        if (broken) throw new Error('down');
        calls.push(`incr:${k}`);
        return 1;
      },
      async pexpire(k) {
        calls.push(`pexpire:${k}`);
        return 1;
      },
      async pttl() {
        return -1;
      },
      async decr() {
        return 0;
      },
      async del() {
        return 0;
      },
    };
    setRateLimitRedisClient(redis);
    const s = new BoundedRateLimitStore('r', 1000);
    const first = await s.increment('a');
    assert.equal(first.totalHits, 1);
    assert.deepEqual(calls, ['incr:rl:r:a', 'pexpire:rl:r:a']);
    broken = true;
    assert.equal((await s.increment('a')).totalHits, 1); // local fallback, no throw
    assert.equal((await s.increment('a')).totalHits, 2);
    setRateLimitRedisClient(null);
    s.dispose();
  });

  console.log('\n[sovereignJwt]');
  const secret = 'x'.repeat(48);
  await test('classifies Supabase-issued tokens and refuses local verification for them', () => {
    const sb = jwt.decode(jwt.sign({ sub: 'a', iss: 'https://abc.supabase.co/auth/v1', aud: 'authenticated' }, secret));
    assert.equal(classifyTokenOrigin(sb), 'supabase');
    assert.equal(mayUseLocalVerification('supabase'), false);
    const own = jwt.decode(jwt.sign({ sub: 'a', role: 'PASTOR' }, secret));
    assert.equal(classifyTokenOrigin(own), 'sovereign');
    assert.equal(classifyTokenOrigin(null), 'sovereign');
  });
  await test('accepts a good token', () => {
    const p = verifySovereignToken(jwt.sign({ sub: 'u1' }, secret, { expiresIn: '1h' }), { secret });
    assert.equal(p.sub, 'u1');
  });
  await test('rejects: wrong secret, alg=none, missing exp, missing subject, expired, too old', () => {
    const expectInvalid = (t: string, code = 'INVALID_TOKEN') =>
      assert.throws(
        () => verifySovereignToken(t, { secret }),
        (e: unknown) => e instanceof SovereignTokenError && e.code === code
      );
    expectInvalid(jwt.sign({ sub: 'u' }, 'y'.repeat(48), { expiresIn: '1h' }));
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(
      JSON.stringify({ sub: 'u', exp: Math.floor(Date.now() / 1000) + 3600 })
    ).toString('base64url')}.`;
    expectInvalid(none);
    expectInvalid(jwt.sign({ sub: 'u' }, secret)); // no exp
    expectInvalid(jwt.sign({ role: 'PASTOR' }, secret, { expiresIn: '1h' })); // no subject
    expectInvalid(jwt.sign({ sub: 'u' }, secret, { expiresIn: -10 }), 'TOKEN_EXPIRED');
    const old = jwt.sign({ sub: 'u', iat: Math.floor(Date.now() / 1000) - 9 * 3600 }, secret, { expiresIn: '7d' });
    expectInvalid(old, 'TOKEN_EXPIRED'); // the 7-day tokens minted after password change exceed the 8h policy
  });
  await test('stored-account requirement is opt-in', () => {
    assert.equal(requireStoredAccount({}), false);
    assert.equal(requireStoredAccount({ CMMS_REQUIRE_STORED_ACCOUNT: 'true' } as any), true);
  });
  await test('enforces issuer when configured', () => {
    const t = jwt.sign({ sub: 'u' }, secret, { expiresIn: '1h', issuer: 'cmms' });
    assert.equal(verifySovereignToken(t, { secret, issuer: 'cmms' }).sub, 'u');
    assert.throws(() => verifySovereignToken(t, { secret, issuer: 'other' }));
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
