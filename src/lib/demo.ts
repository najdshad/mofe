import bcrypt from "bcryptjs";
import type { PrismaClient } from "@/generated/prisma/client";

export const DEMO_EMAIL = "admin@noghteh";
export const DEMO_PASSWORD = "demo1234";
export const DEMO_VENUE_SLUG = "noghteh-test";

export async function ensureDemoData(prisma: PrismaClient) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      name: "مدیر کافه نقطه",
      passwordHash,
      status: "active",
    },
    create: {
      name: "مدیر کافه نقطه",
      email: DEMO_EMAIL,
      passwordHash,
      status: "active",
    },
  });

  const venue = await prisma.venue.upsert({
    where: { slug: DEMO_VENUE_SLUG },
    update: {},
    create: {
      ownerId: user.id,
      nameFa: "کافه نقطه",
      nameEn: "Noghteh Cafe",
      slug: DEMO_VENUE_SLUG,
      welcomeMessage: "به منوی ما خوش آمدید.",
    },
  });

  return { user, venue };
}
