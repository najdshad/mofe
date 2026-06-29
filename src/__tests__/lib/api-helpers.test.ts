import { describe, it, expect } from "vitest";
import { ApiError, errorResponse } from "@/lib/api-helpers";

describe("ApiError", () => {
  it("defaults to status 400", () => {
    const err = new ApiError("bad request");
    expect(err.message).toBe("bad request");
    expect(err.status).toBe(400);
    expect(err.name).toBe("ApiError");
  });

  it("accepts a custom status code", () => {
    const err = new ApiError("not found", 404);
    expect(err.status).toBe(404);
  });

  it("is an instance of Error", () => {
    const err = new ApiError("test");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("errorResponse", () => {
  it("returns ApiError status and message", async () => {
    const res = errorResponse(new ApiError("validation failed", 422));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toEqual({ error: "validation failed" });
  });

  it("returns 401 for ApiError with 401", async () => {
    const res = errorResponse(new ApiError("Unauthorized", 401));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("maps plain Error starting with 'Unauthorized' to 500 (no string-based status)", async () => {
    const res = errorResponse(new Error("Unauthorized: no access to this venue"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
  });

  it("maps plain Error starting with 'Forbidden' to 500 (no string-based status)", async () => {
    const res = errorResponse(new Error("Forbidden: requires role owner"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
  });

  it("maps generic Error to 500", async () => {
    const res = errorResponse(new Error("database connection failed"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal server error" });
  });

  it("maps non-Error throws to 500", async () => {
    const res = errorResponse("string crash");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal server error" });
  });

  it("maps null to 500", async () => {
    const res = errorResponse(null);
    expect(res.status).toBe(500);
  });

  it("maps undefined to 500", async () => {
    const res = errorResponse(undefined);
    expect(res.status).toBe(500);
  });

  it("preserves the exact message for non-prefixed errors", async () => {
    const res = errorResponse(new Error("Custom error message"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
  });
});
