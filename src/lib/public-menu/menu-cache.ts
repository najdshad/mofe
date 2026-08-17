export const DEFAULT_MENU_TTL_MS = 60_000;

type Entry = { html: string | null; expiresAt: number };

const cache = new Map<string, Entry>();

// ponytail: in-process only, stale ≤ TTL after edits. Multi-instance deploys need a shared store or CDN.
export function clearMenuCache(slug?: string) {
  if (slug) {
    cache.delete(slug);
    return;
  }
  cache.clear();
}

export async function getCachedMenuHtml(
  slug: string,
  build: () => Promise<string | null>,
  ttlMs: number = process.env.NODE_ENV === "test" ? 0 : DEFAULT_MENU_TTL_MS
): Promise<string | null> {
  const now = Date.now();
  const hit = cache.get(slug);
  if (hit && hit.expiresAt > now) {
    return hit.html;
  }
  if (hit) {
    cache.delete(slug);
  }

  const html = await build();
  if (ttlMs > 0) {
    cache.set(slug, { html, expiresAt: now + ttlMs });
  }
  return html;
}
