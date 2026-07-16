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

const BOM = "\uFEFF";
const FORMULA_INJECTION_RE = /^[=+\-@\t]/;

function sanitizeCsvField(value: string): string {
  if (FORMULA_INJECTION_RE.test(value)) {
    return "'" + value;
  }
  return value;
}

function quoteCsvCell(cell: string): string {
  if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

function formatCsvRow(values: string[]): string {
  return values.map((v) => quoteCsvCell(sanitizeCsvField(v))).join(",");
}

const VALID_TYPES = ["overview", "items"];

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
    const type = url.searchParams.get("type") || "overview";
    const startParam = url.searchParams.get("start");
    const endParam = url.searchParams.get("end");

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

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

    let csv: string;

    if (type === "overview") {
      const headers = "تاریخ,تعداد سفارش,درآمد (تومان),میانگین هر سفارش (تومان)";

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

      const dataRows = rows.map((r) => {
        const date = r.bucket.toISOString().split("T")[0];
        return formatCsvRow([
          date,
          String(Number(r.order_count)),
          String(Number(r.revenue)),
          String(Number(r.avg_order_value)),
        ]);
      });

      csv = BOM + headers + "\n" + dataRows.join("\n");
    } else {
      const headers = "تاریخ,نام آیتم,تغییرات,تعداد,قیمت واحد,مجموع قیمت,ایستگاه";

      const saleItems = await prisma.saleItem.findMany({
        where: {
          sale: { venueId },
          completedAt: { gte: start, lt: end },
        },
        include: { sale: true },
        orderBy: { completedAt: "desc" },
      });

      const dataRows = saleItems.map((item) => {
        const date = item.completedAt.toISOString().split("T")[0];
        return formatCsvRow([
          date,
          item.menuItemName,
          item.variantName ?? "",
          String(item.quantity),
          String(item.unitPrice),
          String(item.totalPrice),
          item.station,
        ]);
      });

      csv = BOM + headers + "\n" + dataRows.join("\n");
    }

    const filename = `sales-${venueId}-${type}-${start.toISOString().split("T")[0]}-${end.toISOString().split("T")[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
