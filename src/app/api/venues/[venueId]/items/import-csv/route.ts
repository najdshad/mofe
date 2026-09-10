import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { validateCsrf } from "@/lib/csrf";
import { parseMenuCsv, type MenuRowData } from "@/lib/csv-import";
import { sanitizeCsvField } from "@/lib/csv";

async function writeItemRelations(
  tx: Prisma.TransactionClient,
  itemId: string,
  data: MenuRowData
) {
  // Upsert can resurrect a soft-deleted item — drop stale relations first.
  await tx.menuItemVariant.deleteMany({ where: { menuItemId: itemId } });
  await tx.menuItemPrice.deleteMany({ where: { menuItemId: itemId } });
  await tx.menuItemAllergen.deleteMany({ where: { menuItemId: itemId } });
  if (data.allergenCodes.length > 0) {
    await tx.menuItemAllergen.createMany({
      data: data.allergenCodes.map((code) => ({ menuItemId: itemId, allergenCode: code })),
    });
  }
  if (data.variants.length > 0) {
    await tx.menuItemVariant.createMany({
      data: data.variants.map((v, idx) => ({
        menuItemId: itemId,
        nameFa: v.nameFa,
        nameEn: v.nameEn,
        priceModifier: v.priceModifier,
        displayOrder: idx,
      })),
    });
  }
  if (data.prices.length > 0) {
    await tx.menuItemPrice.createMany({
      data: data.prices.map((p, idx) => ({
        menuItemId: itemId,
        description: p.description,
        priceToman: p.priceToman,
        displayOrder: idx,
      })),
    });
  }
}

// Full replace: the current menu is soft-deleted and rebuilt from the CSV rows.
// `skipRows` (CSV row numbers, as shown on the import review page) excludes rows from the rebuild.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();

    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    await validateCsrf();

    const body = await request.json();
    const { valid, invalid, error } = parseMenuCsv(body.csv);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const skippedRows = new Set<number>(Array.isArray(body.skipRows) ? body.skipRows : []);
    const included = valid.filter((r) => !skippedRows.has(r.rowNum));

    const categoryNames: string[] = [];
    const seenCategories = new Set<string>();
    for (const { data } of included) {
      const key = data.categoryNameFa.toLowerCase();
      if (!seenCategories.has(key)) {
        seenCategories.add(key);
        categoryNames.push(data.categoryNameFa);
      }
    }

    const results: { row: number; status: string; nameFa: string; message?: string }[] = [
      ...invalid.map((r) => ({ row: r.row, status: r.status, nameFa: r.nameFa, message: r.message })),
      ...valid
        .filter((r) => skippedRows.has(r.rowNum))
        .map((r) => ({ row: r.rowNum, status: "skipped" as const, nameFa: r.data.nameFa, message: "از ورود کنار گذاشته شد" })),
    ];

    // Wrap everything in a single transaction so a failure rolls back all changes
    const now = new Date();
    const categoryMap = new Map<string, string>();
    const categoryOrderCounters = new Map<string, number>();
    const BATCH_SIZE = 50;

    await prisma.$transaction(async (tx) => {
      // Phase 1: soft-delete existing items and categories
      await tx.menuItem.updateMany({
        where: { venueId, deletedAt: null },
        data: { deletedAt: now },
      });
      await tx.category.updateMany({
        where: { venueId, deletedAt: null },
        data: { deletedAt: now },
      });

      // Phase 2: create categories (upsert resurrects soft-deleted rows with the same name)
      for (let i = 0; i < categoryNames.length; i++) {
        const nameFa = sanitizeCsvField(categoryNames[i]);
        const cat = await tx.category.upsert({
          where: { venueId_nameFa: { venueId, nameFa } },
          update: { deletedAt: null, displayOrder: i },
          create: {
            venueId,
            nameFa,
            displayOrder: i,
          },
        });
        categoryMap.set(categoryNames[i].toLowerCase(), cat.id);
      }

      // Phase 3: create items (processed in batches within the same transaction)
      for (let batchStart = 0; batchStart < included.length; batchStart += BATCH_SIZE) {
        const batch = included.slice(batchStart, batchStart + BATCH_SIZE);

        for (const { rowNum, data } of batch) {
          const categoryId = categoryMap.get(data.categoryNameFa.toLowerCase());
          if (!categoryId) {
            results.push({ row: rowNum, status: "skipped", nameFa: data.nameFa, message: `دسته "${data.categoryNameFa}" یافت نشد` });
            continue;
          }

          const order = categoryOrderCounters.get(categoryId) ?? 0;
          categoryOrderCounters.set(categoryId, order + 1);

          try {
            const item = await tx.menuItem.upsert({
              where: { categoryId_nameFa: { categoryId, nameFa: data.nameFa } },
              update: {
                nameEn: data.nameEn,
                description: data.description,
                priceToman: data.priceToman,
                calories: data.calories,
                isSoldOut: data.isSoldOut,
                displayOrder: order,
                deletedAt: null,
              },
              create: {
                venueId,
                categoryId,
                nameFa: data.nameFa,
                nameEn: data.nameEn,
                description: data.description,
                priceToman: data.priceToman,
                calories: data.calories,
                isSoldOut: data.isSoldOut,
                displayOrder: order,
              },
            });
            await writeItemRelations(tx, item.id, data);
            results.push({ row: rowNum, status: "created", nameFa: data.nameFa });
          } catch (err) {
            const message = err instanceof Error ? err.message : "خطای ناشناخته";
            results.push({ row: rowNum, status: "error", nameFa: data.nameFa, message });
          }
        }
      }
    });

    const created = results.filter((r) => r.status === "created").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errors = results.filter((r) => r.status === "error").length;

    return NextResponse.json({ results, summary: { total: results.length, created, skipped, errors } });
  } catch (e) {
    return errorResponse(e);
  }
}
