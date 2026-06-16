import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ venueId: string; memberId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId, memberId } = await params;
  const membership = await requireVenueAccess(user.id, venueId);

  if (membership.role !== "owner" && membership.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await prisma.venueMember.findUnique({ where: { id: memberId } });
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

  return NextResponse.json(member);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ venueId: string; memberId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId, memberId } = await params;
  const membership = await requireVenueAccess(user.id, venueId);

  if (membership.role !== "owner" && membership.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await prisma.venueMember.findUnique({ where: { id: memberId } });
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

  await prisma.venueMember.delete({ where: { id: memberId } });

  return NextResponse.json({ success: true });
}
