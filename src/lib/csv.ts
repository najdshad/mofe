export const BOM = "\uFEFF";

const FORMULA_INJECTION_RE = /^[=+\-@\t]/;

export function sanitizeCsvField(value: string): string {
  if (FORMULA_INJECTION_RE.test(value)) {
    return "'" + value;
  }
  return value;
}

export const MENU_CSV_HEADERS = [  "nameFa",
  "nameEn",
  "categoryNameFa",
  "priceToman",
  "description",
  "calories",
  "isSoldOut",
  "allergenCodes",
  "variants",
  "prices",
] as const;

export interface CsvVariant {
  nameFa: string;
  nameEn: string | null;
  priceModifier: number;
}

export interface CsvPrice {
  description: string;
  priceToman: number;
}

export function serializeAllergenCodes(codes: string[]): string {
  return codes.join("|");
}

export function serializeVariants(variants: CsvVariant[]): string {
  return variants
    .map((v) => [v.nameFa, v.nameEn ?? "", String(v.priceModifier)].join("|"))
    .join(";");
}

export function serializePrices(prices: CsvPrice[]): string {
  return prices.map((p) => [p.description, String(p.priceToman)].join("|")).join(";");
}

// ponytail: `|`/`;` are reserved separators, no escaping — dish text rarely contains them.
export function parseAllergenCodes(cell: string | undefined | null): string[] {
  if (!cell) return [];
  return cell.split("|").map((s) => s.trim()).filter(Boolean);
}

export function parseVariants(cell: string | undefined | null): { variants: CsvVariant[]; error?: string } {
  if (!cell || !cell.trim()) return { variants: [] };
  const variants: CsvVariant[] = [];
  for (const entry of cell.split(";")) {
    const parts = entry.split("|").map((s) => s.trim());
    const nameFa = sanitizeCsvField(parts[0] ?? "");
    if (!nameFa) return { variants: [], error: "نام گونه خالی است" };
    const nameEn = parts[1] ? sanitizeCsvField(parts[1]) : null;
    const rawMod = (parts[2] ?? "0").replace(/[,\s]/g, "");
    let priceModifier = parseInt(rawMod, 10);
    if (isNaN(priceModifier)) priceModifier = 0;
    variants.push({ nameFa, nameEn: nameEn || null, priceModifier });
  }
  return { variants };
}

export function parsePrices(cell: string | undefined | null): { prices: CsvPrice[]; error?: string } {
  if (!cell || !cell.trim()) return { prices: [] };
  const prices: CsvPrice[] = [];
  for (const entry of cell.split(";")) {
    const parts = entry.split("|").map((s) => s.trim());
    const description = sanitizeCsvField(parts[0] ?? "");
    if (!description) return { prices: [], error: "توضیح قیمت خالی است" };
    const priceToman = parseInt((parts[1] ?? "").replace(/[,\s]/g, ""), 10);
    if (isNaN(priceToman) || priceToman < 0) return { prices: [], error: "قیمت نامعتبر است" };
    prices.push({ description, priceToman });
  }
  return { prices };
}
function quoteCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(headers: string[], rows: string[][]): string {
  const line = (cells: string[]) => cells.map((cell) => quoteCell(sanitizeCsvField(cell))).join(",");
  return BOM + line(headers) + "\n" + rows.map(line).join("\n");
}