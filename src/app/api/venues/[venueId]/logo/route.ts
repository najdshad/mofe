import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { saveFile, deleteFile } from "@/lib/storage";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { compressToTarget, MAX_SIZE_BYTES } from "@/lib/compress-image";
import { validateCsrf } from "@/lib/csrf";

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
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    await validateCsrf();

    const rateCheck = await rateLimit(`logo-upload:${user.id}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "حد مجاز آپلود را پر کرده‌اید. لطفاً کمی بعد تلاش کنید." }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("logo") as File | null;
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

    const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { logoUrl: true } });

    if (venue?.logoUrl) {
      const oldKey = path.basename(venue.logoUrl);
      try { await deleteFile(oldKey); } catch { /* ok */ }
    }

    const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
    const filename = `${venueId}-${hash}.webp`;

    const result = await saveFile(filename, resized);
    const logoUrl = result.url;

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
    await requireVenueAccess(user.id, venueId);

    await validateCsrf();

    const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { logoUrl: true } });
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    if (venue.logoUrl) {
      const oldKey = path.basename(venue.logoUrl);
      try { await deleteFile(oldKey); } catch { /* ok */ }
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
