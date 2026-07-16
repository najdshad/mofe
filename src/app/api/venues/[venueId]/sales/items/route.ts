import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const RANGE_CONFIG: Record<string, { trunc: string; defaultDays: number }> = {
  daily: { trunc: "day", defaultDays: 30 },
  weekly: { trunc: "week", defaultDays: 84 },
  monthly: { trunc: "month", defaultDays: 365 },
  yearly: { trunc: "year", defaultDays: 1825 },
  custom: { trunc: "day", defaultDays: 0 },
};

const VALID_SORT = new Set(["revenue", "quantity"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const url = new URL(request.url);
    const range = url.searchParams.get("range") || "daily";
    const startParam = url.searchParams.get("start");
    const endParam = url.searchParams.get("end");
    const limitParam = url.searchParams.get("limit");
    const sortByParam = url.searchParams.get("sortBy") || "revenue";

    const config = RANGE_CONFIG[range];
    if (!config) {
      return NextResponse.json({ error: "Invalid range" }, { status: 400 });
    }

    const sortBy = VALID_SORT.has(sortByParam) ? sortByParam : "revenue";
    const limit = Math.min(Math.max(parseInt(limitParam || "20", 10) || 20, 1), 100);

    const end = endParam ? new Date(endParam + "T23:59:59Z") : new Date();
    let start: Date;
    if (range === "custom" && startParam) {
      start = new Date(startParam + "T00:00:00Z");
    } else {
      start = new Date(end.getTime() - config.defaultDays * 24 * 60 * 60 * 1000);
    }

    const orderColumn = sortBy === "quantity" ? "quantity" : "revenue";

    type TopItemRow = {
      menuItemId: string;
      menuItemName: string;
      quantity: bigint;
      revenue: bigint;
      orderCount: bigint;
      avgPrice: bigint;
    };

    const topItems: TopItemRow[] = await prisma.$queryRawUnsafe(
      `
      SELECT
        si.menu_item_id AS "menuItemId",
        si.menu_item_name AS "menuItemName",
        SUM(si.quantity)::bigint AS quantity,
        SUM(si.total_price)::bigint AS revenue,
        COUNT(DISTINCT si.sale_id)::bigint AS "orderCount",
        ROUND(AVG(si.unit_price))::bigint AS "avgPrice"
      FROM "SaleItem" si
      JOIN "Sale" s ON s.id = si.sale_id
      WHERE s.venue_id = $1
        AND si.completed_at >= $2
        AND si.completed_at < $3
      GROUP BY si.menu_item_id, si.menu_item_name
      ORDER BY ${orderColumn} DESC
      LIMIT $4
    `,
      venueId,
      start,
      end,
      limit
    );

    type HourlyRow = {
      hour: number;
      orders: bigint;
      items: bigint;
      revenue: bigint;
    };

    const hourlyData: HourlyRow[] = await prisma.$queryRawUnsafe(
      `
      SELECT
        EXTRACT(HOUR FROM si.completed_at)::int AS hour,
        COUNT(DISTINCT si.sale_id)::bigint AS orders,
        SUM(si.quantity)::bigint AS items,
        SUM(si.total_price)::bigint AS revenue
      FROM "SaleItem" si
      JOIN "Sale" s ON s.id = si.sale_id
      WHERE s.venue_id = $1
        AND si.completed_at >= $2
        AND si.completed_at < $3
      GROUP BY hour
      ORDER BY hour ASC
    `,
      venueId,
      start,
      end
    );

    const items = topItems.map((r) => ({
      menuItemId: r.menuItemId,
      menuItemName: r.menuItemName,
      quantity: Number(r.quantity),
      revenue: Number(r.revenue),
      orderCount: Number(r.orderCount),
      avgPrice: Number(r.avgPrice),
    }));

    const hourly = hourlyData.map((r) => ({
      hour: r.hour,
      orders: Number(r.orders),
      items: Number(r.items),
      revenue: Number(r.revenue),
    }));

    const totalItemsSold = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalItemRevenue = items.reduce((sum, i) => sum + i.revenue, 0);
    const uniqueItems = items.length;

    return NextResponse.json({
      venueId,
      range,
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
      items,
      hourly,
      summary: {
        totalItemsSold,
        totalItemRevenue,
        uniqueItems,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
