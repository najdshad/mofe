import { execSync } from "child_process";
import { join } from "path";

const TEST_DB_PATH = join(__dirname, "..", "..", "prisma", "mofe_test.db");

export function setup() {
  const env = process.env as Record<string, string | undefined>;
  env.NODE_ENV = "test";

  execSync(`rm -f "${TEST_DB_PATH}"`, { stdio: "ignore" });

  execSync(`npx prisma db push`, {
    stdio: "pipe",
    cwd: join(__dirname, "..", ".."),
  });
}

export async function teardown() {
  const { prisma } = await import("@/lib/prisma");
  await prisma.saleLineItem.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.menuItemAllergen.deleteMany();
  await prisma.menuItemVariant.deleteMany();
  await prisma.menuItemPrice.deleteMany();
  await prisma.rateLimitEntry.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.session.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();
}
