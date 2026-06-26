import { prisma } from "./prisma";

export async function rateLimit(key: string, maxAttempts = 5, windowMs = 60000) {
  const now = Date.now();

  const existing = await prisma.rateLimitEntry.findUnique({ where: { key } });

  if (!existing || now > existing.resetAt.getTime()) {
    await prisma.rateLimitEntry.upsert({
      where: { key },
      update: { count: 1, resetAt: new Date(now + windowMs) },
      create: { key, count: 1, resetAt: new Date(now + windowMs) },
    });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (existing.count >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  await prisma.rateLimitEntry.update({
    where: { key },
    data: { count: { increment: 1 } },
  });

  return { allowed: true, remaining: maxAttempts - existing.count - 1 };
}
