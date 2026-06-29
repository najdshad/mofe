import { prisma } from "./prisma";

export async function cleanRateLimitEntries() {
  await prisma.rateLimitEntry.deleteMany({
    where: { resetAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
}

export function getClientIP(request: Request): string {
  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export async function rateLimit(key: string, maxAttempts = 5, windowMs = 60000) {
  return await prisma.$transaction(async (tx) => {
    const now = Date.now();
    const existing = await tx.rateLimitEntry.findUnique({ where: { key } });

    if (!existing || now > existing.resetAt.getTime()) {
      await tx.rateLimitEntry.upsert({
        where: { key },
        update: { count: 1, resetAt: new Date(now + windowMs) },
        create: { key, count: 1, resetAt: new Date(now + windowMs) },
      });
      return { allowed: true, remaining: maxAttempts - 1 };
    }

    if (existing.count >= maxAttempts) {
      return { allowed: false, remaining: 0 };
    }

    await tx.rateLimitEntry.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    return { allowed: true, remaining: maxAttempts - existing.count - 1 };
  });
}
