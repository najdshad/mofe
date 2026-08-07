import { execSync } from "child_process";
import { join } from "path";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://mofe:mofe@localhost:5432/mofe_test";

export function setup() {
  const env = process.env as Record<string, string | undefined>;
  env.DATABASE_URL = TEST_DB_URL;
  env.NODE_ENV = "test";

  execSync(
    `psql "${TEST_DB_URL}" -c "SELECT 1" 2>/dev/null || createdb -U mofe mofe_test 2>/dev/null || true`,
    { stdio: "ignore" }
  );

  execSync(
    `psql "${TEST_DB_URL}" -c "DROP TABLE IF EXISTS schema_migrations;" && npx prisma db push`,
    {
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: "pipe",
      cwd: join(__dirname, "..", ".."),
    }
  );
}

export async function teardown() {
  const { prisma } = await import("@/lib/prisma");
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
