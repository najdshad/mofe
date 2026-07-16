import { NextResponse } from "next/server";
import { requireInternalAuth, errorResponse, ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";

export async function GET() {
  try {
    await requireInternalAuth();
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    return NextResponse.json(users);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await requireInternalAuth();
    await validateCsrf();
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name?.trim()) throw new ApiError("Name is required");
    if (!email?.trim()) throw new ApiError("Email is required");
    if (!password || password.length < 8) throw new ApiError("Password must be at least 8 characters");

    if (role === "internal") {
      console.info(`[internal] User ${currentUser.email} creating internal user ${email}`);
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim() }, select: { id: true } });
    if (existing) throw new ApiError("A user with this email already exists");

    const passwordHash = await hashPassword(password);

    const created = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        passwordHash,
        role: role === "internal" ? "internal" : "user",
        emailVerifiedAt: new Date(),
        status: "active",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
