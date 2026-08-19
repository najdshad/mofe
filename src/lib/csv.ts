export const BOM = "\uFEFF";

const FORMULA_INJECTION_RE = /^[=+\-@\t]/;

export function sanitizeCsvField(value: string): string {
  if (FORMULA_INJECTION_RE.test(value)) {
    return "'" + value;
  }
  return value;
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