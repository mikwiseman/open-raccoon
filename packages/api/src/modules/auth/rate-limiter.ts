import type { MiddlewareHandler } from 'hono';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory sliding-window rate limiter.
 *
 * NOTE: This implementation uses a process-local Map, which means rate limit
 * counters are NOT shared across multiple server instances. It is suitable for
 * single-instance deployments only. For horizontal scaling (multiple processes
 * or containers), replace the in-memory Map with a Redis-backed store (e.g.
 * using INCR + EXPIRE) so that rate limit state is shared across all instances.
 */
export function createRateLimiter(maxRequests: number, windowMs: number): MiddlewareHandler {
  const store = new Map<string, RateLimitEntry>();

  // Clean up expired entries every minute
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }, 60_000);

  // Allow cleanup to not prevent process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return async (c, next) => {
    // Use the rightmost x-forwarded-for IP (set by the most trusted proxy)
    // to prevent IP spoofing via the leftmost client-controlled value.
    // Reject empty/malformed segments to avoid bucket collisions.
    const forwardedFor = c.req.header('x-forwarded-for');
    const forwardedIp = forwardedFor
      ? forwardedFor
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .at(-1)
      : undefined;
    const ip = forwardedIp || c.req.header('x-real-ip') || 'unknown';

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now >= entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      return c.json(
        {
          error: 'Too many requests',
          retry_after: Math.ceil((entry.resetAt - now) / 1000),
        },
        429,
      );
    }

    entry.count += 1;
    return next();
  };
}
