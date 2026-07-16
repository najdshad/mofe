import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { compressToTarget, MAX_SIZE_BYTES } from "@/lib/compress-image";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    const hasAccess = await canManage(user.id, venueId);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get("logo") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let resized: Buffer;
    try {
      resized = await compressToTarget(buffer, 500, MAX_SIZE_BYTES);
    } catch {
      return NextResponse.json(
        { error: "Could not compress image to under 50KB" },
        { status: 400 }
      );
    }

    const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { logoUrl: true } });
    if (venue?.logoUrl) {
      const oldPath = path.join(process.cwd(), "public", venue.logoUrl);
      try { await fs.unlink(oldPath); } catch { /* ok */ }
    }

    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
    const filename = `${venueId}-${hash}.webp`;
    const filepath = path.join(UPLOADS_DIR, filename);

    await fs.writeFile(filepath, resized);

    const logoUrl = `/uploads/${filename}`;

    await prisma.venue.update({
      where: { id: venueId },
      data: { logoUrl: logoUrl },
    });

    return NextResponse.json({ logoUrl });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    const hasAccess = await canManage(user.id, venueId);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { logoUrl: true } });
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    if (venue.logoUrl) {
      const filePath = path.join(process.cwd(), "public", venue.logoUrl);
      try {
        await fs.unlink(filePath);
      } catch {
        // file may not exist
      }
    }

    await prisma.venue.update({
      where: { id: venueId },
      data: { logoUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
