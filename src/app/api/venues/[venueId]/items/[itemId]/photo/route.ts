import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import sharp from "sharp";
import { compressToTarget, MAX_SIZE_BYTES } from "@/lib/compress-image";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

async function isValidImage(buffer: Buffer): Promise<boolean> {
  try {
    await sharp(buffer).metadata();
    return true;
  } catch {
    return false;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string; itemId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, itemId } = await params;
    const hasAccess = await canManage(user.id, venueId);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const rateCheck = await rateLimit(`photo-upload:${user.id}`, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "حد مجاز آپلود را پر کرده‌اید. لطفاً کمی بعد تلاش کنید." }, { status: 429 });
    }

    const item = await prisma.menuItem.findUnique({
      where: { id: itemId, venueId },
      select: { photoUrl: true },
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

    const valid = await isValidImage(buffer);
    if (!valid) {
      return NextResponse.json(
        { error: "فایل ارسالی معتبر نیست. لطفاً یک تصویر ارسال کنید." },
        { status: 400 }
      );
    }

    let resized: Buffer;
    try {
      resized = await compressToTarget(buffer, 500, MAX_SIZE_BYTES);
    } catch {
      return NextResponse.json(
        { error: "Could not compress image to under 50KB" },
        { status: 400 }
      );
    }

    if (item.photoUrl) {
      const oldPath = path.join(process.cwd(), "public", item.photoUrl);
      try { await fs.unlink(oldPath); } catch (err: unknown) {
        if (err instanceof Error && (err as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error("[photo] failed to delete old file:", err.message);
        }
      }
    }

    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
    const filename = `item-${itemId}-${hash}.webp`;
    const filepath = path.join(UPLOADS_DIR, filename);

    await fs.writeFile(filepath, resized);

    const photoUrl = `/uploads/${filename}`;

    await prisma.menuItem.update({
      where: { id: itemId },
      data: { photoUrl: photoUrl },
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
    const hasAccess = await canManage(user.id, venueId);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const item = await prisma.menuItem.findUnique({
      where: { id: itemId, venueId },
      select: { photoUrl: true },
    });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.photoUrl) {
      const filePath = path.join(process.cwd(), "public", item.photoUrl);
      try { await fs.unlink(filePath); } catch { /* ok */ }
    }

    await prisma.menuItem.update({
      where: { id: itemId },
      data: { photoUrl: null },
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
