import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: { purchasable: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        nameFa: true,
        nameEn: true,
        description: true,
        priceToman: true,
        maxMenuItems: true,
        maxTables: true,
        customDomain: true,
        orderingEnabled: true,
      },
    });

    return NextResponse.json({ plans });
  } catch {
    return NextResponse.json({ error: "خطا در دریافت طرح‌ها" }, { status: 500 });
  }
}
