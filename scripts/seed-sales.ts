import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? "postgresql://mofe:mofe@localhost:5432/mofe" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const venue = await prisma.venue.findUnique({ where: { slug: "noghteh" } });
  if (!venue) { throw new Error("Venue noghteh not found"); }

  // Delete existing fake sales for noghteh
  await prisma.sale.deleteMany({ where: { venueId: venue.id } });

  let orderCounter = 0;
  const now = new Date();

  const itemPool = [
    { id: "item-mint-tea", name: "چای نعناع", station: "kitchen", basePrice: 75000 },
    { id: "item-cinnamon", name: "چای دارچین", station: "kitchen", basePrice: 85000 },
    { id: "item-carrot-cake", name: "کیک هویج", station: "kitchen", basePrice: 175000 },
    { id: "item-turkish-coffee", name: "قهوه ترک", station: "kitchen", basePrice: 95000 },
    { id: "item-latte", name: "لاته", station: "bar", basePrice: 120000 },
    { id: "item-espresso", name: "اسپرسو", station: "bar", basePrice: 80000 },
    { id: "item-muffin", name: "مافین", station: "kitchen", basePrice: 90000 },
    { id: "item-caesar", name: "سالاد سزار", station: "kitchen", basePrice: 195000 },
    { id: "item-mojito", name: "موهیتو", station: "bar", basePrice: 110000 },
    { id: "item-brownie", name: "براونی", station: "kitchen", basePrice: 85000 },
    { id: "item-cappuccino", name: "کاپوچینو", station: "bar", basePrice: 115000 },
    { id: "item-cheesecake", name: "چیزکیک", station: "kitchen", basePrice: 165000 },
  ];

  // Hourly multipliers for realistic time distribution
  const hourWeights: Record<number, number> = {
    8: 0.3, 9: 0.6, 10: 0.9, 11: 1.0, 12: 1.2, 13: 1.5, 14: 1.3,
    15: 0.8, 16: 0.7, 17: 1.0, 18: 1.4, 19: 1.7, 20: 1.6, 21: 1.3, 22: 0.7, 23: 0.3,
  };
  const weightedHours = Object.entries(hourWeights).flatMap(([h, w]) => Array(Math.round(w * 10)).fill(Number(h)));

  let saleCount = 0;
  let totalRevenue = 0;
  let oldestDate = now;
  let newestDate = now;

  for (let day = 0; day < 60; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);

    const isWeekend = date.getDay() === 5 || date.getDay() === 4;
    const recency = Math.max(1, (60 - day) / 60);
    const baseOrders = isWeekend ? 10 : 5;
    const numOrders = Math.max(1, Math.round(baseOrders * (0.4 + recency * 0.6) + Math.random() * 4));

    for (let o = 0; o < numOrders; o++) {
      const hour = weightedHours[Math.floor(Math.random() * weightedHours.length)];
      const minute = Math.floor(Math.random() * 60);
      const completedAt = new Date(date);
      completedAt.setHours(hour, minute, Math.floor(Math.random() * 60));

      // Generate items first, then compute total
      const itemCount = 1 + Math.floor(Math.random() * 4);
      const items: Array<{
        menuItemId: string;
        menuItemName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        station: string;
      }> = [];

      for (let i = 0; i < itemCount; i++) {
        const template = itemPool[Math.floor(Math.random() * itemPool.length)];
        const quantity = 1 + (Math.random() < 0.3 ? 1 : 0); // 30% chance of ordering 2
        const priceVariation = Math.floor(template.basePrice * (0.9 + Math.random() * 0.2)); // ±10%
        items.push({
          menuItemId: template.id,
          menuItemName: template.name,
          quantity,
          unitPrice: priceVariation,
          totalPrice: quantity * priceVariation,
          station: template.station,
        });
      }

      const orderTotal = items.reduce((s, i) => s + i.totalPrice, 0);

      orderCounter++;
      saleCount++;

      const sale = await prisma.sale.create({
        data: {
          venueId: venue.id,
          orderId: `seed-sale-${orderCounter}`,
          total: orderTotal,
          itemCount,
          completedAt,
        },
      });

      for (const item of items) {
        await prisma.saleItem.create({
          data: {
            saleId: sale.id,
            menuItemId: item.menuItemId,
            menuItemName: item.menuItemName,
            variantId: null,
            variantName: null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            station: item.station,
            completedAt,
          },
        });
      }

      totalRevenue += orderTotal;
      if (completedAt < oldestDate) oldestDate = completedAt;
      if (completedAt > newestDate) newestDate = completedAt;
    }
  }

  console.log(`Inserted ${saleCount} sales for ${venue.nameFa}`);
  console.log(`Total revenue: ${totalRevenue.toLocaleString("fa-IR")} تومان`);
  console.log(`Total SaleItems: ${await prisma.saleItem.count({ where: { sale: { venueId: venue.id } } })}`);
  console.log(`Date range: ${oldestDate.toISOString().split("T")[0]} → ${newestDate.toISOString().split("T")[0]}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
