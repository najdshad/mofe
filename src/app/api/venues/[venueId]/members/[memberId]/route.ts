import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ venueId: string; memberId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, memberId } = await params;
    const membership = await requireVenueAccess(user.id, venueId);

    if (membership.role !== "owner" && membership.role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const target = await prisma.venueMember.findUnique({ where: { id: memberId }, select: { userId: true, role: true, venueId: true } });
    if (!target || target.venueId !== venueId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const { role, password } = await request.json();

    const updateData: Record<string, unknown> = {};

    if (role) {
      if (!["owner", "manager", "staff"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }

      if (membership.role !== "owner" && (target.role === "owner" || role === "owner")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      updateData.role = role;
    }

    if (password) {
      if (membership.role !== "owner") {
        return NextResponse.json({ error: "Only owners can change passwords" }, { status: 403 });
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(password);
      await prisma.user.update({
        where: { id: target.userId },
        data: { passwordHash },
      });
    }

    const member = await prisma.venueMember.update({
      where: { id: memberId },
      data: updateData,
      include: { user: true },
    });

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "member.update",
      entityType: "member",
      entityId: memberId,
      metadata: { changes: Object.keys(updateData) },
    });

    return NextResponse.json(member);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ venueId: string; memberId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, memberId } = await params;
    const membership = await requireVenueAccess(user.id, venueId);

    if (membership.role !== "owner" && membership.role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const target = await prisma.venueMember.findUnique({ where: { id: memberId }, select: { userId: true, role: true, venueId: true } });
    if (!target || target.venueId !== venueId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (membership.role !== "owner" && target.role === "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ownerCount = await prisma.venueMember.count({
      where: { venueId, role: "owner" },
    });

    if (target.role === "owner" && ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last owner" },
        { status: 400 }
      );
    }

    const deletedMember = await prisma.venueMember.findUnique({
      where: { id: memberId },
      include: { user: { select: { email: true } } },
    });

    await prisma.venueMember.delete({ where: { id: memberId } });

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "member.delete",
      entityType: "member",
      entityId: memberId,
      metadata: { email: deletedMember?.user.email },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
