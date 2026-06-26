import { PrismaSqlite } from "prisma-adapter-sqlite";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaSqlite({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  const client = new PrismaClient({ adapter });

  client.$executeRawUnsafe("PRAGMA journal_mode=WAL").catch(() => {
    // Non-fatal; WAL mode improves concurrent write performance
  });
  client.$executeRawUnsafe("PRAGMA busy_timeout=5000").catch(() => {});

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
