import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId } = await params;
  await requireVenueAccess(user.id, venueId);

  const members = await prisma.venueMember.findMany({
    where: { venueId },
    include: { user: true },
  });

  return NextResponse.json(members);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId } = await params;
  const membership = await requireVenueAccess(user.id, venueId);

  if (membership.role !== "owner" && membership.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, role, name, password } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  let targetUser = await prisma.user.findUnique({ where: { email } });

  if (!targetUser) {
    if (!password) {
      return NextResponse.json(
        { error: "Password is required for new users" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    targetUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });
  }

  const existing = await prisma.venueMember.findUnique({
    where: { venueId_userId: { venueId, userId: targetUser.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "User is already a member" }, { status: 409 });
  }

  const newRole = role || "staff";
  if (!["owner", "manager", "staff"].includes(newRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (membership.role !== "owner" && newRole === "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const member = await prisma.venueMember.create({
    data: {
      venueId,
      userId: targetUser.id,
      role: newRole,
    },
    include: { user: true },
  });

  return NextResponse.json(member, { status: 201 });
}
