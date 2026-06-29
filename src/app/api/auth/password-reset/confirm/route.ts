import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePasswordResetToken, hashPassword } from "@/lib/auth";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const rl = await rateLimit(`password-reset-confirm:${getClientIP(request)}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "تلاش‌های زیاد. لطفاً بعداً تلاش کنید." },
        { status: 429 }
      );
    }

    const raw = await request.json();
    const token = (raw.token ?? "").trim();
    const password = (raw.password ?? "").trim();

    if (!token || !password) {
      return NextResponse.json(
        { error: "رمز عبور و توکن الزامی است" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "رمز عبور باید حداقل ۸ کاراکتر باشد" },
        { status: 400 }
      );
    }

    const record = await validatePasswordResetToken(token);
    if (!record) {
      return NextResponse.json(
        { error: "توکن نامعتبر یا منقضی شده است" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true, message: "رمز عبور با موفقیت تغییر یافت" });
  } catch {
    return NextResponse.json(
      { error: "خطا در سرور" },
      { status: 500 }
    );
  }
}
