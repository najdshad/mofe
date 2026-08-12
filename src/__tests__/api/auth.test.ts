import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { cleanTestData, seedTestData } from "../helpers";
import { prisma } from "@/lib/prisma";

const mockCookieSet = vi.fn();
const mockCookieGet = vi.fn();
const mockCookieDelete = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({
    set: mockCookieSet,
    get: mockCookieGet,
    delete: mockCookieDelete,
  })),
  headers: vi.fn(() => Promise.resolve(new Map())),
}));

vi.mock("@/lib/csrf", () => ({
  validateCsrf: vi.fn().mockResolvedValue(undefined),
  generateCsrfToken: vi.fn(),
  setCsrfCookie: vi.fn(),
}));

function jsonReq(body: unknown): Request {
  return new Request("http://localhost/api/auth/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  await cleanTestData();
  await seedTestData();
});

beforeEach(() => {
  mockCookieSet.mockClear();
  mockCookieGet.mockClear();
  mockCookieDelete.mockClear();
});

describe("POST /api/auth/login", () => {
  it("returns 400 when email is missing", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(jsonReq({ password: "demo1234" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("نام کاربری و رمز عبور الزامی است");
  });

  it("returns 400 when password is missing", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(jsonReq({ email: "admin@test.ir" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(jsonReq({ email: "not-an-email", password: "demo1234" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("نام کاربری نامعتبر است");
  });

  it("returns 401 for wrong password", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(jsonReq({ email: "admin@test.ir", password: "wrongpassword" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("نام کاربری یا رمز عبور اشتباه است");
  });

  it("returns 401 for non-existent user", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(jsonReq({ email: "nonexistent@test.ir", password: "demo1234" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 for successful login", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(jsonReq({ email: "admin@test.ir", password: "demo1234" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });
});

describe("POST /api/auth/logout", () => {
  it("revokes the session and deletes the cookie", async () => {
    const { generateToken, hashToken } = await import("@/lib/auth");
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@test.ir" } });
    const token = generateToken();
    const session = await prisma.session.create({
      data: {
        userId: admin.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    mockCookieGet.mockReturnValue({ value: token });

    const { POST } = await import("@/app/api/auth/logout/route");
    const req = new Request("http://localhost/api/auth/logout", { method: "POST" });
    const res = await POST(req as never);
    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toContain("/login");

    expect(mockCookieDelete).toHaveBeenCalledWith("mofe_session");

    const revoked = await prisma.session.findUnique({ where: { id: session.id } });
    expect(revoked?.revokedAt).not.toBeNull();

    await prisma.session.delete({ where: { id: session.id } });
  });

  it("redirects to login when no session exists", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const { POST } = await import("@/app/api/auth/logout/route");
    const req = new Request("http://localhost/api/auth/logout", { method: "POST" });
    const res = await POST(req as never);
    expect(res.status).toBe(307);
    const location = res.headers.get("Location") || "";
    expect(location).toContain("/login");
  });
});
