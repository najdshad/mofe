import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_SIZE_BYTES = 50 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string; itemId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, itemId } = await params;
    await requireVenueAccess(user.id, venueId);

    const item = await prisma.menuItem.findUnique({
      where: { id: itemId, venueId },
    });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let resized = await sharp(buffer)
      .resize(500, 500, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    if (resized.length > MAX_SIZE_BYTES) {
      resized = await sharp(buffer)
        .resize(500, 500, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 60 })
        .toBuffer();
    }

    if (resized.length > MAX_SIZE_BYTES) {
      resized = await sharp(buffer)
        .resize(500, 500, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 40 })
        .toBuffer();
    }

    if (resized.length > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Could not compress image to under 50KB" },
        { status: 400 }
      );
    }

    if (item.photoAssetId) {
      const oldPath = path.join(process.cwd(), "public", item.photoAssetId);
      try { await fs.unlink(oldPath); } catch { /* ok */ }
    }

    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
    const filename = `item-${itemId}-${hash}.webp`;
    const filepath = path.join(UPLOADS_DIR, filename);

    await fs.writeFile(filepath, resized);

    const photoUrl = `/uploads/${filename}`;

    await prisma.menuItem.update({
      where: { id: itemId },
      data: { photoAssetId: photoUrl },
    });

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "item.photo.upload",
      entityType: "item",
      entityId: itemId,
      metadata: { photoUrl },
    });

    return NextResponse.json({ photoUrl });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ venueId: string; itemId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, itemId } = await params;
    await requireVenueAccess(user.id, venueId);

    const item = await prisma.menuItem.findUnique({
      where: { id: itemId, venueId },
    });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.photoAssetId) {
      const filePath = path.join(process.cwd(), "public", item.photoAssetId);
      try { await fs.unlink(filePath); } catch { /* ok */ }
    }

    await prisma.menuItem.update({
      where: { id: itemId },
      data: { photoAssetId: null },
    });

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "item.photo.delete",
      entityType: "item",
      entityId: itemId,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
