import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { proxyToOrdering } from "@/lib/ordering-proxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string; tableNumber: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, tableNumber } = await params;
    await requireVenueAccess(user.id, venueId);
    const cookie = request.headers.get("cookie") || "";
    return proxyToOrdering(`/api/orders/release-table/${tableNumber}`, {
      method: "POST",
      cookie,
      venueId,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
