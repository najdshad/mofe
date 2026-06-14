import "dotenv/config";
import { PrismaSqlite } from "prisma-adapter-sqlite";
import { PrismaClient } from "../src/generated/prisma/client.js";
import bcrypt from "bcryptjs";

const adapter = new PrismaSqlite({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@nahal-cafe.ir" },
    update: {},
    create: {
      name: "مدیر کافه ناهال",
      email: "admin@nahal-cafe.ir",
      passwordHash,
      emailVerifiedAt: new Date(),
      status: "active",
    },
  });

  const venue = await prisma.venue.upsert({
    where: { slug: "nahal-cafe" },
    update: {},
    create: {
      nameFa: "کافه ناهال",
      nameEn: "Nahal Cafe",
      slug: "nahal-cafe",
      plan: "starter",
      timezone: "Asia/Tehran",
      welcomeMessage: "به منوی ما خوش آمدید. سفارش فقط حضوری.",
      publicStatus: "draft",
    },
  });

  await prisma.venueMember.upsert({
    where: { venueId_userId: { venueId: venue.id, userId: user.id } },
    update: {},
    create: {
      venueId: venue.id,
      userId: user.id,
      role: "owner",
    },
  });

  const categories = [
    { nameFa: "نوشیدنی‌های گرم", displayOrder: 1 },
    { nameFa: "قهوه", displayOrder: 2 },
    { nameFa: "دسر", displayOrder: 3 },
    { nameFa: "غذا", displayOrder: 4, active: false },
  ];

  const createdCategories: Record<string, string> = {};
  for (const cat of categories) {
    const created = await prisma.category.create({
      data: {
        venueId: venue.id,
        nameFa: cat.nameFa,
        displayOrder: cat.displayOrder,
        active: cat.active ?? true,
      },
    });
    createdCategories[cat.nameFa] = created.id;
  }

  const items = [
    {
      nameFa: "لاته",
      nameEn: "Latte",
      category: "قهوه",
      priceToman: 145000,
      station: "bar",
      visibleOnPublicMenu: true,
      isSoldOut: false,
      description: "اسپرسو با شیر بخار داده شده و کف لطیف.",
      calories: 140,
      displayOrder: 1,
    },
    {
      nameFa: "اسپرسو",
      nameEn: "Espresso",
      category: "قهوه",
      priceToman: 95000,
      station: "bar",
      visibleOnPublicMenu: true,
      isSoldOut: false,
      description: "قهوه غلیظ و خالص با طعمی قوی.",
      calories: 5,
      displayOrder: 2,
    },
    {
      nameFa: "کاپوچینو",
      nameEn: "Cappuccino",
      category: "قهوه",
      priceToman: 135000,
      station: "bar",
      visibleOnPublicMenu: true,
      isSoldOut: false,
      description: "اسپرسو با شیر بخار داده شده و فوم غلیظ.",
      calories: 120,
      displayOrder: 3,
    },
    {
      nameFa: "چای دارچین",
      nameEn: "Cinnamon Tea",
      category: "نوشیدنی‌های گرم",
      priceToman: 85000,
      station: "kitchen",
      visibleOnPublicMenu: true,
      isSoldOut: true,
      description: "چای سیاه با دارچین و عطر آرام.",
      displayOrder: 1,
    },
    {
      nameFa: "چای نعناع",
      nameEn: "Mint Tea",
      category: "نوشیدنی‌های گرم",
      priceToman: 75000,
      station: "kitchen",
      visibleOnPublicMenu: true,
      isSoldOut: false,
      description: "چای سبز با برگ نعناع تازه.",
      displayOrder: 2,
    },
    {
      nameFa: "دمنوش بابونه",
      nameEn: "Chamomile Tea",
      category: "نوشیدنی‌های گرم",
      priceToman: 80000,
      station: "kitchen",
      visibleOnPublicMenu: true,
      isSoldOut: false,
      description: "دمنوش آرامش‌بخش بابونه با عسل.",
      displayOrder: 3,
    },
    {
      nameFa: "کیک هویج",
      nameEn: "Carrot Cake",
      category: "دسر",
      priceToman: 175000,
      station: "kitchen",
      visibleOnPublicMenu: false,
      isSoldOut: false,
      description: "کیک نرم با کرم پنیر و گردو.",
      calories: 320,
      displayOrder: 1,
    },
    {
      nameFa: "تیرامیسو",
      nameEn: "Tiramisu",
      category: "دسر",
      priceToman: 165000,
      station: "kitchen",
      visibleOnPublicMenu: true,
      isSoldOut: false,
      description: "دسر لایه‌ای ایتالیایی با قهوه و ماسکارپونه.",
      calories: 280,
      displayOrder: 2,
    },
    {
      nameFa: "چیزکیک",
      nameEn: "Cheesecake",
      category: "دسر",
      priceToman: 185000,
      station: "kitchen",
      visibleOnPublicMenu: true,
      isSoldOut: false,
      description: "چیزکیک خامه‌ای با سس توت فرنگی.",
      calories: 350,
      displayOrder: 3,
    },
  ];

  for (const item of items) {
    const catId = createdCategories[item.category];
    if (!catId) continue;

    await prisma.menuItem.create({
      data: {
        venueId: venue.id,
        categoryId: catId,
        nameFa: item.nameFa,
        nameEn: item.nameEn,
        description: item.description,
        priceToman: item.priceToman,
        station: item.station,
        calories: item.calories ?? null,
        visibleOnPublicMenu: item.visibleOnPublicMenu,
        isSoldOut: item.isSoldOut,
        displayOrder: item.displayOrder,
      },
    });
  }

  console.log("Seed completed successfully");
  console.log(`  Venue: ${venue.nameFa} (${venue.slug})`);
  console.log(`  Admin email: admin@nahal-cafe.ir`);
  console.log(`  Password: demo1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
