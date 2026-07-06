import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManage, requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ venueId: string; tableId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, tableId } = await params;
    await requireVenueAccess(user.id, venueId);

    const body = await request.json();
    const table = await prisma.venueTable.findFirst({
      where: { id: tableId, venueId },
    });
    if (!table) return NextResponse.json({ error: "میز یافت نشد" }, { status: 404 });

    if (body.status !== undefined) {
      const valid = ["FREE", "ACTIVE", "READY", "SETTLED"];
      if (!valid.includes(body.status)) {
        return NextResponse.json({ error: "وضعیت نامعتبر" }, { status: 400 });
      }
      const updated = await prisma.venueTable.update({
        where: { id: tableId },
        data: { status: body.status },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "هیچ فیلدی برای به‌روزرسانی مشخص نشده" }, { status: 400 });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ venueId: string; tableId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, tableId } = await params;
    const hasAccess = await canManage(user.id, venueId);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const table = await prisma.venueTable.findFirst({
      where: { id: tableId, venueId },
    });
    if (!table) return NextResponse.json({ error: "میز یافت نشد" }, { status: 404 });

    const data: { number?: number; label?: string | null; isActive?: boolean } = {};
    if (body.number !== undefined) {
      if (typeof body.number !== "number" || body.number < 1) {
        return NextResponse.json({ error: "شماره میز معتبر وارد کنید" }, { status: 400 });
      }
      if (body.number !== table.number) {
        const existing = await prisma.venueTable.findUnique({
          where: { venueId_number: { venueId, number: body.number } },
        });
        if (existing) {
          return NextResponse.json({ error: "این شماره میز قبلاً ثبت شده است" }, { status: 409 });
        }
      }
      data.number = body.number;
    }
    if (body.label !== undefined) data.label = body.label || null;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await prisma.venueTable.update({
      where: { id: tableId },
      data,
    });

    return NextResponse.json(updated);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ venueId: string; tableId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, tableId } = await params;
    const hasAccess = await canManage(user.id, venueId);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const table = await prisma.venueTable.findFirst({
      where: { id: tableId, venueId },
    });
    if (!table) return NextResponse.json({ error: "میز یافت نشد" }, { status: 404 });

    // Soft-delete: set isActive to false
    await prisma.venueTable.update({
      where: { id: tableId },
      data: { isActive: false },
    });

    return NextResponse.json({ status: "deleted" });
  } catch (e) {
    return errorResponse(e);
  }
}
