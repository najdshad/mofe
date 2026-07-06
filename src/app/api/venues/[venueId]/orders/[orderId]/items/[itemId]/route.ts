import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { proxyToOrdering } from "@/lib/ordering-proxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ venueId: string; orderId: string; itemId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, orderId, itemId } = await params;
    await requireVenueAccess(user.id, venueId);
    const cookie = request.headers.get("cookie") || "";
    const body = await request.json();
    return proxyToOrdering(`/api/orders/${orderId}/items/${itemId}`, { method: "PATCH", body, cookie, venueId });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ venueId: string; orderId: string; itemId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, orderId, itemId } = await params;
    await requireVenueAccess(user.id, venueId);
    const cookie = request.headers.get("cookie") || "";
    return proxyToOrdering(`/api/orders/${orderId}/items/${itemId}`, { method: "DELETE", cookie, venueId });
  } catch (e) {
    return errorResponse(e);
  }
}
