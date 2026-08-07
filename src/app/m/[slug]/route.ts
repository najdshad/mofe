import { renderPublicMenu, renderUnavailablePage } from "@/lib/public-menu/renderer";
import { buildPublicSnapshot } from "@/lib/public-menu/publication";

const CSP_HEADER = "default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; script-src 'none'; font-src 'self'";

const MENU_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy": CSP_HEADER,
  "X-Frame-Options": "DENY",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const baseUrl = new URL(request.url).origin;

  const snapshot = await buildPublicSnapshot(slug);
  if (!snapshot) {
    return new Response(renderUnavailablePage("منو"), {
      status: 404,
      headers: MENU_HEADERS,
    });
  }

  const html = renderPublicMenu(snapshot, baseUrl);
  return new Response(html, { headers: MENU_HEADERS });
}