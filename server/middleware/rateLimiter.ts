import { Request, Response, NextFunction } from 'express';
import rateLimit, { Options, Store, RateLimitRequestHandler } from 'express-rate-limit';
import { BoundedRateLimitStore } from './rateLimitStore';
import { securityAuditService } from '../services/securityAuditService';

// ==========================================================
// 1. HARDENED REVERSE PROXY & CLIENT IP RESOLUTION
// ==========================================================

/**
 * Extracts client IP securely using Express verified req.ip.
 * Never blindly trusts raw unverified headers such as user-supplied x-forwarded-for.
 */
export function getClientIp(req: Request): string {
  if (req.ip) {
    return req.ip;
  }
  const socketAddr = req.socket?.remoteAddress;
  if (socketAddr) {
    return socketAddr.replace(/^.*:/, ''); // normalize IPv6 mapped IPv4
  }
  return '127.0.0.1';
}

/**
 * Masks sensitive identifiers for security logs.
 * Never logs passwords, tokens, full emails, or raw secrets.
 */
export function maskIdentifier(identifier?: string): string {
  if (!identifier) return 'anonymous';
  if (identifier.includes('@')) {
    const [user, domain] = identifier.split('@');
    return `${user.slice(0, 2)}***@${domain}`;
  }
  if (identifier.length > 8) {
    return `${identifier.slice(0, 4)}***${identifier.slice(-2)}`;
  }
  return '***';
}

// ==========================================================
// 2. DISTRIBUTED SHARED STORE ABSTRACTION (REDIS / CLUSTER)
// ==========================================================

export interface ISharedRateLimitStoreFactory {
  createStore(prefix: string, windowMs: number): Store | undefined;
}

/**
 * Distributed In-Memory / Redis compatible shared store interface.
 * When horizontally scaled, configure REDIS_URL to automatically route hits
 * through a shared Redis cluster rather than local node memory.
 */
let customStoreFactory: ISharedRateLimitStoreFactory | null = null;
const activeStoreAdapters: BoundedRateLimitStore[] = [];

/**
 * Register a custom store factory (e.g. for enterprise Redis clusters or test harnesses)
 */
export function setRateLimitStoreFactory(factory: ISharedRateLimitStoreFactory | null): void {
  customStoreFactory = factory;
}

/**
 * Creates the appropriate rate limit store based on infrastructure environment.
 */
export function createRateLimitStore(prefix: string, windowMs: number): Store | undefined {
  if (customStoreFactory) {
    return customStoreFactory.createStore(prefix, windowMs);
  }
  // Redis is used automatically once initRateLimitRedisFromEnv() has installed a client;
  // otherwise counters are per-instance and bounded (see rateLimitStore.ts).
  const store = new BoundedRateLimitStore(prefix, windowMs);
  activeStoreAdapters.push(store);
  return store;
}

/**
 * Reset all active stores (primarily used for test suites)
 */
export async function resetAllRateLimitStores(): Promise<void> {
  for (const adapter of activeStoreAdapters) {
    await adapter.resetAll();
  }
}

// ==========================================================
// 3. SECURE RATE LIMIT HANDLERS & FACTORY
// ==========================================================

interface CustomLimiterConfig {
  category: string;
  windowMs: number;
  max: number;
  message: string;
  keyType: 'ip' | 'user' | 'api-key';
  skipSuccessfulRequests?: boolean;
}

/**
 * Builds a standardized production-grade rate limiter with security audit logging
 * and HTTP 429 + Retry-After headers.
 */
function buildLimiter(config: CustomLimiterConfig): RateLimitRequestHandler {
  const store = createRateLimitStore(config.category, config.windowMs);

  return rateLimit({
    windowMs: config.windowMs,
    limit: config.max,
    standardHeaders: 'draft-7', // draft-6/draft-7 RateLimit headers
    legacyHeaders: true,        // X-RateLimit-* headers
    validate: false,
    store,
    skip: (req: Request) => {
      // Never rate limit health checks
      if (req.path === '/api/health' || req.path === '/health') {
        return true;
      }
      return false;
    },
    keyGenerator: (req: Request): string => {
      const clientIp = getClientIp(req);

      if (config.keyType === 'user') {
        const userId = (req as any).user?.id || (req as any).user?.email;
        if (userId) {
          return `user:${userId}`;
        }
        return `ip:${clientIp}`;
      }

      if (config.keyType === 'api-key') {
        const apiKeyId =
          (req as any).apiKeyRecord?.id ||
          req.headers['x-api-key'] ||
          req.headers['x-cmms-api-key'];
        if (apiKeyId) {
          return `apikey:${apiKeyId}`;
        }
        return `ip:${clientIp}`;
      }

      // Default IP-based
      return `ip:${clientIp}`;
    },
    handler: (req: Request, res: Response, _next: NextFunction, options: Options) => {
      const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
      res.setHeader('Retry-After', retryAfterSeconds.toString());

      const clientIp = getClientIp(req);
      const userIdentifier = (req as any).user?.email || (req as any).body?.identifier || (req as any).body?.email;
      const masked = maskIdentifier(userIdentifier);

      // Security Audit Logging (without printing passwords, tokens, or OTP codes)
      console.warn(
        `[Security RateLimit] Throttled request: category="${config.category}" IP="${clientIp}" target="${masked}" path="${req.path}" method="${req.method}" retryAfter=${retryAfterSeconds}s`
      );

      securityAuditService.recordEvent({
        req,
        eventType: 'RATE_LIMIT_VIOLATION',
        action: `Rate Limit Exceeded (${config.category})`,
        module: 'Rate Limiter & Traffic Protection',
        details: `Throttled request on ${req.method} ${req.originalUrl || req.path} (category: ${config.category}, target: ${masked}, retryAfter: ${retryAfterSeconds}s)`,
        actorEmail: userIdentifier ? String(userIdentifier) : undefined,
        outcome: 'BLOCKED',
        severity: 'MEDIUM',
        metadata: {
          category: config.category,
          limit: config.max,
          windowMs: config.windowMs,
          retryAfterSeconds,
          maskedTarget: masked,
        },
      });

      return res.status(429).json({
        success: false,
        error: config.message,
        code: 'RATE_LIMIT_EXCEEDED',
        category: config.category,
        retryAfter: retryAfterSeconds,
      });
    },
  });
}

// ==========================================================
// 4. THE 10 SEPARATE PRODUCTION-GRADE LIMITERS
// ==========================================================

/**
 * 1. Login Limiter
 * 10 attempts per 15 minutes per IP.
 * Defends against credential stuffing and password guessing.
 */
export const loginLimiter = buildLimiter({
  category: 'auth-login',
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyType: 'ip',
  message: 'Too many login attempts. For security reasons, please try again in 15 minutes.',
});

/**
 * 2. Password Reset Request Limiter
 * 5 requests per 15 minutes per IP.
 * Crucial: Generic message to NEVER reveal whether an account exists.
 */
export const passwordResetRequestLimiter = buildLimiter({
  category: 'password-reset-request',
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyType: 'ip',
  message: 'Too many password reset requests. Please wait 15 minutes before requesting another reset link.',
});

/**
 * 3. Password Reset Verification Limiter
 * 5 attempts per 15 minutes per IP.
 * Strictly prevents brute-forcing of 6-digit OTP verification codes.
 */
export const passwordResetVerifyLimiter = buildLimiter({
  category: 'password-reset-verify',
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyType: 'ip',
  message: 'Too many verification code attempts. Please wait 15 minutes before retrying.',
});

/**
 * 4. MFA Verification Limiter
 * 5 attempts per 15 minutes per user / IP.
 * Prevents automated TOTP / SMS 2FA brute force.
 */
export const mfaVerifyLimiter = buildLimiter({
  category: 'mfa-verify',
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyType: 'user',
  message: 'Too many two-factor authentication attempts. Account verification temporarily throttled.',
});

/**
 * 5. Public Registration Limiter
 * 10 accounts per hour per IP.
 * Prevents automated bot registrations and spam accounts.
 */
export const publicRegistrationLimiter = buildLimiter({
  category: 'public-registration',
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyType: 'ip',
  message: 'Registration rate limit reached. Please try again later.',
});

/**
 * 6. Public Forms Limiter
 * 30 submissions per 15 minutes per IP.
 * Protects public prayer requests, contact, and visitor forms from flooding.
 */
export const publicFormsLimiter = buildLimiter({
  category: 'public-forms',
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyType: 'ip',
  message: 'Form submission limit reached. Please wait a few minutes before submitting another request.',
});

/**
 * 7. General Authenticated API Limiter
 * 1200 requests per 15 minutes (~80 req/min) per authenticated user.
 * Generous threshold ensures church members and pastors never experience disruptions
 * during normal daily operations, real-time sync, and reporting.
 */
export const generalAuthenticatedLimiter = buildLimiter({
  category: 'general-api',
  windowMs: 15 * 60 * 1000,
  max: 1200,
  keyType: 'user',
  message: 'API request rate limit exceeded. Please slow down your requests.',
});

/**
 * 8. Sensitive Admin Operations Limiter
 * 100 operations per 15 minutes per admin user.
 * Throttles critical changes: role updates, system configs, database exports, user deletion.
 */
export const sensitiveAdminLimiter = buildLimiter({
  category: 'sensitive-admin',
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyType: 'user',
  message: 'Administrative operation rate limit reached. Please wait before performing further sensitive actions.',
});

/**
 * 9. File Uploads Limiter
 * 30 uploads per 15 minutes per user / IP.
 * Protects storage quotas and prevents denial of service via file floods.
 */
export const fileUploadLimiter = buildLimiter({
  category: 'file-uploads',
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyType: 'user',
  message: 'File upload rate limit reached. Please wait before uploading more documents.',
});

/**
 * 10. External API Endpoints Limiter
 * 120 requests per minute per API Key / client.
 * Governs external church website integrations, biometric check-in kiosks, and webhooks.
 */
export const externalApiLimiter = buildLimiter({
  category: 'external-api',
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  keyType: 'api-key',
  message: 'External API quota exceeded. Rate limit is 120 requests per minute.',
});
