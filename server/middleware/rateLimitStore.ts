/**
 * Rate-limit store with (a) a real, injectable Redis backend and (b) a bounded
 * in-memory fallback.
 *
 * Replaces `DistributedRedisStoreAdapter` in server/middleware/rateLimiter.ts, which
 *  - never received a Redis client (so REDIS_URL had no effect despite the log line),
 *  - never evicted expired keys from its fallback Map (unbounded memory growth).
 *
 * Wiring (server.ts, before the limiters are built):
 *   import { initRateLimitRedisFromEnv } from './server/middleware/rateLimitStore';
 *   await initRateLimitRedisFromEnv();   // no-op when REDIS_URL is unset
 *
 * and in rateLimiter.ts `createRateLimitStore()` return `new BoundedRateLimitStore(prefix, windowMs)`
 * in both branches (see AUDIT_REPORT.md, "Apply the patches").
 */
import type { Store, IncrementResponse, Options } from 'express-rate-limit';

/** Minimal surface of ioredis that this store needs. */
export interface RedisLike {
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<unknown>;
  pttl(key: string): Promise<number>;
  decr(key: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

let sharedRedis: RedisLike | null = null;

export function setRateLimitRedisClient(client: RedisLike | null): void {
  sharedRedis = client;
}

/**
 * Connects to REDIS_URL if present and installs the client. `ioredis` is loaded
 * dynamically so the dependency stays optional (`npm i ioredis` to enable).
 * A configured-but-unusable Redis is reported loudly instead of silently ignored.
 */
export async function initRateLimitRedisFromEnv(): Promise<boolean> {
  const url = process.env.REDIS_URL;
  if (!url) return false;
  try {
    const moduleName = 'ioredis';
    const mod: any = await import(/* @vite-ignore */ moduleName);
    const Redis = mod.default ?? mod;
    const client = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
    client.on('error', (err: Error) =>
      console.error('[RateLimit] Redis error (using local counters meanwhile):', err.message)
    );
    setRateLimitRedisClient(client as RedisLike);
    console.log('[RateLimit] Redis-backed shared store enabled.');
    return true;
  } catch (err) {
    console.error(
      '[RateLimit] REDIS_URL is set but the Redis client could not be initialised. ' +
        'Limits are per-instance only. Install `ioredis` and verify REDIS_URL.',
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

interface LocalEntry {
  hits: number;
  resetAt: number;
}

const MAX_LOCAL_KEYS = 50_000;
const SWEEP_INTERVAL_MS = 60_000;

export class BoundedRateLimitStore implements Store {
  /** Keys are prefixed by this store, not by express-rate-limit. */
  public localKeys = false;
  public readonly prefix: string;

  private windowMs: number;
  private readonly local = new Map<string, LocalEntry>();
  private sweeper: NodeJS.Timeout | null = null;

  constructor(prefix: string, windowMs: number) {
    this.prefix = prefix;
    this.windowMs = windowMs;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private fullKey(key: string): string {
    return `rl:${this.prefix}:${key}`;
  }

  private ensureSweeper(): void {
    if (this.sweeper) return;
    this.sweeper = setInterval(() => this.sweep(Date.now()), SWEEP_INTERVAL_MS);
    // Housekeeping must never keep the process (or a serverless invocation) alive.
    this.sweeper.unref?.();
  }

  private sweep(now: number): void {
    for (const [key, entry] of this.local) {
      if (entry.resetAt <= now) this.local.delete(key);
    }
  }

  private incrementLocal(fullKey: string): IncrementResponse {
    this.ensureSweeper();
    const now = Date.now();
    const existing = this.local.get(fullKey);

    if (!existing || existing.resetAt <= now) {
      if (this.local.size >= MAX_LOCAL_KEYS) {
        this.sweep(now);
        // Still full of live keys (e.g. a flood of distinct IPs): drop the oldest.
        while (this.local.size >= MAX_LOCAL_KEYS) {
          const oldest = this.local.keys().next().value;
          if (oldest === undefined) break;
          this.local.delete(oldest);
        }
      }
      const resetAt = now + this.windowMs;
      this.local.set(fullKey, { hits: 1, resetAt });
      return { totalHits: 1, resetTime: new Date(resetAt) };
    }

    existing.hits += 1;
    return { totalHits: existing.hits, resetTime: new Date(existing.resetAt) };
  }

  async increment(key: string): Promise<IncrementResponse> {
    const fullKey = this.fullKey(key);
    const redis = sharedRedis;

    if (redis) {
      try {
        const hits = await redis.incr(fullKey);
        let ttl = hits === 1 ? -1 : await redis.pttl(fullKey);
        // First hit, or a key that lost its TTL (crash between INCR and PEXPIRE).
        if (ttl < 0) {
          await redis.pexpire(fullKey, this.windowMs);
          ttl = this.windowMs;
        }
        return { totalHits: hits, resetTime: new Date(Date.now() + ttl) };
      } catch (err) {
        console.warn(
          `[RateLimit] Redis failure for "${this.prefix}"; using local counters for this request:`,
          err instanceof Error ? err.message : err
        );
      }
    }
    return this.incrementLocal(fullKey);
  }

  async decrement(key: string): Promise<void> {
    const fullKey = this.fullKey(key);
    if (sharedRedis) {
      try {
        await sharedRedis.decr(fullKey);
        return;
      } catch {
        /* fall through to local */
      }
    }
    const entry = this.local.get(fullKey);
    if (entry && entry.hits > 0) entry.hits -= 1;
  }

  async resetKey(key: string): Promise<void> {
    const fullKey = this.fullKey(key);
    if (sharedRedis) {
      try {
        await sharedRedis.del(fullKey);
      } catch {
        /* ignore */
      }
    }
    this.local.delete(fullKey);
  }

  async resetAll(): Promise<void> {
    // Redis keys expire on their own; wholesale deletion would need SCAN and is
    // only wanted by test suites, which use the local path.
    this.local.clear();
  }

  /** Test/ops visibility. */
  get localSize(): number {
    return this.local.size;
  }

  dispose(): void {
    if (this.sweeper) clearInterval(this.sweeper);
    this.sweeper = null;
    this.local.clear();
  }
}
