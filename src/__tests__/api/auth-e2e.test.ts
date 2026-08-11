import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { cleanTestData, seedTestData } from "../helpers";
import { prisma } from "@/lib/prisma";

const { cookieStore, headerMap } = vi.hoisted(() => ({
  cookieStore: new Map<string, string>(),
  headerMap: new Map<string, string>(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: (name: string) => {
        const value = cookieStore.get(name);
        return value !== undefined ? { name, value } : undefined;
      },
      set: (name: string, value: string) => {
        cookieStore.set(name, value);
      },
      delete: (name: string) => {
        cookieStore.delete(name);
      },
    })
  ),
  headers: vi.fn(() => Promise.resolve({ get: (name: string) => headerMap.get(name) ?? null })),
}));

let data: Awaited<ReturnType<typeof seedTestData>>;

beforeAll(async () => {
  await cleanTestData();
  data = await seedTestData();
});

beforeEach(() => {
  cookieStore.clear();
  headerMap.clear();
});

afterEach(async () => {
  await prisma.session.deleteMany({ where: { userId: data.user.id } });
});

function jsonReq(url: string, method = "GET", body?: unknown): Request {
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  return new Request(url, opts);
}

describe("End-to-end auth (real requireAuth via DB session)", () => {
  it("login creates a session; subsequent API call authenticates through it", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const loginRes = await POST(jsonReq("http://localhost/api/auth/login", "POST", {
      email: "admin@test.ir",
      password: "demo1234",
    }));
    expect(loginRes.status).toBe(200);

    const sessionToken = cookieStore.get("mofe_session");
    expect(sessionToken).toBeTruthy();

    const { GET } = await import("@/app/api/venues/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.some((v: { id: string }) => v.id === data.venue.id)).toBe(true);
  });

  it("returns 401 when no session cookie exists", async () => {
    const { GET } = await import("@/app/api/venues/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 when the session is revoked", async () => {
    const { generateToken, hashToken } = await import("@/lib/auth");
    const token = generateToken();
    await prisma.session.create({
      data: {
        userId: data.user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: new Date(),
      },
    });
    cookieStore.set("mofe_session", token);

    const { GET } = await import("@/app/api/venues/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 when the session has expired", async () => {
    const { generateToken, hashToken } = await import("@/lib/auth");
    const token = generateToken();
    await prisma.session.create({
      data: {
        userId: data.user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() - 3600000),
      },
    });
    cookieStore.set("mofe_session", token);

    const { GET } = await import("@/app/api/venues/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("CSRF enforcement on mutation routes (real validateCsrf)", () => {
  it("rejects a mutation without a matching CSRF header", async () => {
    const { generateToken, hashToken } = await import("@/lib/auth");
    const token = generateToken();
    await prisma.session.create({
      data: {
        userId: data.user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    cookieStore.set("mofe_session", token);

    const { PATCH } = await import("@/app/api/venues/[venueId]/items/[itemId]/route");
    const res = await PATCH(
      jsonReq(`http://localhost/api/venues/${data.venue.id}/items/${data.items.item1.id}`, "PATCH", { priceToman: 50000 }),
      { params: Promise.resolve({ venueId: data.venue.id, itemId: data.items.item1.id }) }
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("CSRF token validation failed");
  });

  it("allows a mutation with a matching CSRF cookie and header", async () => {
    const { generateToken, hashToken } = await import("@/lib/auth");
    const token = generateToken();
    await prisma.session.create({
      data: {
        userId: data.user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    cookieStore.set("mofe_session", token);
    cookieStore.set("mofe_csrf", "shared-token");
    headerMap.set("X-CSRF-Token", "shared-token");

    const { PATCH } = await import("@/app/api/venues/[venueId]/items/[itemId]/route");
    const res = await PATCH(
      jsonReq(`http://localhost/api/venues/${data.venue.id}/items/${data.items.item1.id}`, "PATCH", { priceToman: 50000 }),
      { params: Promise.resolve({ venueId: data.venue.id, itemId: data.items.item1.id }) }
    );
    expect(res.status).toBe(200);
  });
});
