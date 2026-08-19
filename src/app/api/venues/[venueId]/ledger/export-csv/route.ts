import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

const ENTRY_TYPES = new Set(["sale", "expense"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> },
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    if (type && !ENTRY_TYPES.has(type)) {
      return NextResponse.json({ error: "نوع تراکنش نامعتبر است" }, { status: 400 });
    }

    const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : null;
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : null;
    if (
      (from && Number.isNaN(from.getTime())) ||
      (to && Number.isNaN(to.getTime())) ||
      (from && to && from > to)
    ) {
      return NextResponse.json({ error: "بازه زمانی نامعتبر است" }, { status: 400 });
    }

    const where: { venueId: string; type?: string; occurredAt?: { gte?: Date; lte?: Date } } = {
      venueId,
    };
    if (type) where.type = type;
    if (from || to) {
      where.occurredAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const entries = await prisma.ledgerEntry.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      include: { saleItems: { orderBy: { itemName: "asc" } } },
    });

    const csv = toCsv(
      ["type", "occurredAt", "amountToman", "description", "tags", "items"],
      entries.map((entry) => [
        entry.type,
        entry.occurredAt.toISOString(),
        String(entry.amountToman),
        entry.description ?? "",
        entry.tags ?? "",
        entry.saleItems
          .map((item) => `${item.itemName}${item.variantName ? ` (${item.variantName})` : ""} x${item.quantity}`)
          .join(" | "),
      ]),
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ledger-${venueId}.csv"`,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}