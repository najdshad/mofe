import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function cleanTestData() {
  // Delete child tables first (reverse FK dependency order)
  // Sub-models under MenuItem
  await prisma.menuItemAllergen.deleteMany();
  await prisma.menuItemVariant.deleteMany();
  await prisma.menuItemPrice.deleteMany();
  // Per-venue sub-models
  await prisma.stationSchedule.deleteMany();
  await prisma.venueTable.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.domain.deleteMany();
  await prisma.asset.deleteMany();
  // Rate-limit entries (no FK to venue/user)
  await prisma.rateLimitEntry.deleteMany();
  // Sale references Venue
  await prisma.sale.deleteMany();
  // MenuPublication references Venue
  await prisma.menuPublication.deleteMany();
  // MenuItem references Venue + Category
  await prisma.menuItem.deleteMany();
  // Category references Venue
  await prisma.category.deleteMany();
  // VenueMember references Venue + User
  await prisma.venueMember.deleteMany();
  // Session references User
  await prisma.session.deleteMany();
  // Venue (no remaining deps)
  await prisma.venue.deleteMany();
  // User (no remaining deps)
  await prisma.user.deleteMany();
}

export async function seedTestSale(
  venueId: string,
  overrides?: Partial<{
    total: number;
    itemCount: number;
    completedAt: Date;
    orderId: string;
  }>
) {
  return prisma.sale.create({
    data: {
      venueId,
      orderId: overrides?.orderId ?? `test-order-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      total: overrides?.total ?? 150000,
      itemCount: overrides?.itemCount ?? 2,
      completedAt: overrides?.completedAt ?? new Date(),
    },
  });
}

export async function seedTestData() {
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@test.ir" },
    update: { name: "مدیر تست", passwordHash, status: "active", emailVerifiedAt: new Date() },
    create: {
      email: "admin@test.ir",
      name: "مدیر تست",
      passwordHash,
      status: "active",
      emailVerifiedAt: new Date(),
    },
  });

  const venue = await prisma.venue.upsert({
    where: { slug: "test-cafe" },
    update: { nameFa: "کافه تست" },
    create: {
      nameFa: "کافه تست",
      nameEn: "Test Cafe",
      slug: "test-cafe",
      welcomeMessage: "به کافه تست خوش آمدید",
      publicStatus: "draft",
    },
  });

  await prisma.venueMember.upsert({
    where: { venueId_userId: { venueId: venue.id, userId: user.id } },
    update: { role: "owner" },
    create: {
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
      isSoldOut: false,
      calories: 320,
    },
  });

  return { user, venue, categories: { cat1, cat2, cat3 }, items: { item1, item2, item3 } };
}
