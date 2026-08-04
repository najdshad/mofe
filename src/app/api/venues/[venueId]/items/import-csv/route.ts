import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { VALID_STATIONS } from "@/lib/constants";
import Papa from "papaparse";

const FORMULA_INJECTION_RE = /^[=+\-@\t]/;

function sanitizeCsvField(value: string): string {
  if (FORMULA_INJECTION_RE.test(value)) {
    return "'" + value;
  }
  return value;
}

function findHeaderIndex(headers: string[], ...names: string[]): number {
  for (const name of names) {
    const idx = headers.findIndex(
      (h) => h.toLowerCase().replace(/[\s_-]/g, "") === name.toLowerCase().replace(/[\s_-]/g, "")
    );
    if (idx !== -1) return idx;
  }
  return -1;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();

    const { venueId } = await params;
    const hasAccess = await canManage(user.id, venueId);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const csvText = body.csv as string;

  if (!csvText || typeof csvText !== "string" || csvText.trim().length === 0) {
    return NextResponse.json({ error: "محتوای CSV ارسال نشده" }, { status: 400 });
  }

  const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
  const rows = parsed.data;
  if (rows.length < 2) {
    return NextResponse.json({ error: "فایل CSV حداقل باید شامل هدر و یک سطر داده باشد" }, { status: 400 });
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const dataRows = rows.slice(1);

  const idxNameFa = findHeaderIndex(headers, "namefa", "name_fa", "نام فارسی", "name-fa");
  const idxNameEn = findHeaderIndex(headers, "nameen", "name_en", "نام انگلیسی", "name-en");
  const idxCategory = findHeaderIndex(headers,
    "categorynamefa", "category_name_fa", "category", "دسته", "categoryname", "category_name",
    "categoryfa", "category_fa", "category-fa",
  );
  const idxPrice = findHeaderIndex(headers, "pricetoman", "price_toman", "price", "قیمت", "price-toman");
  const idxStation = findHeaderIndex(headers,
    "station", "ایستگاه",
    "kitchen|bar", "kitchen-bar", "kitchen_bar", "kitchen/bar",
  );
  const idxDescription = findHeaderIndex(headers, "description", "توضیحات");
  const idxCalories = findHeaderIndex(headers, "calories", "کالری");
  const idxSoldOut = findHeaderIndex(headers, "issoldout", "is_sold_out", "soldout", "sold_out", "ناموجود");

  if (idxNameFa === -1) {
    return NextResponse.json({ error: "ستون nameFa (نام فارسی) در CSV یافت نشد" }, { status: 400 });
  }
  if (idxCategory === -1) {
    return NextResponse.json({ error: "ستون categoryFa (دسته) در CSV یافت نشد" }, { status: 400 });
  }
  if (idxPrice === -1) {
    return NextResponse.json({ error: "ستون priceToman (قیمت) در CSV یافت نشد" }, { status: 400 });
  }

  const uniqueCategoryNames: string[] = [];
  const seenCategories = new Set<string>();
  for (const row of dataRows) {
    const name = row[idxCategory]?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!seenCategories.has(key)) {
      seenCategories.add(key);
      uniqueCategoryNames.push(name);
    }
  }

  const results: { row: number; status: string; nameFa: string; message?: string }[] = [];

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

    // Phase 2: create categories
    for (let i = 0; i < uniqueCategoryNames.length; i++) {
      const cat = await tx.category.create({
        data: {
          venueId,
          nameFa: sanitizeCsvField(uniqueCategoryNames[i]),
          displayOrder: i,
        },
      });
      categoryMap.set(uniqueCategoryNames[i].toLowerCase(), cat.id);
    }

    // Phase 3: create items (processed in batches within the same transaction)
    for (let batchStart = 0; batchStart < dataRows.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, dataRows.length);
      const batchRows = dataRows.slice(batchStart, batchEnd);

      for (let j = 0; j < batchRows.length; j++) {
        const row = batchRows[j];
        const i = batchStart + j;
        const rowNum = i + 2;

        const nameFa = sanitizeCsvField(row[idxNameFa]?.trim() ?? "");
        if (!nameFa) {
          results.push({ row: rowNum, status: "skipped", nameFa: "", message: "نام فارسی خالی است" });
          continue;
        }

        const categoryNameFa = row[idxCategory]?.trim();
        if (!categoryNameFa) {
          results.push({ row: rowNum, status: "skipped", nameFa, message: "نام دسته خالی است" });
          continue;
        }

        const categoryId = categoryMap.get(categoryNameFa.toLowerCase());
        if (!categoryId) {
          results.push({ row: rowNum, status: "skipped", nameFa, message: `دسته "${categoryNameFa}" یافت نشد` });
          continue;
        }

        const priceRaw = row[idxPrice]?.trim().replace(/[,\s]/g, "");
        let priceToman = parseInt(priceRaw, 10);
        if (isNaN(priceToman)) priceToman = 0;
        if (priceToman < 0) {
          results.push({ row: rowNum, status: "skipped", nameFa, message: "قیمت نامعتبر است" });
          continue;
        }

        const station = row[idxStation]?.trim().toLowerCase();
        if (station && !VALID_STATIONS.includes(station as typeof VALID_STATIONS[number])) {
          results.push({ row: rowNum, status: "skipped", nameFa, message: `ایستگاه "${station}" نامعتبر است (kitchen یا bar)` });
          continue;
        }

        const nameEn = idxNameEn !== -1 ? sanitizeCsvField(row[idxNameEn]?.trim() ?? "") || null : null;
        const description = idxDescription !== -1 ? sanitizeCsvField(row[idxDescription]?.trim() ?? "") || null : null;
        const caloriesRaw = idxCalories !== -1 ? row[idxCalories]?.trim() : null;
        const calories = caloriesRaw ? parseInt(caloriesRaw, 10) || null : null;
        const soldOutRaw = idxSoldOut !== -1 ? row[idxSoldOut]?.trim().toLowerCase() : null;
        const isSoldOut = soldOutRaw === "true" || soldOutRaw === "1" || soldOutRaw === "yes" || soldOutRaw === "بله";

        const order = categoryOrderCounters.get(categoryId) ?? 0;
        categoryOrderCounters.set(categoryId, order + 1);

        try {
          await tx.menuItem.create({
            data: {
              venueId,
              categoryId,
              nameFa,
              nameEn,
              description,
              priceToman,
              station: station || "kitchen",
              calories,
              isSoldOut,
              displayOrder: order,
            },
          });
          results.push({ row: rowNum, status: "created", nameFa });
        } catch (err) {
          const message = err instanceof Error ? err.message : "خطای ناشناخته";
          results.push({ row: rowNum, status: "error", nameFa, message });
        }
      }
    }
  });

  await logAudit({
    venueId,
    actorUserId: user.id,
    action: "import_csv",
    entityType: "menu",
    metadata: { total: results.length },
  });

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({ results, summary: { total: results.length, created, skipped, errors } });
  } catch (e) {
    return errorResponse(e);
  }
}
