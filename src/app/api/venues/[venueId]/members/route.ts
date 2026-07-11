import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const members = await prisma.venueMember.findMany({
      where: { venueId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(members);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    const membership = await requireVenueAccess(user.id, venueId);

  if (membership.role !== "owner" && membership.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { username, role, name, password } = await request.json();

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return NextResponse.json(
      { error: "Username can only contain letters, numbers, hyphens, and underscores" },
      { status: 400 }
    );
  }

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { slug: true } });
  if (!venue) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  const email = `${username}@${venue.slug}`;

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) {
    const existingMember = await prisma.venueMember.findUnique({
      where: { venueId_userId: { venueId, userId: existingUser.id } },
    });
    if (existingMember) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Username is already taken on this venue" },
      { status: 409 }
    );
  }

  const newRole = role || "staff";
  if (!["owner", "manager", "staff"].includes(newRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (membership.role !== "owner" && newRole === "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const passwordHash = await hashPassword(password);

  const targetUser = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });

  const member = await prisma.venueMember.create({
    data: {
      venueId,
      userId: targetUser.id,
      role: newRole,
    },
    include: { user: true },
  });

  await logAudit({
    venueId,
    actorUserId: user.id,
    action: "member.create",
    entityType: "member",
    entityId: member.id,
    metadata: { email: targetUser.email, role: newRole },
  });

  return NextResponse.json(member, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
