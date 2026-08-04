import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function cleanTestData() {
  // Delete child tables first (reverse FK dependency order)
  // Sub-models under MenuItem
  await prisma.menuItemAllergen.deleteMany();
  await prisma.menuItemVariant.deleteMany();
  await prisma.menuItemPrice.deleteMany();
  // Per-venue sub-models
  await prisma.auditLog.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.asset.deleteMany();
  // Rate-limit entries (no FK to venue/user)
  await prisma.rateLimitEntry.deleteMany();
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

export async function seedTestData() {
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@test.ir" },
    update: { name: "مدیر تست", passwordHash, status: "active", emailVerifiedAt: new Date(), phone: "09120000000" },
    create: {
      email: "admin@test.ir",
      name: "مدیر تست",
      passwordHash,
      status: "active",
      emailVerifiedAt: new Date(),
      phone: "09120000000",
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
      timezone: "Asia/Tehran",
      accentColor: "#111111",
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
      description: "توضیحات آیتم یک",
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
      description: "چای دارچین تازه دم شده",
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
      description: "کیک هویج تازه",
      priceToman: 175000,
      station: "kitchen",
      displayOrder: 1,
      isSoldOut: false,
      calories: 320,
    },
  });

  return { user, venue, categories: { cat1, cat2, cat3 }, items: { item1, item2, item3 } };
}

export async function seedTestVenueWithFullData() {
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const user = await prisma.user.upsert({
    where: { email: "full@test.ir" },
    update: { name: "کاربر کامل", passwordHash, status: "active", emailVerifiedAt: new Date(), phone: "09120000000" },
    create: {
      email: "full@test.ir",
      name: "کاربر کامل",
      passwordHash,
      status: "active",
      emailVerifiedAt: new Date(),
      phone: "09120000000",
    },
  });

  const venue = await prisma.venue.upsert({
    where: { slug: "full-cafe" },
    update: { nameFa: "کافه کامل" },
    create: {
      nameFa: "کافه کامل",
      nameEn: "Full Cafe",
      slug: "full-cafe",
      welcomeMessage: "به کافه کامل خوش آمدید",
      publicStatus: "draft",
      timezone: "Asia/Tehran",
      accentColor: "#c0392b",
    },
  });

  await prisma.venueMember.upsert({
    where: { venueId_userId: { venueId: venue.id, userId: user.id } },
    update: { role: "owner" },
    create: { venueId: venue.id, userId: user.id, role: "owner" },
  });

  const cat1 = await prisma.category.create({
    data: { venueId: venue.id, nameFa: "نوشیدنی‌های گرم", displayOrder: 1, active: true },
  });

  const item1 = await prisma.menuItem.create({
    data: {
      venueId: venue.id,
      categoryId: cat1.id,
      nameFa: "چای نعناع",
      nameEn: "Mint Tea",
      description: "چای نعناع تازه",
      priceToman: 75000,
      station: "kitchen",
      displayOrder: 1,
      isSoldOut: false,
      calories: 120,
      photoUrl: "/uploads/item-photo.webp",
    },
  });

  await prisma.menuItemVariant.create({
    data: {
      menuItemId: item1.id,
      nameFa: "بزرگ",
      nameEn: "Large",
      priceModifier: 15000,
      displayOrder: 1,
    },
  });

  await prisma.menuItemVariant.create({
    data: {
      menuItemId: item1.id,
      nameFa: "کوچک",
      nameEn: "Small",
      priceModifier: -10000,
      displayOrder: 2,
    },
  });

  await prisma.menuItemAllergen.create({
    data: {
      menuItemId: item1.id,
      allergenCode: "dairy",
    },
  });

  await prisma.menuItemAllergen.create({
    data: {
      menuItemId: item1.id,
      allergenCode: "gluten",
    },
  });

  const item2 = await prisma.menuItem.create({
    data: {
      venueId: venue.id,
      categoryId: cat1.id,
      nameFa: "قهوه",
      nameEn: null,
      description: null,
      priceToman: 0,
      station: "bar",
      displayOrder: 2,
      isSoldOut: false,
    },
  });

  return { user, venue, categories: { cat1 }, items: { item1, item2 } };
}
