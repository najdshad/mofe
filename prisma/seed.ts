import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEMO_EMAIL, DEMO_PASSWORD, ensureDemoData } from "../src/lib/demo";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: `file:${process.cwd()}/prisma/dev.db`,
  }),
});

async function main() {
  const { venue } = await ensureDemoData(prisma);

  const categories = [
    { nameFa: "نوشیدنی‌های گرم", displayOrder: 1 },
    { nameFa: "قهوه", displayOrder: 2 },
    { nameFa: "دسر", displayOrder: 3 },
    { nameFa: "غذا", displayOrder: 4, active: false },
  ];

  const createdCategories: Record<string, string> = {};
  for (const cat of categories) {
    const existing = await prisma.category.findFirst({
      where: { venueId: venue.id, nameFa: cat.nameFa },
    });
    const created = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data: {
            displayOrder: cat.displayOrder,
            active: cat.active ?? true,
            deletedAt: null,
          },
        })
      : await prisma.category.create({
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
      isSoldOut: true,
      description: "چای سیاه با دارچین و عطر آرام.",
      displayOrder: 1,
    },
    {
      nameFa: "چای نعناع",
      nameEn: "Mint Tea",
      category: "نوشیدنی‌های گرم",
      priceToman: 75000,
      isSoldOut: false,
      description: "چای سبز با برگ نعناع تازه.",
      displayOrder: 2,
    },
    {
      nameFa: "دمنوش بابونه",
      nameEn: "Chamomile Tea",
      category: "نوشیدنی‌های گرم",
      priceToman: 80000,
      isSoldOut: false,
      description: "دمنوش آرامش‌بخش بابونه با عسل.",
      displayOrder: 3,
    },
    {
      nameFa: "کیک هویج",
      nameEn: "Carrot Cake",
      category: "دسر",
      priceToman: 175000,
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
      isSoldOut: false,
      description: "چیزکیک خامه‌ای با سس توت فرنگی.",
      calories: 350,
      displayOrder: 3,
    },
  ];

  for (const item of items) {
    const catId = createdCategories[item.category];
    if (!catId) continue;

    const existing = await prisma.menuItem.findFirst({
      where: { venueId: venue.id, categoryId: catId, nameFa: item.nameFa },
    });

    if (existing) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: {
          nameEn: item.nameEn,
          description: item.description,
          priceToman: item.priceToman,
          calories: item.calories ?? null,

          isSoldOut: item.isSoldOut,
          displayOrder: item.displayOrder,
          deletedAt: null,
        },
      });
      continue;
    }

    await prisma.menuItem.create({
      data: {
        venueId: venue.id,
        categoryId: catId,
        nameFa: item.nameFa,
        nameEn: item.nameEn,
        description: item.description,
        priceToman: item.priceToman,
        calories: item.calories ?? null,
        isSoldOut: item.isSoldOut,
        displayOrder: item.displayOrder,
      },
    });
  }

  console.log("Seed completed successfully");
  console.log(`  Venue: ${venue.nameFa} (${venue.slug})`);
  console.log(`  Admin email: ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
