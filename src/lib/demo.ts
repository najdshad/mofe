import bcrypt from "bcryptjs";
import type { PrismaClient } from "@/generated/prisma/client";

export const DEMO_EMAIL = "admin@noghteh";
export const DEMO_PASSWORD = "demo1234";
export const DEMO_VENUE_SLUG = "noghteh";

export async function ensureDemoData(prisma: PrismaClient) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      name: "مدیر کافه نقطه",
      passwordHash,
      emailVerifiedAt: new Date(),
      status: "active",
    },
    create: {
      name: "مدیر کافه نقطه",
      email: DEMO_EMAIL,
      passwordHash,
      emailVerifiedAt: new Date(),
      status: "active",
    },
  });

  const venue = await prisma.venue.upsert({
    where: { slug: DEMO_VENUE_SLUG },
    update: {},
    create: {
      nameFa: "کافه نقطه",
      nameEn: "Noghteh Cafe",
      slug: DEMO_VENUE_SLUG,
      timezone: "Asia/Tehran",
      welcomeMessage: "به منوی ما خوش آمدید.",
      publicStatus: "draft",
    },
  });

  await prisma.venueMember.upsert({
    where: { venueId_userId: { venueId: venue.id, userId: user.id } },
    update: {},
    create: {
      venueId: venue.id,
      userId: user.id,
    },
  });

  return { user, venue };
}
