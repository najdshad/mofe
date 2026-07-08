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

    const config = RANGE_CONFIG[range];
    if (!config) {
      return NextResponse.json({ error: "Invalid range" }, { status: 400 });
    }

    const end = endParam ? new Date(endParam + "T23:59:59Z") : new Date();
    let start: Date;
    if (range === "custom" && startParam) {
      start = new Date(startParam + "T00:00:00Z");
    } else {
      start = new Date(end.getTime() - config.defaultDays * 24 * 60 * 60 * 1000);
    }

    const rows: Array<{
      bucket: Date;
      order_count: bigint;
      revenue: bigint | null;
      avg_order_value: bigint | null;
    }> = await prisma.$queryRawUnsafe(
      `
      SELECT
        date_trunc($1, completed_at) AS bucket,
        COUNT(*)::bigint AS order_count,
        COALESCE(SUM(total), 0)::bigint AS revenue,
        COALESCE(ROUND(AVG(total)), 0)::bigint AS avg_order_value
      FROM "Sale"
      WHERE venue_id = $2
        AND completed_at >= $3
        AND completed_at < $4
      GROUP BY bucket
      ORDER BY bucket ASC
    `,
      config.trunc,
      venueId,
      start,
      end
    );

    const data = rows.map((r) => ({
      date: r.bucket.toISOString().split("T")[0],
      orders: Number(r.order_count),
      revenue: Number(r.revenue),
      avgOrderValue: Number(r.avg_order_value),
    }));

    const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

    return NextResponse.json({
      venueId,
      range,
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
      data,
      summary: {
        totalOrders,
        totalRevenue,
        avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
