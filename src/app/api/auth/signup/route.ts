import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

function generateSlug(nameFa: string): string {
  const persianToAscii: Record<string, string> = {
    "آ": "a", "ا": "a", "ب": "b", "پ": "p", "ت": "t", "ث": "s",
    "ج": "j", "چ": "ch", "ح": "h", "خ": "kh", "د": "d", "ذ": "z",
    "ر": "r", "ز": "z", "ژ": "zh", "س": "s", "ش": "sh", "ص": "s",
    "ض": "z", "ط": "t", "ظ": "z", "ع": "a", "غ": "gh", "ف": "f",
    "ق": "gh", "ک": "k", "گ": "g", "ل": "l", "م": "m", "ن": "n",
    "و": "v", "ه": "h", "ی": "y",
    " ": "-", "_": "-",
  };
  let slug = "";
  for (const ch of nameFa.trim().toLowerCase()) {
    slug += persianToAscii[ch] ?? (ch.match(/[a-z0-9-]/) ? ch : "");
  }
  slug = slug.replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!slug) slug = "cafe";
  return slug;
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (attempt < 100) {
    const exists = await prisma.venue.findUnique({ where: { slug } });
    if (!exists) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
  return `${base}-${Date.now()}`;
}

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const name = (raw.name ?? "").trim();
    const email = (raw.email ?? "").trim().toLowerCase();
    const password = (raw.password ?? "").trim();
    const cafeName = (raw.cafeName ?? "").trim();
    const phone = (raw.phone ?? "").trim() || null;

    if (!name) {
      return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "ایمیل نامعتبر است" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "رمز عبور باید حداقل ۸ کاراکتر باشد" }, { status: 400 });
    }
    if (!cafeName) {
      return NextResponse.json({ error: "نام کافه الزامی است" }, { status: 400 });
    }

    const ip = getClientIP(request);
    const rl = await rateLimit(`signup:${ip}`, 3, 3600000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "تلاش‌های زیاد. لطفاً ۱ ساعت صبر کنید." },
        { status: 429 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "این ایمیل قبلاً ثبت شده است" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const slug = await uniqueSlug(generateSlug(cafeName));

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          phone,
          passwordHash,
          emailVerifiedAt: new Date(),
          status: "active",
        },
      });

      const venue = await tx.venue.create({
        data: {
          nameFa: cafeName,
          slug,
          publicStatus: "draft",
        },
      });

      await tx.venueMember.create({
        data: {
          venueId: venue.id,
          userId: user.id,
          role: "owner",
        },
      });

      return { userId: user.id, venueId: venue.id };
    });

    await createSession(result.userId);

    await logAudit({
      actorUserId: result.userId,
      action: "auth.signup",
      entityType: "venue",
      entityId: result.venueId,
      metadata: { ip, email, cafeName },
    });

    return NextResponse.json({ success: true, venueId: result.venueId }, { status: 201 });
  } catch (e) {
    console.error("[signup] error:", e);
    return NextResponse.json({ error: "خطا در سرور" }, { status: 500 });
  }
}
