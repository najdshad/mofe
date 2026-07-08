import { describe, it, expect } from "vitest";
import { toPersianDate, formatCurrency } from "@/app/admin/[venueId]/sales/SalesClient";

describe("toPersianDate", () => {
  it("converts Gregorian date to Persian (Jalaali) date", () => {
    // 2026-06-01 Gregorian = 1405/03/11 Persian
    expect(toPersianDate("2026-06-01")).toBe("1405/03/11");
  });

  it("converts Farvardin (spring) dates correctly", () => {
    // 2026-03-21 = 1405/01/01 (Persian New Year)
    expect(toPersianDate("2026-03-21")).toBe("1405/01/01");
  });

  it("converts Esfand (winter) dates correctly", () => {
    // 2026-03-20 = 1404/12/29 (last day of year 1404)
    expect(toPersianDate("2026-03-20")).toBe("1404/12/29");
  });

  it("pads months and days with leading zeros", () => {
    // 2026-07-01 = 1405/04/10
    expect(toPersianDate("2026-07-01")).toBe("1405/04/10");
  });

  it("handles single-digit months and days", () => {
    // 2026-04-05 = 1405/01/16
    expect(toPersianDate("2026-04-05")).toBe("1405/01/16");
  });



  it("handles leap year edge cases", () => {
    // 2025-03-20 = 1403/12/30 (leap year has 30 days in Esfand)
    expect(toPersianDate("2025-03-20")).toBe("1403/12/30");
  });
});

describe("formatCurrency", () => {
  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("۰");
  });

  it("formats small numbers", () => {
    expect(formatCurrency(5)).toBe("۵");
  });

  it("formats thousands with Persian digits", () => {
    expect(formatCurrency(1000)).toBe("۱٬۰۰۰");
  });

  it("formats tens of thousands", () => {
    const result = formatCurrency(75000);
    expect(result).toMatch(/۷۵[,٬]?۰۰۰/);
    expect(result).toContain("۷۵");
  });

  it("formats hundreds of thousands", () => {
    const result = formatCurrency(150000);
    expect(result).toContain("۱۵۰");
    expect(result).toMatch(/۱۵۰[,٬]?۰۰۰/);
  });

  it("formats millions", () => {
    expect(formatCurrency(1000000)).toBe("۱٬۰۰۰٬۰۰۰");
  });

  it("formats large numbers correctly", () => {
    expect(formatCurrency(123456789)).toBe("۱۲۳٬۴۵۶٬۷۸۹");
  });
});
