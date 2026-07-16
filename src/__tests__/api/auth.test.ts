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
  it("redirects to login on successful logout", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    const req = new Request("http://localhost/api/auth/logout", { method: "POST" });
    (req as unknown as Record<string, unknown>).cookies = { get: () => undefined };
    const res = await POST(req as never);
    expect(res.status).toBe(307);
    const location = res.headers.get("Location") || "";
    expect(location).toContain("/login");
  });
});

describe("POST /api/auth/signup", () => {
  const signupPayload = {
    name: "کاربر جدید",
    email: `newuser-${Date.now()}@test.ir`,
    password: "password123",
    cafeName: "کافه جدید",
    phone: "09120000000",
  };

  it("returns 400 when name is missing", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const res = await POST(jsonReq({ email: "test@test.ir", password: "password123", cafeName: "cafe" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("نام الزامی است");
  });

  it("returns 400 for invalid email format", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const res = await POST(jsonReq({ name: "Test", email: "invalid", password: "password123", cafeName: "cafe" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("ایمیل نامعتبر است");
  });

  it("returns 400 for weak password", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const res = await POST(jsonReq({ name: "Test", email: "test@test.ir", password: "short", cafeName: "cafe" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("رمز عبور باید حداقل ۸ کاراکتر باشد");
  });

  it("returns 400 when cafeName is missing", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const res = await POST(jsonReq({ name: "Test", email: "test@test.ir", password: "password123" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("نام کافه الزامی است");
  });

  it("returns 201 on successful signup", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const res = await POST(jsonReq(signupPayload));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.venueId).toBeTruthy();

    const user = await prisma.user.findUnique({ where: { email: signupPayload.email } });
    expect(user).not.toBeNull();
    expect(user!.phone).toBe("09120000000");

    await prisma.passwordResetToken.deleteMany({ where: { user: { id: user!.id } } });
    await prisma.session.deleteMany({ where: { userId: user!.id } });
    await prisma.venueMember.deleteMany({ where: { userId: user!.id } });
    await prisma.subscription.deleteMany({ where: { venue: { members: { some: { userId: user!.id } } } } });
    await prisma.venue.deleteMany({ where: { members: { some: { userId: user!.id } } } });
    await prisma.user.delete({ where: { id: user!.id } });
  });

  it("returns 200 for duplicate email (idempotent)", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const res = await POST(jsonReq({ name: "مدیر تست", email: "admin@test.ir", password: "demo1234", cafeName: "کافه" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
