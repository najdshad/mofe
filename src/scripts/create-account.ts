import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";
import { hashPassword } from "../lib/auth";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: `file:${process.cwd()}/prisma/dev.db`,
  }),
});

const persianToAscii: Record<string, string> = {
  "آ": "a", "ا": "a", "ب": "b", "پ": "p", "ت": "t", "ث": "s",
  "ج": "j", "چ": "ch", "ح": "h", "خ": "kh", "د": "d", "ذ": "z",
  "ر": "r", "ز": "z", "ژ": "zh", "س": "s", "ش": "sh", "ص": "s",
  "ض": "z", "ط": "t", "ظ": "z", "ع": "a", "غ": "gh", "ف": "f",
  "ق": "gh", "ک": "k", "گ": "g", "ل": "l", "م": "m", "ن": "n",
  "و": "v", "ه": "h", "ی": "y",
  " ": "-", "_": "-",
};

function generateSlug(nameFa: string): string {
  let slug = "";
  for (const ch of nameFa.trim().toLowerCase()) {
    slug += persianToAscii[ch] ?? (ch.match(/[a-z0-9-]/) ? ch : "");
  }
  slug = slug.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return slug || "cafe";
}

async function uniqueSlug(base: string): Promise<string> {
  const existing = await prisma.venue.findFirst({
    where: { slug: { startsWith: base } },
    select: { slug: true },
    orderBy: { slug: "desc" },
  });
  if (!existing) return base;
  const match = existing.slug.match(new RegExp(`^${base}-(\\d+)$`));
  const next = match ? parseInt(match[1], 10) + 1 : 1;
  return `${base}-${next}`;
}

async function main() {
  const [name, email, password, cafeName] = process.argv.slice(2);
  if (!name || !email || !password || !cafeName) {
    console.error("Usage: npm run create:account -- <name> <email> <password> <cafeName>");
    process.exit(1);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("Invalid email");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    console.error(`User already exists: ${email}`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const slug = await uniqueSlug(generateSlug(cafeName));

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash, status: "active" },
    });
    const venue = await tx.venue.create({
      data: { ownerId: user.id, nameFa: cafeName, slug },
    });
    return { userId: user.id, venueId: venue.id };
  });

  console.log("Account created:");
  console.log(`  Email: ${email}`);
  console.log(`  Venue URL: /m/${slug}`);
  console.log(`  Admin URL: /admin/${result.venueId}/menu`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });