import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const email = (raw.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "ایمیل الزامی است" },
        { status: 400 }
      );
    }

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rl = await rateLimit(`password-reset:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "تلاش‌های زیاد. لطفاً بعداً تلاش کنید." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "حساب کاربری با این ایمیل یافت نشد" },
        { status: 404 }
      );
    }

    const token = await createPasswordResetToken(user.id);
    const resetUrl = `${new URL(request.url).origin}/password-reset/${token}`;

    sendPasswordResetEmail(email, resetUrl).catch(() => {
      // Email delivery is non-blocking; reset URL still works
    });

    return NextResponse.json({ resetUrl, message: "لینک بازنشانی رمز عبور ایجاد شد" });
  } catch {
    return NextResponse.json(
      { error: "خطا در سرور" },
      { status: 500 }
    );
  }
}
