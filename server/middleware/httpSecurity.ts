import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';

/**
 * Enterprise HTTP Security Layer
 * 
 * Provides:
 * 1. Strict CORS validation (No wildcard '*' for authenticated traffic)
 * 2. Helmet with hardened Content-Security-Policy (CSP)
 * 3. HSTS in production (Strict-Transport-Security)
 * 4. X-Content-Type-Options: nosniff
 * 5. Referrer-Policy: strict-origin-when-cross-origin
 * 6. Permissions-Policy (camera/mic self-scoped, geolocation/payment disabled)
 * 7. Secure Cookie defaults (HttpOnly, Secure, SameSite=Lax)
 * 8. HTTPS enforcement in production
 */

// Determine allowed origins from environment configuration and trusted platform domains
export function getAllowedOrigins(): (string | RegExp)[] {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.trim() : null;
  const appUrl = process.env.APP_URL ? process.env.APP_URL.trim() : null;

  // Production origins must be explicitly configured. Provider-wide wildcards
  // can authorize unrelated applications hosted by the same platform.
  const origins: (string | RegExp)[] = process.env.NODE_ENV === 'production'
    ? []
    : [
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
        'https://ai.studio',
      ];

  if (frontendUrl) origins.push(frontendUrl);
  if (appUrl) origins.push(appUrl);
  for (const o of envOrigins) {
    origins.push(o);
  }

  return origins;
}

/**
 * Validates an incoming origin against the trusted origin configuration.
 * Returns true if permitted, false otherwise.
 */
export function isOriginAllowed(origin?: string): boolean {
  if (!origin) {
    // Non-browser / same-origin requests (e.g. server-to-server curl / health-checks)
    return true;
  }

  const allowedOrigins = getAllowedOrigins();
  for (const pattern of allowedOrigins) {
    if (typeof pattern === 'string') {
      if (origin.toLowerCase() === pattern.toLowerCase()) return true;
    } else if (pattern instanceof RegExp) {
      if (pattern.test(origin)) return true;
    }
  }

  return false;
}

/**
 * Strict CORS middleware:
 * Rejects origin '*' for authenticated traffic.
 * Validates requests dynamically against configured origins.
 */
export const strictCorsMiddleware = cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS Policy] Blocked unauthorized origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CMMS-Api-Key',
    'X-Api-Key',
    'x-tenant-id',
    'Accept',
    'Origin',
  ],
  exposedHeaders: [
    'Retry-After',
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400, // 24 hours preflight cache
});

/**
 * HTTPS Enforcement middleware for production deployments
 */
export function enforceHttps(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production') {
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
      const secureUrl = `https://${req.headers.host}${req.url}`;
      return res.redirect(301, secureUrl);
    }
  }
  next();
}

/**
 * Permissions-Policy middleware
 * Restricts browser APIs: disables payment, usb, and geolocation; scopes camera/mic to self.
 */
export function permissionsPolicy(req: Request, res: Response, next: NextFunction) {
  res.setHeader(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=(), payment=(), usb=()'
  );
  next();
}

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Production-ready Helmet security headers middleware
 * Strict CSP supporting all legitimate application services (Supabase, YouVersion, Firebase, Google Fonts)
 * Explicitly avoids unsafe-eval in production, enables it in development for Vite runtime,
 * and configures frameAncestors/COOP to seamlessly work within AI Studio iframes.
 */
export const helmetSecurityMiddleware = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Vite SPA runtime module injection
        ...(isProduction ? [] : ["'unsafe-eval'"]),
        'blob:',
        'https://*.supabase.co',
        'https://apis.google.com',
        'https://*.gstatic.com',
        'https://translate.google.com',
        'https://translate.googleapis.com',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Tailwind CSS utility styles & dynamic themes
        'https://fonts.googleapis.com',
        'https://translate.googleapis.com',
      ],
      fontSrc: [
        "'self'",
        'data:',
        'https://fonts.gstatic.com',
      ],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://images.unsplash.com',
        'https://*.googleusercontent.com',
        'https://*.supabase.co',
        'https://*.gstatic.com',
        'https://www.google.com',
        'https://translate.google.com',
        'https://translate.googleapis.com',
      ],
      connectSrc: [
        "'self'",
        'https://*.supabase.co',
        'wss://*.supabase.co',
        'https://api.youversion.com',
        'https://*.youversion.com',
        'https://*.youversionapi.com',
        'https://platform.youversion.com',
        'https://*.googleapis.com',
        'https://*.firebaseio.com',
        'https://identitytoolkit.googleapis.com',
        'https://securetoken.googleapis.com',
        'https://api.ethiotelecom.et',
        'https://*.run.app',
        'https://*.google.com',
        'https://*.googleusercontent.com',
        'https://ai.studio',
        'https://*.ai.studio',
        'ws:',
        'wss:',
      ],
      workerSrc: ["'self'", 'blob:'],
      childSrc: ["'self'", 'blob:'],
      mediaSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://*.supabase.co',
        'https://api.youversion.com',
        'https://*.youversion.com',
        'https://*.youversionapi.com',
      ],
      frameSrc: [
        "'self'",
        'https://*.google.com',
        'https://accounts.google.com',
        'https://*.supabase.co',
        'https://*.youversion.com',
      ],
      frameAncestors: [
        "'self'",
        'https://ai.studio',
        'https://*.ai.studio',
        'https://*.google.com',
        'https://*.googleusercontent.com',
        'https://*.run.app',
        'http://localhost:*',
        'http://127.0.0.1:*',
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allows cross-origin assets (fonts, images)
  crossOriginOpenerPolicy: false, // CRITICAL: Disabled to allow previewing inside Google AI Studio iframes
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  originAgentCluster: false, // Prevent cross-origin iframe isolation conflicts in dev
  dnsPrefetchControl: { allow: true },
  frameguard: false, // Handled precisely by CSP frame-ancestors for AI Studio preview compatibility
  hidePoweredBy: true,
  hsts: isProduction
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  ieNoOpen: true,
  noSniff: true, // X-Content-Type-Options: nosniff
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

/**
 * Standard secure cookie options helper
 */
export const SECURE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
