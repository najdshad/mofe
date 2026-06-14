import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function cleanTestData() {
  await prisma.menuPublication.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.venueMember.deleteMany();
  await prisma.session.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();
}

export async function seedTestData() {
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const user = await prisma.user.create({
    data: {
      email: "admin@test.ir",
      name: "مدیر تست",
      passwordHash,
      status: "active",
      emailVerifiedAt: new Date(),
    },
  });

  const venue = await prisma.venue.create({
    data: {
      nameFa: "کافه تست",
      nameEn: "Test Cafe",
      slug: "test-cafe",
      welcomeMessage: "به کافه تست خوش آمدید",
      publicStatus: "draft",
    },
  });

  await prisma.venueMember.create({
    data: {
      venueId: venue.id,
      userId: user.id,
      role: "owner",
    },
  });

  const cat1 = await prisma.category.create({
    data: {
      venueId: venue.id,
      nameFa: "نوشیدنی‌های گرم",
      displayOrder: 1,
      active: true,
    },
  });

  const cat2 = await prisma.category.create({
    data: {
      venueId: venue.id,
      nameFa: "دسر",
      displayOrder: 2,
      active: true,
    },
  });

  const cat3 = await prisma.category.create({
    data: {
      venueId: venue.id,
      nameFa: "غذا",
      displayOrder: 3,
      active: false,
    },
  });

  const item1 = await prisma.menuItem.create({
    data: {
      venueId: venue.id,
      categoryId: cat1.id,
      nameFa: "چای نعناع",
      nameEn: "Mint Tea",
      priceToman: 75000,
      station: "kitchen",
      displayOrder: 1,
      visibleOnPublicMenu: true,
      isSoldOut: false,
    },
  });

  const item2 = await prisma.menuItem.create({
    data: {
      venueId: venue.id,
      categoryId: cat1.id,
      nameFa: "چای دارچین",
      nameEn: "Cinnamon Tea",
      priceToman: 85000,
      station: "kitchen",
      displayOrder: 2,
      visibleOnPublicMenu: true,
      isSoldOut: true,
    },
  });

  const item3 = await prisma.menuItem.create({
    data: {
      venueId: venue.id,
      categoryId: cat2.id,
      nameFa: "کیک هویج",
      nameEn: "Carrot Cake",
      priceToman: 175000,
      station: "kitchen",
      displayOrder: 1,
      visibleOnPublicMenu: true,
      isSoldOut: false,
      calories: 320,
    },
  });

  return { user, venue, categories: { cat1, cat2, cat3 }, items: { item1, item2, item3 } };
}
