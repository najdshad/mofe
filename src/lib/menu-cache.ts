const menuCache = new Map<string, { html: string; createdAt: number }>();
const slugToKeys = new Map<string, Set<string>>();
const CACHE_TTL_MS = 60_000;

export function getCached(key: string): string | undefined {
  const entry = menuCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    menuCache.delete(key);
    return undefined;
  }
  return entry.html;
}

export function setCache(key: string, html: string, slug: string) {
  if (menuCache.size > 1000) {
    const oldest = menuCache.entries().next().value;
    if (oldest) menuCache.delete(oldest[0]);
  }
  menuCache.set(key, { html, createdAt: Date.now() });
  if (!slugToKeys.has(slug)) {
    slugToKeys.set(slug, new Set());
  }
  slugToKeys.get(slug)!.add(key);
}

export function clearMenuCache(slug: string) {
  const keys = slugToKeys.get(slug);
  if (keys) {
    for (const key of keys) {
      menuCache.delete(key);
    }
    slugToKeys.delete(slug);
  }
}
