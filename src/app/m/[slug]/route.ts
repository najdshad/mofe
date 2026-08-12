import { renderPublicMenu, renderUnavailablePage } from "@/lib/public-menu/renderer";
import { buildPublicSnapshot } from "@/lib/public-menu/publication";
import { getCachedMenuHtml } from "@/lib/public-menu/menu-cache";

const CSP_HEADER = "default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; script-src 'none'; font-src 'self'";

const MENU_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy": CSP_HEADER,
  "X-Frame-Options": "DENY",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
};

const NOT_FOUND_HEADERS = {
  ...MENU_HEADERS,
  "Cache-Control": "no-store",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const baseUrl = new URL(request.url).origin;

  const html = await getCachedMenuHtml(slug, async () => {
    const snapshot = await buildPublicSnapshot(slug);
    return snapshot ? renderPublicMenu(snapshot, baseUrl) : null;
  });

  if (!html) {
    return new Response(renderUnavailablePage("منو"), {
      status: 404,
      headers: NOT_FOUND_HEADERS,
    });
  }

  return new Response(html, { headers: MENU_HEADERS });
}