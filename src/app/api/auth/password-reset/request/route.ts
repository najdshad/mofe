import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/auth";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
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

    const rl = await rateLimit(`password-reset:${getClientIP(request)}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "تلاش‌های زیاد. لطفاً بعداً تلاش کنید." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) {
      return NextResponse.json({
        message: "اگر این ایمیل در سیستم ثبت شده باشد، لینک بازنشانی ارسال خواهد شد"
      });
    }

    const token = await createPasswordResetToken(user.id);

    sendPasswordResetEmail(email, `${new URL(request.url).origin}/password-reset/${token}`).catch(() => {
      // Email delivery is non-blocking
    });

    return NextResponse.json({ message: "لینک بازنشانی رمز عبور ایجاد شد" });
  } catch {
    return NextResponse.json(
      { error: "خطا در سرور" },
      { status: 500 }
    );
  }
}
