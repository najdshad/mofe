import { prisma } from "@/lib/prisma";
import { renderPublicMenu, renderUnavailablePage } from "@/lib/public-menu/renderer";

const menuCache = new Map<string, { html: string; createdAt: number }>();
const CACHE_TTL_MS = 60_000;

function getCached(key: string): string | undefined {
  const entry = menuCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    menuCache.delete(key);
    return undefined;
  }
  return entry.html;
}

function setCache(key: string, html: string) {
  if (menuCache.size > 1000) {
    const oldest = menuCache.entries().next().value;
    if (oldest) menuCache.delete(oldest[0]);
  }
  menuCache.set(key, { html, createdAt: Date.now() });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const venue = await prisma.venue.findUnique({ where: { slug } });
  if (!venue) {
    const html = renderUnavailablePage("منو");
    return new Response(html, {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (venue.publicStatus !== "published") {
    const html = renderUnavailablePage(venue.nameFa);
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const publication = await prisma.menuPublication.findFirst({
    where: { venueId: venue.id, status: "published" },
    orderBy: { createdAt: "desc" },
  });

  if (!publication?.snapshot) {
    const html = renderUnavailablePage(venue.nameFa);
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const cacheKey = publication.id;
  const cached = getCached(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  }

  let snapshot;
  try {
    snapshot = JSON.parse(publication.snapshot);
  } catch {
    const html = renderUnavailablePage(venue.nameFa);
    return new Response(html, { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  const html = renderPublicMenu(snapshot);
  setCache(cacheKey, html);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
