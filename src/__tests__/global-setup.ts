import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const TEST_DB_PATH = join(__dirname, "..", "..", "test.db");

export function setup() {
  process.env.DATABASE_URL = `file:${TEST_DB_PATH}`;
  process.env.NODE_ENV = "test";

  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH);
  }
  const journal = TEST_DB_PATH + "-journal";
  if (existsSync(journal)) {
    unlinkSync(journal);
  }

  execSync("npx prisma db push --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: `file:${TEST_DB_PATH}` },
    stdio: "pipe",
    cwd: join(__dirname, "..", ".."),
  });
}

export function teardown() {
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH);
  }
  const journal = TEST_DB_PATH + "-journal";
  if (existsSync(journal)) {
    unlinkSync(journal);
  }
}
