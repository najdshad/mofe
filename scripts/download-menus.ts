import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { renderPublicMenu } from "../src/lib/public-menu/renderer";
import type { Snapshot } from "../src/lib/public-menu/renderer";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_DIR = resolve(__dirname, "..");
const OUTPUT_DIR = resolve(process.env.OUTPUT_DIR ?? join(PROJECT_DIR, "downloads"));

function createPrismaClient() {
  const adapter = new PrismaPg(
    process.env.DATABASE_URL ?? "postgresql://localhost:5432/mofe"
  );
  return new PrismaClient({ adapter });
}

async function toDataUri(url: string): Promise<string | null> {
  const filePath = join(PROJECT_DIR, "public", url);
  try {
    const buffer = await readFile(filePath);
    const mime = url.endsWith(".webp")
      ? "image/webp"
      : url.endsWith(".png")
        ? "image/png"
        : url.endsWith(".jpg") || url.endsWith(".jpeg")
          ? "image/jpeg"
          : "image/octet-stream";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

async function downloadMenus() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const prisma = createPrismaClient();

  try {
    const venues = await prisma.venue.findMany({
      where: { publicStatus: "published" },
      select: { id: true, nameFa: true, slug: true },
    });

    if (venues.length === 0) {
      console.log("No published venues found.");
      return;
    }

    console.log(`Found ${venues.length} published venue(s).\n`);

    let count = 0;
    for (const venue of venues) {
      const publication = await prisma.menuPublication.findFirst({
        where: { venueId: venue.id, status: "published" },
        orderBy: { createdAt: "desc" },
        select: { snapshot: true },
      });

      if (!publication?.snapshot) {
        console.log(`  \u26A0  ${venue.nameFa} — no published snapshot found`);
        continue;
      }

      const snapshot: Snapshot = JSON.parse(publication.snapshot);

      if (snapshot.venue.logoUrl) {
        const resolved = await toDataUri(snapshot.venue.logoUrl);
        if (resolved) {
          snapshot.venue.logoUrl = resolved;
        } else {
          console.log(`  \u2139  ${venue.nameFa} — logo file not found, skipping`);
        }
      }

      const html = renderPublicMenu(snapshot);
      const filename = `${venue.slug}.html`;
      await writeFile(join(OUTPUT_DIR, filename), html, "utf-8");
      console.log(`  \u2713  ${venue.nameFa} \u2192 ${filename}`);
      count++;
    }

    console.log(`\nDownloaded ${count} menu(s) to ${OUTPUT_DIR}`);
  } finally {
    await prisma.$disconnect();
  }
}

downloadMenus().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
