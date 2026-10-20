import { describe, expect, it } from "vitest";
import {
  ApiError,
  validateUserInput,
  validateVenueAssignment,
} from "../src/db";

function statusOf(callback: () => unknown): number {
  try {
    callback();
  } catch (error) {
    if (error instanceof ApiError) return error.status;
    throw error;
  }
  throw new Error("expected the callback to throw");
}

describe("user validation", () => {
  it("trims names and accepts 1..80 characters", () => {
    expect(validateUserInput({ name: "  علی  ", venueId: 3 })).toEqual({
      name: "علی",
      venueId: 3,
    });
    expect(validateUserInput({ name: "ا".repeat(80) }).name).toHaveLength(80);
    expect(validateUserInput({ name: "علی" })).toEqual({
      name: "علی",
      venueId: null,
    });
  });

  it("rejects empty, whitespace-only, long, and non-string names", () => {
    for (const name of ["", "   ", "ا".repeat(81), 12, null, undefined]) {
      expect(statusOf(() => validateUserInput({ name }))).toBe(400);
    }
  });

  it("rejects non-object payloads", () => {
    expect(statusOf(() => validateUserInput([]))).toBe(400);
    expect(statusOf(() => validateUserInput(null))).toBe(400);
  });

  it("accepts null or a positive venue id", () => {
    expect(validateVenueAssignment(undefined)).toBeNull();
    expect(validateVenueAssignment(null)).toBeNull();
    expect(validateVenueAssignment(1)).toBe(1);
    expect(validateVenueAssignment(Number.MAX_SAFE_INTEGER)).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it("rejects zero, negative, fractional, and non-number venue ids", () => {
    for (const venueId of [0, -1, 1.5, "2", Number.NaN, Infinity]) {
      expect(statusOf(() => validateVenueAssignment(venueId))).toBe(400);
    }
  });
});
