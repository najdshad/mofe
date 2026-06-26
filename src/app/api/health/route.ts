import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return NextResponse.json({ status: "healthy" });
  } catch {
    return NextResponse.json({ status: "unhealthy" }, { status: 503 });
  }
}
