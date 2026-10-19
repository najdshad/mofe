import { describe, expect, it } from "vitest";
import {
  ApiError,
  assertExactSet,
  validateCategoryInput,
  validateItemInput,
  validateLogo,
  validateReorderIds,
  validateSettings,
} from "../src/db";

function dataUri(type: string, bytes: number[]): string {
  return `data:image/${type};base64,${btoa(
    String.fromCharCode(...bytes),
  )}`;
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00];
const WEBP = [
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00];

function statusOf(callback: () => unknown): number {
  try {
    callback();
  } catch (error) {
    if (error instanceof ApiError) return error.status;
    throw error;
  }
  throw new Error("expected the callback to throw");
}

function validItem(overrides: Record<string, unknown> = {}) {
  return {
    categoryId: 1,
    nameFa: "  اسپرسو  ",
    nameEn: "Espresso",
    description: "توضیح",
    priceToman: 130_000,
    isSoldOut: false,
    variants: [{ nameFa: "دبل", nameEn: "Double", priceDelta: 30_000 }],
    ...overrides,
  };
}

describe("category validation", () => {
  it("trims names and accepts 1..80 characters", () => {
    expect(validateCategoryInput({ nameFa: "  اسپرسو  " })).toBe("اسپرسو");
    expect(validateCategoryInput({ nameFa: "ا".repeat(80) })).toHaveLength(80);
  });

  it("rejects empty, whitespace-only, long, and non-string names", () => {
    for (const nameFa of ["", "   ", "ا".repeat(81), 12, null, undefined]) {
      expect(statusOf(() => validateCategoryInput({ nameFa }))).toBe(400);
    }
  });

  it("rejects a non-object payload", () => {
    expect(statusOf(() => validateCategoryInput([]))).toBe(400);
    expect(statusOf(() => validateCategoryInput(null))).toBe(400);
  });
});

describe("settings validation", () => {
  it("trims values and normalizes empty optionals to null", () => {
    const settings = validateSettings({
      nameFa: "  کافه نقطه  ",
      nameEn: "  Noghteh  ",
      welcomeMessage: "   ",
      metaDescription: null,
      logoDataUrl: dataUri("png", PNG),
    });

    expect(settings).toEqual({
      nameFa: "کافه نقطه",
      nameEn: "Noghteh",
      welcomeMessage: null,
      metaDescription: null,
      logoDataUrl: dataUri("png", PNG),
    });
  });

  it("accepts missing optional fields", () => {
    expect(validateSettings({ nameFa: "کافه" })).toEqual({
      nameFa: "کافه",
      nameEn: null,
      welcomeMessage: null,
      metaDescription: null,
      logoDataUrl: null,
    });
  });

  it("enforces field lengths", () => {
    expect(
      statusOf(() => validateSettings({ nameFa: "ا".repeat(121) })),
    ).toBe(400);
    expect(
      statusOf(() =>
        validateSettings({ nameFa: "کافه", nameEn: "a".repeat(121) }),
      ),
    ).toBe(400);
    expect(
      statusOf(() =>
        validateSettings({ nameFa: "کافه", welcomeMessage: "a".repeat(501) }),
      ),
    ).toBe(400);
    expect(
      statusOf(() =>
        validateSettings({ nameFa: "کافه", metaDescription: "a".repeat(301) }),
      ),
    ).toBe(400);
  });

  it("requires a name", () => {
    expect(statusOf(() => validateSettings({ nameFa: "" }))).toBe(400);
    expect(statusOf(() => validateSettings({}))).toBe(400);
  });
});

describe("logo validation", () => {
  it("accepts WebP, PNG, and JPEG magic bytes", () => {
    expect(validateLogo(dataUri("webp", WEBP))).toBe(dataUri("webp", WEBP));
    expect(validateLogo(dataUri("png", PNG))).toBe(dataUri("png", PNG));
    expect(validateLogo(dataUri("jpeg", JPEG))).toBe(dataUri("jpeg", JPEG));
    expect(validateLogo(null)).toBeNull();
    expect(validateLogo("")).toBeNull();
  });

  it("rejects SVG, GIF, and arbitrary data URIs", () => {
    for (const logo of [
      dataUri("svg+xml", [0x3c, 0x73, 0x76, 0x67]),
      dataUri("gif", [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
      "data:text/plain;base64,SGVsbG8=",
      "not-a-data-uri",
      "data:image/png;base64,not base64!",
    ]) {
      expect(statusOf(() => validateLogo(logo))).toBe(400);
    }
  });

  it("rejects magic bytes that do not match the declared type", () => {
    expect(statusOf(() => validateLogo(dataUri("png", JPEG)))).toBe(400);
    expect(statusOf(() => validateLogo(dataUri("jpeg", PNG)))).toBe(400);
    expect(statusOf(() => validateLogo(dataUri("webp", PNG)))).toBe(400);
  });

  it("rejects oversized data URIs", () => {
    const logo = `data:image/png;base64,${"A".repeat(200_000)}`;
    expect(statusOf(() => validateLogo(logo))).toBe(400);
  });

  it("rejects non-string values", () => {
    expect(statusOf(() => validateLogo(42))).toBe(400);
  });
});

describe("item validation", () => {
  it("trims fields and returns a normalized payload", () => {
    expect(validateItemInput(validItem())).toEqual({
      categoryId: 1,
      nameFa: "اسپرسو",
      nameEn: "Espresso",
      description: "توضیح",
      priceToman: 130_000,
      isSoldOut: false,
      variants: [{ nameFa: "دبل", nameEn: "Double", priceDelta: 30_000 }],
    });
  });

  it("allows missing variants and optional text", () => {
    const item = validateItemInput({
      categoryId: 2,
      nameFa: "چای",
      priceToman: 0,
      isSoldOut: true,
    });
    expect(item.variants).toEqual([]);
    expect(item.nameEn).toBeNull();
    expect(item.description).toBeNull();
  });

  it("enforces item field limits", () => {
    const cases = [
      { nameFa: "a".repeat(201) },
      { nameFa: "" },
      { nameEn: "a".repeat(201) },
      { description: "a".repeat(1001) },
      { priceToman: -1 },
      { priceToman: 1.5 },
      { priceToman: 1_000_000_001 },
      { priceToman: "100" },
      { isSoldOut: "no" },
      { categoryId: 0 },
      { categoryId: -2 },
      { categoryId: 1.2 },
    ];
    for (const overrides of cases) {
      expect(statusOf(() => validateItemInput(validItem(overrides)))).toBe(
        400,
      );
    }
  });

  it("enforces variant limits", () => {
    const variant = { nameFa: "دبل", nameEn: "Double", priceDelta: 0 };
    const variants = Array.from({ length: 11 }, () => variant);
    expect(statusOf(() => validateItemInput(validItem({ variants })))).toBe(
      400,
    );

    for (const bad of [
      { nameFa: "", priceDelta: 0 },
      { nameFa: "a".repeat(101), priceDelta: 0 },
      { nameFa: "دبل", nameEn: "a".repeat(101), priceDelta: 0 },
      { nameFa: "دبل", priceDelta: 1_000_000_001 },
      { nameFa: "دبل", priceDelta: -1_000_000_001 },
      { nameFa: "دبل", priceDelta: 1.5 },
    ]) {
      expect(
        statusOf(() =>
          validateItemInput(validItem({ variants: [bad] })),
        ),
      ).toBe(400);
    }

    expect(
      statusOf(() =>
        validateItemInput(validItem({ variants: "not-an-array" })),
      ),
    ).toBe(400);
  });

  it("accepts ten variants and the price bounds", () => {
    const variants = Array.from({ length: 10 }, (_, index) => ({
      nameFa: `گزینه ${index}`,
      nameEn: null,
      priceDelta: index % 2 === 0 ? 1_000_000_000 : -1_000_000_000,
    }));
    expect(
      validateItemInput(
        validItem({ variants, priceToman: 1_000_000_000 }),
      ).variants,
    ).toHaveLength(10);
  });
});

describe("reorder validation", () => {
  it("accepts unique positive safe integers", () => {
    expect(validateReorderIds([3, 1, 2])).toEqual([3, 1, 2]);
    expect(validateReorderIds([])).toEqual([]);
  });

  it("rejects duplicates and invalid ids", () => {
    for (const ids of [
      [1, 1],
      [0],
      [-1],
      [1.5],
      ["1"],
      [Number.MAX_SAFE_INTEGER + 1],
      "nope",
    ]) {
      expect(statusOf(() => validateReorderIds(ids))).toBe(400);
    }
  });

  it("accepts an exact set match in any order", () => {
    expect(() => assertExactSet([1, 2, 3], [3, 1, 2])).not.toThrow();
    expect(() => assertExactSet([], [])).not.toThrow();
  });

  it("rejects missing, extra, and mismatched sets with 409", () => {
    expect(statusOf(() => assertExactSet([1, 2, 3], [1, 2]))).toBe(409);
    expect(statusOf(() => assertExactSet([1, 2, 3], [1, 2, 3, 4]))).toBe(409);
    expect(statusOf(() => assertExactSet([1, 2, 3], [1, 2, 4]))).toBe(409);
    expect(statusOf(() => assertExactSet([1, 2, 3], [1, 1, 2]))).toBe(409);
  });
});
