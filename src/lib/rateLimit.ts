/**
 * Simple in-memory rate limiter per userId.
 * In production, replace with Upstash Redis + @upstash/ratelimit.
 */

interface RateLimitEntry {
    count: number;
    windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 20; // per window per user

export function rateLimitCheck(userId: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const entry = store.get(userId);

    if (!entry || now - entry.windowStart > WINDOW_MS) {
        store.set(userId, { count: 1, windowStart: now });
        return { allowed: true, remaining: MAX_REQUESTS - 1 };
    }

    if (entry.count >= MAX_REQUESTS) {
        return { allowed: false, remaining: 0 };
    }

    entry.count++;
    return { allowed: true, remaining: MAX_REQUESTS - entry.count };
}

// Clean up old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (now - entry.windowStart > WINDOW_MS * 2) {
            store.delete(key);
        }
    }
}, 5 * 60_000);
