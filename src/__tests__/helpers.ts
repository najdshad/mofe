import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function cleanTestData() {
  // Delete child tables first (reverse FK dependency order)
  // Ledger sale lines reference ledger entries and menu items
  await prisma.saleLineItem.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  // Sub-models under MenuItem
  await prisma.menuItemAllergen.deleteMany();
  await prisma.menuItemVariant.deleteMany();
  await prisma.menuItemPrice.deleteMany();
  // Rate-limit entries (no FK to venue/user)
  await prisma.rateLimitEntry.deleteMany();
  // MenuItem references Venue + Category
  await prisma.menuItem.deleteMany();
  // Category references Venue
  await prisma.category.deleteMany();
  // Session references User
  await prisma.session.deleteMany();
  // Venue (no remaining deps)
  await prisma.venue.deleteMany();  // Venue references User (owner)
  // User (no remaining deps)
  await prisma.user.deleteMany();
}

export async function seedTestData() {
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@test.ir" },
    update: { name: "مدیر تست", passwordHash, status: "active" },
    create: {
      email: "admin@test.ir",
      name: "مدیر تست",
      passwordHash,
      status: "active",
    },
  });

  const venue = await prisma.venue.upsert({
    where: { slug: "test-cafe" },
    update: { nameFa: "کافه تست", ownerId: user.id },
    create: {
      ownerId: user.id,
      nameFa: "کافه تست",
      nameEn: "Test Cafe",
      slug: "test-cafe",
      welcomeMessage: "به کافه تست خوش آمدید",
      accentColor: "#111111",
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
      displayOrder: 1,
      isSoldOut: false,
      calories: 320,
    },
  });

  return { user, venue, categories: { cat1, cat2, cat3 }, items: { item1, item2, item3 } };
}
