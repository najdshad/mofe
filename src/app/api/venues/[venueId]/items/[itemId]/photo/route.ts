import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { getStorage } from "@/lib/storage";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { compressToTarget, MAX_SIZE_BYTES } from "@/lib/compress-image";

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

    const storage = await getStorage();

    if (item.photoUrl) {
      const oldKey = path.basename(item.photoUrl);
      try { await storage.delete(oldKey); } catch { /* ok */ }
    }

    const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
    const filename = `item-${itemId}-${hash}.webp`;

    const result = await storage.save(filename, resized, "image/webp");
    const photoUrl = result.url;

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
      const storage = await getStorage();
      const oldKey = path.basename(item.photoUrl);
      try { await storage.delete(oldKey); } catch { /* ok */ }
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
