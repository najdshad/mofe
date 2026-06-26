import "dotenv/config";
import { PrismaSqlite } from "prisma-adapter-sqlite";
import { PrismaClient } from "../src/generated/prisma/client.js";
import * as fs from "node:fs";
import * as path from "node:path";

const adapter = new PrismaSqlite({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const CSV_PATH = path.resolve(import.meta.dirname, "..", "sample-csv.csv");

interface VariantDef {
  nameFa: string;
  nameEn?: string;
  priceModifier: number;
}

interface ParsedItem {
  nameFa: string;
  nameEn: string | null;
  categoryFa: string;
  priceToman: number;
  station: string;
  calories: number | null;
  description: string | null;
  visibleOnPublicMenu: boolean;
  isSoldOut: boolean;
  variants: VariantDef[];
}

function parsePrice(raw: string): number {
  const val = parseInt(raw.trim());
  if (isNaN(val)) return 0;
  return val < 10000 ? val * 1000 : val;
}

function parseLine(line: string): ParsedItem {
  const cols = line.split(",");
  const nameFa = cols[0]?.trim() ?? "";
  const nameEnRaw = cols[1]?.trim() || null;
  const categoryFa = cols[2]?.trim() ?? "";
  const priceRaw = cols[3]?.trim() ?? "0";
  const stationRaw = cols[4]?.trim() ?? "kitchen";
  const station = stationRaw.toLowerCase();
  const calRaw = cols[5]?.trim();
  const calories = calRaw ? (parseInt(calRaw) || null) : null;
  const description = cols[6]?.trim() || null;
  const visRaw = cols[7]?.trim();
  const soldRaw = cols[8]?.trim();
  const visibleOnPublicMenu = visRaw === "" ? true : visRaw === "true";
  const isSoldOut = soldRaw === "" ? false : soldRaw === "true";

  // Check if item has variants (multiple prices separated by /)
  const priceParts = priceRaw.split("/").map((p) => parsePrice(p));

  if (priceParts.length > 1) {
    // Detect number of name parts
    const nameFaParts = nameFa.split("/");
    const nameEnParts = nameEnRaw ? nameEnRaw.split("/") : [];

    if (priceParts.length === 4 && nameFa.includes("سینگل") && nameFa.includes("دبل")) {
      // Espresso — 4 variants
      const basePrice = priceParts[priceParts.length - 1]; // 105000 (single robusta)
      return {
        nameFa: "اسپرسو",
        nameEn: "Espresso",
        categoryFa,
        priceToman: basePrice,
        station,
        calories,
        description,
        visibleOnPublicMenu,
        isSoldOut,
        variants: [
          { nameFa: "سینگل روبوستا", nameEn: "Single Robusta", priceModifier: 0 },
          { nameFa: "سینگل عربیکا", nameEn: "Single Arabica", priceModifier: 25000 },
          { nameFa: "دبل روبوستا", nameEn: "Double Robusta", priceModifier: 25000 },
          { nameFa: "دبل عربیکا", nameEn: "Double Arabica", priceModifier: 70000 },
        ],
      };
    }

    if (priceParts.length === 2) {
      // Two variants
      const basePrice = Math.min(...priceParts);

      // Extract variant names from nameFa
      // First part has form "base الساف1" or "base و الساف1"
      const firstPart = nameFaParts[0]?.trim() ?? "";
      const secondPart = nameFaParts[1]?.trim() ?? "";

      // Try to split at last " و " which separates base from variant
      const andIdx = firstPart.lastIndexOf(" و ");
      let baseNameFa: string;
      let var0Fa: string;
      if (andIdx !== -1) {
        baseNameFa = firstPart.substring(0, andIdx).trim();
        var0Fa = firstPart.substring(andIdx + 3).trim();
      } else {
        const lastSpace = firstPart.lastIndexOf(" ");
        if (lastSpace !== -1) {
          baseNameFa = firstPart.substring(0, lastSpace).trim();
          var0Fa = firstPart.substring(lastSpace + 1).trim();
        } else {
          baseNameFa = firstPart;
          var0Fa = "";
        }
      }

      // Extract English variant names
      let baseNameEn: string | null = null;
      let var0En: string | null = null;
      let var1En: string | null = null;
      if (nameEnParts.length === 2) {
        const enFirst = nameEnParts[0]?.trim() ?? "";
        const enSecond = nameEnParts[1]?.trim() ?? "";
        // Split at last space in the first part (or last " with "/" and ")
        const lastSpace = enFirst.lastIndexOf(" ");
        if (lastSpace !== -1) {
          baseNameEn = enFirst.substring(0, lastSpace).trim();
          var0En = enFirst.substring(lastSpace + 1).trim();
        }
        var1En = enSecond;
      }

      return {
        nameFa: baseNameFa,
        nameEn: baseNameEn ?? nameEnRaw,
        categoryFa,
        priceToman: basePrice,
        station,
        calories,
        description,
        visibleOnPublicMenu,
        isSoldOut,
        variants: [
          { nameFa: var0Fa, nameEn: var0En ?? undefined, priceModifier: priceParts[0] - basePrice },
          { nameFa: secondPart, nameEn: var1En ?? undefined, priceModifier: priceParts[1] - basePrice },
        ],
      };
    }
  }

  // Simple item (no variants)
  return {
    nameFa,
    nameEn: nameEnRaw,
    categoryFa,
    priceToman: parsePrice(priceRaw),
    station,
    calories,
    description,
    visibleOnPublicMenu,
    isSoldOut,
    variants: [],
  };
}

async function main() {
  const venue = await prisma.venue.findUnique({ where: { slug: "noghteh" } });
  if (!venue) {
    console.error('Venue "noghteh" not found. Run `npx tsx prisma/seed.ts` first.');
    process.exit(1);
  }
  console.log(`Importing to venue: ${venue.nameFa} (${venue.id})`);

  const csvContent = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = csvContent.trim().split("\n");
  const dataLines = lines.slice(1); // skip header

  const catCache = new Map<string, string>();

  // Pre-load existing categories
  const existingCats = await prisma.category.findMany({ where: { venueId: venue.id } });
  for (const c of existingCats) {
    catCache.set(c.nameFa, c.id);
  }

  let created = 0;
  let skipped = 0;

  for (const line of dataLines) {
    if (!line.trim()) continue;

    const item = parseLine(line);

    // Find or create category
    let catId = catCache.get(item.categoryFa);
    if (!catId) {
      const cat = await prisma.category.create({
        data: { venueId: venue.id, nameFa: item.categoryFa, displayOrder: 99, active: true },
      });
      catCache.set(item.categoryFa, cat.id);
      catId = cat.id;
      console.log(`  Created category: ${item.categoryFa}`);
    }

    // Check if item already exists
    const existing = await prisma.menuItem.findFirst({
      where: { venueId: venue.id, nameFa: item.nameFa, deletedAt: null },
    });

    if (existing) {
      console.log(`  Skipped (exists): ${item.nameFa}`);
      skipped++;
      continue;
    }

    // Compute display order
    const maxOrder = await prisma.menuItem.aggregate({
      where: { venueId: venue.id, categoryId: catId, deletedAt: null },
      _max: { displayOrder: true },
    });

    const newItem = await prisma.menuItem.create({
      data: {
        venueId: venue.id,
        categoryId: catId,
        nameFa: item.nameFa,
        nameEn: item.nameEn,
        description: item.description,
        priceToman: item.priceToman,
        station: item.station,
        calories: item.calories,
        visibleOnPublicMenu: item.visibleOnPublicMenu,
        isSoldOut: item.isSoldOut,
        displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
      },
    });

    // Create variants if any
    if (item.variants.length > 0) {
      await prisma.menuItemVariant.createMany({
        data: item.variants.map((v, i) => ({
          menuItemId: newItem.id,
          nameFa: v.nameFa,
          nameEn: v.nameEn || null,
          priceModifier: v.priceModifier,
          displayOrder: i + 1,
        })),
      });
    }

    console.log(`  Created: ${item.nameFa}${item.variants.length ? ` (${item.variants.length} variants)` : ""}`);
    created++;
  }

  console.log(`\nDone! Created ${created} items, skipped ${skipped} existing.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
