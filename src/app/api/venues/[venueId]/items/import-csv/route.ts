import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManageItems } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
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
    const canManage = await canManageItems(user.id, venueId);
    if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  const idxVisible = findHeaderIndex(headers,
    "visibleonpublicmenu", "visible_on_public_menu", "visible", "نمایش",
    "visiblepublic", "visible_public", "visible-public",
  );
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

  const now = new Date();

  await prisma.menuItem.updateMany({
    where: { venueId, deletedAt: null },
    data: { deletedAt: now },
  });

  await prisma.category.updateMany({
    where: { venueId, deletedAt: null },
    data: { deletedAt: now },
  });

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

  const categoryMap = new Map<string, string>();
  for (let i = 0; i < uniqueCategoryNames.length; i++) {
    const cat = await prisma.category.create({
      data: {
        venueId,
        nameFa: sanitizeCsvField(uniqueCategoryNames[i]),
        displayOrder: i,
      },
    });
    categoryMap.set(uniqueCategoryNames[i].toLowerCase(), cat.id);
  }

  const categoryOrderCounters = new Map<string, number>();
  const results: { row: number; status: string; nameFa: string; message?: string }[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
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
    if (station && !["kitchen", "bar"].includes(station)) {
      results.push({ row: rowNum, status: "skipped", nameFa, message: `ایستگاه "${station}" نامعتبر است (kitchen یا bar)` });
      continue;
    }

    const nameEn = idxNameEn !== -1 ? sanitizeCsvField(row[idxNameEn]?.trim() ?? "") || null : null;
    const description = idxDescription !== -1 ? sanitizeCsvField(row[idxDescription]?.trim() ?? "") || null : null;
    const caloriesRaw = idxCalories !== -1 ? row[idxCalories]?.trim() : null;
    const calories = caloriesRaw ? parseInt(caloriesRaw, 10) || null : null;
    const visibleRaw = idxVisible !== -1 ? row[idxVisible]?.trim().toLowerCase() : null;
    const visibleOnPublicMenu = visibleRaw === "false" || visibleRaw === "0" || visibleRaw === "no" || visibleRaw === "خیر" ? false : true;
    const soldOutRaw = idxSoldOut !== -1 ? row[idxSoldOut]?.trim().toLowerCase() : null;
    const isSoldOut = soldOutRaw === "true" || soldOutRaw === "1" || soldOutRaw === "yes" || soldOutRaw === "بله";

    const order = categoryOrderCounters.get(categoryId) ?? 0;
    categoryOrderCounters.set(categoryId, order + 1);

    try {
      await prisma.menuItem.create({
        data: {
          venueId,
          categoryId,
          nameFa,
          nameEn,
          description,
          priceToman,
          station: station || "kitchen",
          calories,
          visibleOnPublicMenu,
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

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({ results, summary: { total: results.length, created, skipped, errors } });
  } catch (e) {
    return errorResponse(e);
  }
}
