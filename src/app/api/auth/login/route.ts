import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { DEMO_EMAIL, ensureDemoData } from "@/lib/demo";
import { rateLimit } from "@/lib/rate-limit";

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

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rl = rateLimit(`login:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "تلاش‌های زیاد. لطفاً بعداً تلاش کنید." },
        { status: 429 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "رمز عبور باید حداقل ۶ کاراکتر باشد" },
        { status: 400 }
      );
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user && email === DEMO_EMAIL) {
      const demo = await ensureDemoData(prisma);
      user = demo.user;
    }

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    if (user.status !== "active") {
      return NextResponse.json(
        { error: "حساب کاربری فعال نیست" },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    await createSession(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "خطا در سرور" },
      { status: 500 }
    );
  }
}
