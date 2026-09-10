import Papa from "papaparse";
import {
  parseAllergenCodes,
  parsePrices,
  parseVariants,
  sanitizeCsvField,
  type CsvPrice,
  type CsvVariant,
} from "@/lib/csv";
import { ALLERGEN_CODES } from "@/lib/allergens";

export interface MenuRowData {
  nameFa: string;
  nameEn: string | null;
  categoryNameFa: string;
  priceToman: number;
  description: string | null;
  calories: number | null;
  isSoldOut: boolean;
  allergenCodes: string[];
  variants: CsvVariant[];
  prices: CsvPrice[];
}

export interface ValidMenuRow {
  rowNum: number;
  data: MenuRowData;
}

export interface InvalidMenuRow {
  row: number;
  status: "skipped";
  nameFa: string;
  message: string;
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

function parseSoldOut(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "بله";
}

/** Parse + validate CSV text. Structural problems come back as `error`; per-row problems as `invalid`. */
export function parseMenuCsv(csvText: string): {
  valid: ValidMenuRow[];
  invalid: InvalidMenuRow[];
  categoryNames: string[]; // unique, first-seen order
  error?: string;
} {
  const empty = { valid: [], invalid: [], categoryNames: [] };
  if (!csvText || typeof csvText !== "string" || csvText.trim().length === 0) {
    return { ...empty, error: "محتوای CSV ارسال نشده" };
  }

  const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
  const rows = parsed.data;
  if (rows.length < 2) {
    return { ...empty, error: "فایل CSV حداقل باید شامل هدر و یک سطر داده باشد" };
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
  const idxDescription = findHeaderIndex(headers, "description", "توضیحات");
  const idxCalories = findHeaderIndex(headers, "calories", "کالری");
  const idxSoldOut = findHeaderIndex(headers, "issoldout", "is_sold_out", "soldout", "sold_out", "ناموجود");
  const idxAllergens = findHeaderIndex(headers, "allergencodes", "allergen_codes", "allergens", "آلرژن", "آلرژی");
  const idxVariants = findHeaderIndex(headers, "variants", "گونه‌ها", "گونهها", "اندازه‌ها", "اندازهها");
  const idxPrices = findHeaderIndex(headers, "prices", "قیمت‌ها", "قیمتها");

  if (idxNameFa === -1) return { ...empty, error: "ستون nameFa (نام فارسی) در CSV یافت نشد" };
  if (idxCategory === -1) return { ...empty, error: "ستون categoryFa (دسته) در CSV یافت نشد" };
  if (idxPrice === -1) return { ...empty, error: "ستون priceToman (قیمت) در CSV یافت نشد" };

  const valid: ValidMenuRow[] = [];
  const invalid: InvalidMenuRow[] = [];
  const categoryNames: string[] = [];
  const seenCategories = new Set<string>();

  dataRows.forEach((row, i) => {
    const rowNum = i + 2;
    const skip = (nameFa: string, message: string) =>
      invalid.push({ row: rowNum, status: "skipped", nameFa, message });

    const nameFa = sanitizeCsvField(row[idxNameFa]?.trim() ?? "");
    if (!nameFa) return skip("", "نام فارسی خالی است");

    const categoryNameFa = row[idxCategory]?.trim() ?? "";
    if (!categoryNameFa) return skip(nameFa, "نام دسته خالی است");

    const priceRaw = row[idxPrice]?.trim().replace(/[,\s]/g, "") ?? "";
    let priceToman = parseInt(priceRaw, 10);
    if (isNaN(priceToman)) priceToman = 0;
    if (priceToman < 0) return skip(nameFa, "قیمت نامعتبر است");

    const allergenCodes =
      idxAllergens !== -1 ? parseAllergenCodes(row[idxAllergens]?.trim() ?? "") : [];
    const invalidAllergen = allergenCodes.find((c) => !ALLERGEN_CODES.includes(c.toLowerCase()));
    if (invalidAllergen) return skip(nameFa, `کد آلرژن نامعتبر است: ${invalidAllergen}`);

    const { variants, error: variantsError } =
      idxVariants !== -1 ? parseVariants(row[idxVariants]?.trim() ?? "") : { variants: [] };
    if (variantsError) return skip(nameFa, variantsError);

    const { prices, error: pricesError } =
      idxPrices !== -1 ? parsePrices(row[idxPrices]?.trim() ?? "") : { prices: [] };
    if (pricesError) return skip(nameFa, pricesError);

    const caloriesRaw = idxCalories !== -1 ? row[idxCalories]?.trim() : null;

    const catKey = categoryNameFa.toLowerCase();
    if (!seenCategories.has(catKey)) {
      seenCategories.add(catKey);
      categoryNames.push(categoryNameFa);
    }

    valid.push({
      rowNum,
      data: {
        nameFa,
        nameEn: idxNameEn !== -1 ? sanitizeCsvField(row[idxNameEn]?.trim() ?? "") || null : null,
        categoryNameFa,
        priceToman,
        description: idxDescription !== -1 ? sanitizeCsvField(row[idxDescription]?.trim() ?? "") || null : null,
        calories: caloriesRaw ? parseInt(caloriesRaw, 10) || null : null,
        isSoldOut: idxSoldOut !== -1 ? parseSoldOut(row[idxSoldOut]) : false,
        allergenCodes: allergenCodes.map((c) => c.toLowerCase()),
        variants,
        prices,
      },
    });
  });

  return { valid, invalid, categoryNames };
}
