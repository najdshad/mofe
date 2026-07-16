import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword, destroyAllUserSessions } from "@/lib/auth";
import { DEMO_EMAIL, ensureDemoData } from "@/lib/demo";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const email = (raw.email ?? "").trim().toLowerCase();
    const password = (raw.password ?? "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "نام کاربری و رمز عبور الزامی است" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "نام کاربری نامعتبر است" },
        { status: 400 }
      );
    }

    const ip = getClientIP(request);
    const rl = await rateLimit(`login:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "تلاش‌های زیاد. لطفاً بعداً تلاش کنید." },
        { status: 429 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "رمز عبور باید حداقل ۸ کاراکتر باشد" },
        { status: 400 }
      );
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (process.env.NODE_ENV !== "production" && !user && email === DEMO_EMAIL) {
      const demo = await ensureDemoData(prisma);
      user = demo.user;
    }

    if (!user || !user.passwordHash || user.status !== "active") {
      return NextResponse.json(
        { error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const updates: Record<string, unknown> = { failedLoginAttempts: attempts };
      if (attempts >= 10) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await prisma.user.update({ where: { id: user.id }, data: updates });

      return NextResponse.json(
        { error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    await destroyAllUserSessions(user.id);

    await createSession(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await logAudit({
      actorUserId: user.id,
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
      metadata: { ip },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[login] error:", e);
    return NextResponse.json(
      { error: "خطا در سرور" },
      { status: 500 }
    );
  }
}
