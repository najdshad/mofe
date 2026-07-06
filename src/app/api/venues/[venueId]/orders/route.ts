import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { proxyToOrdering } from "@/lib/ordering-proxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);
    const cookie = request.headers.get("cookie") || "";
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");
    let path = "/api/orders";
    if (statusParam) path += `?status=${statusParam}`;
    return proxyToOrdering(path, { method: "GET", cookie, venueId });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);
    const cookie = request.headers.get("cookie") || "";
    const body = await request.json();
    return proxyToOrdering("/api/orders", { method: "POST", body, cookie, venueId });
  } catch (e) {
    return errorResponse(e);
  }
}
