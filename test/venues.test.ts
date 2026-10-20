import { describe, expect, it } from "vitest";
import { ApiError, normalizeVenueSlug, validateVenueInput } from "../src/db";

function dataUri(type: string, bytes: number[]): string {
  return `data:image/${type};base64,${btoa(
    String.fromCharCode(...bytes),
  )}`;
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00];

function statusOf(callback: () => unknown): number {
  try {
    callback();
  } catch (error) {
    if (error instanceof ApiError) return error.status;
    throw error;
  }
  throw new Error("expected the callback to throw");
}

function validVenue(overrides: Record<string, unknown> = {}) {
  return {
    slug: "noghteh-cafe",
    nameFa: "کافه نقطه",
    ...overrides,
  };
}

describe("venue slug normalization", () => {
  it("trims and lowercases slugs", () => {
    expect(normalizeVenueSlug("  Noghteh-Cafe  ")).toBe("noghteh-cafe");
  });

  it("accepts 1 and 64 character slugs", () => {
    expect(normalizeVenueSlug("a")).toBe("a");
    expect(normalizeVenueSlug("a".repeat(64))).toHaveLength(64);
  });

  it("rejects empty, whitespace, non-string, and malformed slugs", () => {
    for (const value of [
      "",
      "   ",
      null,
      undefined,
      12,
      "has space",
      "under_score",
      "کافه",
      "-leading",
      "trailing-",
      "a".repeat(65),
    ]) {
      expect(statusOf(() => normalizeVenueSlug(value))).toBe(400);
    }
  });
});

describe("venue validation", () => {
  it("normalizes a full venue payload", () => {
    const logoDataUrl = dataUri("png", PNG);
    expect(
      validateVenueInput({
        slug: "  Noghteh-Cafe  ",
        nameFa: "  کافه نقطه  ",
        nameEn: "  Noghteh  ",
        welcomeMessage: "  خوش آمدید  ",
        metaDescription: null,
        logoDataUrl,
      }),
    ).toEqual({
      slug: "noghteh-cafe",
      nameFa: "کافه نقطه",
      nameEn: "Noghteh",
      welcomeMessage: "خوش آمدید",
      metaDescription: null,
      logoDataUrl,
    });
  });

  it("defaults missing optional fields to null", () => {
    expect(validateVenueInput({ slug: "cafe", nameFa: "کافه" })).toEqual({
      slug: "cafe",
      nameFa: "کافه",
      nameEn: null,
      welcomeMessage: null,
      metaDescription: null,
      logoDataUrl: null,
    });
  });

  it("requires a valid slug", () => {
    for (const payload of [
      { nameFa: "کافه" },
      { slug: "", nameFa: "کافه" },
      { slug: "  ", nameFa: "کافه" },
      { slug: "Not A Slug", nameFa: "کافه" },
      { slug: 12, nameFa: "کافه" },
    ]) {
      expect(statusOf(() => validateVenueInput(payload))).toBe(400);
    }
  });

  it("requires a name and enforces field lengths", () => {
    for (const overrides of [
      { nameFa: undefined },
      { nameFa: "" },
      { nameFa: "   " },
      { nameFa: "ا".repeat(121) },
      { nameFa: "کافه", nameEn: "a".repeat(121) },
      { nameFa: "کافه", welcomeMessage: "a".repeat(501) },
      { nameFa: "کافه", metaDescription: "a".repeat(301) },
    ]) {
      expect(statusOf(() => validateVenueInput(validVenue(overrides)))).toBe(
        400,
      );
    }
  });

  it("accepts the field limits", () => {
    const venue = validateVenueInput(
      validVenue({
        nameFa: "ا".repeat(120),
        nameEn: "a".repeat(120),
        welcomeMessage: "a".repeat(500),
        metaDescription: "a".repeat(300),
      }),
    );
    expect(venue.nameFa).toHaveLength(120);
    expect(venue.nameEn).toHaveLength(120);
    expect(venue.welcomeMessage).toHaveLength(500);
    expect(venue.metaDescription).toHaveLength(300);
  });

  it("accepts a PNG logo and rejects SVG", () => {
    const logoDataUrl = dataUri("png", PNG);
    expect(
      validateVenueInput(validVenue({ logoDataUrl })).logoDataUrl,
    ).toBe(logoDataUrl);
    expect(
      statusOf(() =>
        validateVenueInput(
          validVenue({
            logoDataUrl: dataUri("svg+xml", [0x3c, 0x73, 0x76, 0x67]),
          }),
        ),
      ),
    ).toBe(400);
  });
});
