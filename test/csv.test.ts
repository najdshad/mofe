import { describe, expect, it } from "vitest";
import { renderCsv } from "../src/render";
import type { Category, Item } from "../src/types";

const header =
  "category,name_fa,name_en,description,price_toman,sold_out,variant_name_fa,variant_name_en,variant_price_delta";

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 1,
    nameFa: "اسپرسو",
    nameEn: "Espresso",
    description: null,
    priceToman: 130_000,
    isSoldOut: false,
    sortOrder: 0,
    variants: [],
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 1,
    nameFa: "نوشیدنی",
    sortOrder: 0,
    items: [makeItem()],
    ...overrides,
  };
}

function rowsOf(csv: string): string[] {
  return csv.slice(1).split("\r\n").slice(1, -1);
}

describe("renderCsv", () => {
  it("starts with a BOM, uses CRLF, and emits the exact header", () => {
    const csv = renderCsv([]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toBe(`\uFEFF${header}\r\n`);
    expect(csv).not.toContain("\n\n");
  });

  it("writes one row per variant in category, item, and variant order", () => {
    const categories: Category[] = [
      makeCategory({
        id: 2,
        nameFa: "دوم",
        sortOrder: 2,
        items: [
          makeItem({
            id: 5,
            nameFa: "ب",
            sortOrder: 1,
            variants: [
              { id: 9, nameFa: "ز", nameEn: null, priceDelta: 0, sortOrder: 1 },
              { id: 8, nameFa: "الف", nameEn: "A", priceDelta: 10, sortOrder: 0 },
            ],
          }),
          makeItem({ id: 4, nameFa: "الف", sortOrder: 0 }),
        ],
      }),
      makeCategory({
        id: 1,
        nameFa: "اول",
        sortOrder: 1,
        items: [makeItem({ id: 1, nameFa: "تک" })],
      }),
      makeCategory({
        id: 3,
        nameFa: "خالی",
        sortOrder: 0,
        items: [],
      }),
    ];

    const rows = rowsOf(renderCsv(categories));

    expect(rows).toHaveLength(4);
    expect(rows[0]).toContain('"اول"');
    expect(rows[0]).toContain('"تک"');
    expect(rows[1]).toContain('"دوم"');
    expect(rows[1]).toContain('"الف"');
    expect(rows[2]).toContain('"ب"');
    expect(rows[2]).toContain('"الف","A",10');
    expect(rows[3]).toContain('"ب"');
    expect(rows[3]).toContain('"ز","",0');
    expect(rows.every((row) => row.includes('"خالی"') === false)).toBe(true);
  });

  it("leaves variant columns empty for items without variants", () => {
    const [row] = rowsOf(renderCsv([makeCategory()]));
    expect(row.endsWith(',"","",')).toBe(true);
  });

  it("quotes text fields, doubles quotes, and keeps prices as integers", () => {
    const [row] = rowsOf(
      renderCsv([
        makeCategory({
          nameFa: "گرم, سرد",
          items: [
            makeItem({
              nameFa: 'لاته "ویژه"',
              nameEn: "Latte",
              description: "خط اول\nخط دوم",
              priceToman: 195_000,
              isSoldOut: true,
            }),
          ],
        }),
      ]),
    );

    expect(row).toContain('"گرم, سرد"');
    expect(row).toContain('"لاته ""ویژه"""');
    expect(row).toContain('"خط اول\nخط دوم"');
    expect(row).toContain(",195000,1,");
    expect(row).not.toContain('"195000"');
  });

  it("prefixes formula-like text cells with an apostrophe", () => {
    const rows = rowsOf(
      renderCsv([
        makeCategory({
          nameFa: "=CAT",
          items: [
            makeItem({
              nameFa: "+item",
              nameEn: "-en",
              description: "@desc",
              variants: [
                {
                  id: 1,
                  nameFa: "\tvari",
                  nameEn: "\rname",
                  priceDelta: 5,
                  sortOrder: 0,
                },
              ],
            }),
          ],
        }),
      ]),
    );

    expect(rows[0]).toContain(`"'=CAT"`);
    expect(rows[0]).toContain(`"'+item"`);
    expect(rows[0]).toContain(`"'-en"`);
    expect(rows[0]).toContain(`"'@desc"`);
    expect(rows[0]).toContain(`"'\tvari"`);
    expect(rows[0]).toContain(`"'\rname"`);
    expect(rows[0]).toContain(",5");
  });

  it("does not prefix prices, deltas, or sold-out flags", () => {
    const rows = rowsOf(
      renderCsv([
        makeCategory({
          items: [
            makeItem({
              priceToman: 10,
              isSoldOut: true,
              variants: [
                {
                  id: 1,
                  nameFa: "v",
                  nameEn: null,
                  priceDelta: -5,
                  sortOrder: 0,
                },
              ],
            }),
          ],
        }),
      ]),
    );

    expect(rows[0]).toContain(",10,1,");
    expect(rows[0].endsWith(",-5")).toBe(true);
  });

  it("writes sold-out as 1 and available as 0", () => {
    const rows = rowsOf(
      renderCsv([
        makeCategory({
          items: [
            makeItem({ id: 1, nameFa: "موجود", sortOrder: 0 }),
            makeItem({ id: 2, nameFa: "ناموجود", sortOrder: 1, isSoldOut: true }),
          ],
        }),
      ]),
    );

    expect(rows[0]).toContain(",0,");
    expect(rows[1]).toContain(",1,");
  });
});
