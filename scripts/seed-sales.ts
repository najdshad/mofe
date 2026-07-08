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

  const sales: Array<{
    venueId: string;
    orderId: string;
    total: number;
    itemCount: number;
    completedAt: Date;
  }> = [];

  let orderCounter = 0;
  const now = new Date();

  for (let day = 0; day < 60; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);

    // More orders on weekends (Thu/Fri in Iran = day 4/5)
    const isWeekend = date.getDay() === 5 || date.getDay() === 4;
    // More orders in recent days trend
    const recency = Math.max(1, (60 - day) / 60);
    const baseOrders = isWeekend ? 8 : 4;
    const numOrders = Math.max(1, Math.round(baseOrders * (0.5 + recency * 0.5) + Math.random() * 3));

    for (let o = 0; o < numOrders; o++) {
      const hour = 9 + Math.floor(Math.random() * 12);
      const minute = Math.floor(Math.random() * 60);
      const completedAt = new Date(date);
      completedAt.setHours(hour, minute, Math.floor(Math.random() * 60));

      const itemCount = 1 + Math.floor(Math.random() * 4);
      // Average item price ~120000, total proportional
      const avgItemPrice = 80000 + Math.floor(Math.random() * 120000);
      const total = itemCount * avgItemPrice;

      orderCounter++;
      sales.push({
        venueId: venue.id,
        orderId: `seed-sale-${orderCounter}`,
        total,
        itemCount,
        completedAt,
      });
    }
  }

  // Batch insert
  for (const sale of sales) {
    await prisma.sale.create({ data: sale });
  }

  const totalRevenue = sales.reduce((s, x) => s + x.total, 0);
  console.log(`Inserted ${sales.length} sales for ${venue.nameFa}`);
  console.log(`Total revenue: ${totalRevenue.toLocaleString("fa-IR")} تومان`);
  console.log(`Date range: ${sales[sales.length - 1].completedAt.toISOString().split("T")[0]} → ${sales[0].completedAt.toISOString().split("T")[0]}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
