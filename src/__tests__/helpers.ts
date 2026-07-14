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
  // Invoice references Subscription + Coupon
  await prisma.invoice.deleteMany();
  // Coupon (no remaining deps)
  await prisma.coupon.deleteMany();
  // Subscription references Venue + Plan
  await prisma.subscription.deleteMany();
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
  // Plan (no remaining deps)
  await prisma.plan.deleteMany();
  // User (no remaining deps)
  await prisma.user.deleteMany();
}

export async function seedTestPlans() {
  const plans = [
    { slug: "basic", nameFa: "پایه", nameEn: "Basic", description: "طرح پایه", priceToman: 0, trialDays: 7, sortOrder: 1, purchasable: false, maxMenuItems: 10, maxTables: 3, customDomain: false, orderingEnabled: false },
    { slug: "pro", nameFa: "حرفه‌ای", nameEn: "Pro", description: "طرح حرفه‌ای", priceToman: 1500000, trialDays: 0, sortOrder: 2, purchasable: true, maxMenuItems: 100, maxTables: 10, customDomain: true, orderingEnabled: true },
    { slug: "premium", nameFa: "پریمیوم", nameEn: "Premium", description: "طرح پریمیوم", priceToman: 3000000, trialDays: 0, sortOrder: 3, purchasable: true, maxMenuItems: -1, maxTables: -1, customDomain: true, orderingEnabled: true },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }
}

export async function seedTestSubscription(
  venueId: string,
  planSlug = "premium",
  overrides?: Partial<{ status: string; trialEndsAt: Date }>
) {
  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
  if (!plan) throw new Error(`Plan "${planSlug}" not found. Run seedTestPlans() first.`);

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return prisma.subscription.upsert({
    where: { venueId },
    update: {},
    create: {
      venueId,
      planId: plan.id,
      status: overrides?.status ?? "active",
      currentPeriodStart: now,
      currentPeriodEnd: overrides?.trialEndsAt ?? periodEnd,
      trialEndsAt: overrides?.trialEndsAt ?? null,
    },
  });
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

  await seedTestPlans();
  await seedTestSubscription(venue.id, "premium");

  return { user, venue, categories: { cat1, cat2, cat3 }, items: { item1, item2, item3 } };
}
