import { execSync } from "child_process";
import { join } from "path";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://mofe:mofe@localhost:5432/mofe_test";

export function setup() {
  const env = process.env as Record<string, string | undefined>;
  env.DATABASE_URL = TEST_DB_URL;
  env.NODE_ENV = "test";

  execSync("npx prisma db push --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
    cwd: join(__dirname, "..", ".."),
  });
}

export function teardown() {
  // Tables are dropped between test runs via cleanTestData()
}
