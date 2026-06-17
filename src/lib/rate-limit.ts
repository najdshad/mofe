const rateMap = new Map<string, { count: number; resetAt: number }>();

const CLEANUP_INTERVAL_MS = 60_000;

let lastCleanup = Date.now();

function cleanupStale() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of rateMap) {
    if (now > entry.resetAt) {
      rateMap.delete(key);
    }
  }
}

export function rateLimit(key: string, maxAttempts = 5, windowMs = 60000) {
  cleanupStale();

  const now = Date.now();
  const entry = rateMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  entry.count++;
  if (entry.count > maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: maxAttempts - entry.count };
}
