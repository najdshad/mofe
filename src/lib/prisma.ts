import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const DEFAULT_DB_URL = `file:${process.cwd()}/prisma/dev.db`;
const TEST_DB_URL = `file:${process.cwd()}/prisma/mofe_test.db`;

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.NODE_ENV === "test" ? TEST_DB_URL : DEFAULT_DB_URL,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
