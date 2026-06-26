import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const DEFAULT_INTERNAL_PASSWORD = "admin1234";

function createPrismaClient() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? "postgresql://localhost:5432/mofe",
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Production boot guard: warn if internal admin still uses default password
if (process.env.NODE_ENV === "production") {
  (async () => {
    try {
      const bcrypt = await import("bcryptjs");
      const internalUser = await prisma.user.findUnique({
        where: { email: "admin@mofe.ir" },
        select: { passwordHash: true },
      });
      if (
        internalUser?.passwordHash &&
        (await bcrypt.compare(DEFAULT_INTERNAL_PASSWORD, internalUser.passwordHash))
      ) {
        console.warn(
          "⚠ WARNING: Internal admin (admin@mofe.ir) still uses the default password (%s). " +
            "Change it immediately in production via /internal/users.",
          DEFAULT_INTERNAL_PASSWORD
        );
      }
    } catch {
      // Non-fatal; admin@mofe.ir may not exist yet (pre-seed)
    }
  })();
}
