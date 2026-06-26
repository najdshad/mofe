import { prisma } from "@/lib/prisma";
import { renderPublicMenu, renderUnavailablePage } from "@/lib/public-menu/renderer";

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

  let snapshot;
  try {
    snapshot = JSON.parse(publication.snapshot);
  } catch {
    const html = renderUnavailablePage(venue.nameFa);
    return new Response(html, { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  const html = renderPublicMenu(snapshot);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
