import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { proxyToOrdering } from "@/lib/ordering-proxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string; orderId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, orderId } = await params;
    await requireVenueAccess(user.id, venueId);
    const cookie = request.headers.get("cookie") || "";
    const body = await request.json();
    return proxyToOrdering(`/api/orders/${orderId}/items`, { method: "POST", body, cookie, venueId });
  } catch (e) {
    return errorResponse(e);
  }
}
