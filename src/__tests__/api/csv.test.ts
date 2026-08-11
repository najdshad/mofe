import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { cleanTestData, seedTestData } from "../helpers";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/api-helpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-helpers")>("@/lib/api-helpers");
  return { ...actual, requireAuth: vi.fn() };
});

vi.mock("@/lib/permissions", () => ({
  requireVenueAccess: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  validateCsrf: vi.fn().mockResolvedValue(undefined),
}));

import { requireAuth } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { ApiError } from "@/lib/api-helpers";
import { GET as getTemplate } from "@/app/api/venues/[venueId]/items/csv-template/route";
import { GET as exportCsv } from "@/app/api/venues/[venueId]/items/export-csv/route";
import { POST as importCsv } from "@/app/api/venues/[venueId]/items/import-csv/route";

let data: Awaited<ReturnType<typeof seedTestData>>;

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;

function params(venueId: string) {
  return { params: Promise.resolve({ venueId }) };
}

function jsonReq(venueId: string, method = "GET", body?: unknown): Request {
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  return new Request(`http://localhost/api/venues/${venueId}/items`, opts);
}

beforeAll(async () => {
  await cleanTestData();
  data = await seedTestData();
});

beforeEach(() => {
  mockRequireAuth.mockReset();
  mockRequireVenueAccess.mockReset();
  mockRequireAuth.mockResolvedValue(data.user);
  mockRequireVenueAccess.mockResolvedValue({ userId: data.user.id, venueId: data.venue.id });
});

describe("GET /items/csv-template", () => {
  it("returns headers and an example row with BOM and attachment disposition", async () => {
    const res = await getTemplate(jsonReq(data.venue.id), params(data.venue.id));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain(`menu-template-${data.venue.id}.csv`);

    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    const csv = new TextDecoder().decode(bytes);
    expect(csv).toContain("nameFa,nameEn,categoryNameFa,priceToman,description,calories,isSoldOut");
    expect(csv).toContain("پیتزا مخلوط");
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await getTemplate(jsonReq(data.venue.id), params(data.venue.id));
    expect(res.status).toBe(401);
  });
});

describe("GET /items/export-csv", () => {
  it("exports visible items with BOM and headers", async () => {
    const res = await exportCsv(jsonReq(data.venue.id), params(data.venue.id));
    expect(res.status).toBe(200);
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    const csv = new TextDecoder().decode(bytes);
    expect(csv).toContain("nameFa,nameEn,categoryNameFa,priceToman,description,calories,isSoldOut");
    expect(csv).toContain("چای نعناع");
    expect(csv).toContain("75000");
    expect(csv).toContain("نوشیدنی‌های گرم");
  });

  it("excludes soft-deleted items", async () => {
    const ghost = await prisma.menuItem.create({
      data: {
        venueId: data.venue.id,
        categoryId: data.categories.cat1.id,
        nameFa: "آیتم حذف‌شده",
        priceToman: 1000,
        displayOrder: 86,
        deletedAt: new Date(),
      },
    });

    try {
      const res = await exportCsv(jsonReq(data.venue.id), params(data.venue.id));
      const csv = await res.text();
      expect(csv).not.toContain("آیتم حذف‌شده");
    } finally {
      await prisma.menuItem.delete({ where: { id: ghost.id } });
    }
  });

  it("prefixes formula-injection cells with a quote", async () => {
    await prisma.menuItem.create({
      data: {
        venueId: data.venue.id,
        categoryId: data.categories.cat1.id,
        nameFa: "=HYPERLINK(\"http://evil\")",
        priceToman: 1000,
        displayOrder: 88,
      },
    });
    await prisma.menuItem.create({
      data: {
        venueId: data.venue.id,
        categoryId: data.categories.cat1.id,
        nameFa: "@SUM(A1:A2)",
        priceToman: 1000,
        displayOrder: 89,
      },
    });

    try {
      const res = await exportCsv(jsonReq(data.venue.id), params(data.venue.id));
      const csv = await res.text();
      expect(csv).toContain("'=HYPERLINK");
      expect(csv).toContain("'@SUM");
    } finally {
      await prisma.menuItem.deleteMany({
        where: { venueId: data.venue.id, nameFa: { in: ["=HYPERLINK(\"http://evil\")", "@SUM(A1:A2)"] } },
      });
    }
  });

  it("quotes cells containing commas", async () => {
    await prisma.menuItem.create({
      data: {
        venueId: data.venue.id,
        categoryId: data.categories.cat1.id,
        nameFa: "چای, ترکیبی",
        priceToman: 1000,
        displayOrder: 87,
      },
    });

    try {
      const res = await exportCsv(jsonReq(data.venue.id), params(data.venue.id));
      const csv = await res.text();
      expect(csv).toContain('"چای, ترکیبی"');
    } finally {
      await prisma.menuItem.deleteMany({ where: { venueId: data.venue.id, nameFa: "چای, ترکیبی" } });
    }
  });
});

describe("POST /items/import-csv", () => {
  const csv = (rows: string) =>
    `nameFa,nameEn,categoryNameFa,priceToman,description,calories,isSoldOut\n${rows}`;

  it("returns 400 when no CSV is sent", async () => {
    const res = await importCsv(jsonReq(data.venue.id, "POST", { csv: "" }), params(data.venue.id));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("محتوای CSV ارسال نشده");
  });

  it("returns 400 when required columns are missing", async () => {
    const res = await importCsv(
      jsonReq(data.venue.id, "POST", { csv: "nameFa\nچای\n" }),
      params(data.venue.id)
    );
    expect(res.status).toBe(400);
  });

  it("imports rows, creating items and categories", async () => {
    const body = csv(
      "چای سبز,Green Tea,نوشیدنی گرم,120000,تازه,0,false\n" +
      "کیک شکلاتی,Chocolate Cake,دسر,210000,,380,true"
    );
    const res = await importCsv(jsonReq(data.venue.id, "POST", { csv: body }), params(data.venue.id));
    expect(res.status).toBe(200);
    const resBody = await res.json();
    expect(resBody.summary.created).toBe(2);
    expect(resBody.summary.errors).toBe(0);
    expect(resBody.summary.skipped).toBe(0);

    const item = await prisma.menuItem.findFirst({ where: { venueId: data.venue.id, nameFa: "چای سبز" } });
    expect(item).not.toBeNull();
    expect(item!.priceToman).toBe(120000);
    expect(item!.nameEn).toBe("Green Tea");

    const cat = await prisma.category.findFirst({ where: { venueId: data.venue.id, nameFa: "دسر" } });
    expect(cat).not.toBeNull();
  });

  it("soft-deletes previous items and categories of the venue", async () => {
    const beforeItem = await prisma.menuItem.create({
      data: {
        venueId: data.venue.id,
        categoryId: data.categories.cat1.id,
        nameFa: "قبل از ایمپورت",
        priceToman: 1000,
        displayOrder: 85,
      },
    });
    const beforeCat = await prisma.category.create({
      data: { venueId: data.venue.id, nameFa: "دسته قبل از ایمپورت", displayOrder: 84 },
    });

    const res = await importCsv(
      jsonReq(data.venue.id, "POST", { csv: csv("چای جدید,New Tea,نوشیدنی گرم,50000,,,false") }),
      params(data.venue.id)
    );
    expect(res.status).toBe(200);

    const oldItem = await prisma.menuItem.findUnique({ where: { id: beforeItem.id } });
    expect(oldItem?.deletedAt).not.toBeNull();

    const oldCat = await prisma.category.findUnique({ where: { id: beforeCat.id } });
    expect(oldCat?.deletedAt).not.toBeNull();
  });

  it("re-importing an existing category name works (upsert, no unique violation)", async () => {
    const body = csv("چای دوباره,Tea Again,نوشیدنی گرم,40000,,,false");
    const first = await importCsv(jsonReq(data.venue.id, "POST", { csv: body }), params(data.venue.id));
    expect(first.status).toBe(200);

    const second = await importCsv(jsonReq(data.venue.id, "POST", { csv: body }), params(data.venue.id));
    expect(second.status).toBe(200);
    const resBody = await second.json();
    expect(resBody.summary.created).toBe(1);
  });

  it("skips rows with empty names or invalid prices", async () => {
    const body = csv(
      ",No Name,نوشیدنی گرم,50000,,,\n" +
      "بی‌قیمت,No Price,نوشیدنی گرم,-5,,,\n" +
      "چای درست,Good Tea,نوشیدنی گرم,30000,,,"
    );
    const res = await importCsv(jsonReq(data.venue.id, "POST", { csv: body }), params(data.venue.id));
    const resBody = await res.json();
    expect(resBody.summary.created).toBe(1);
    expect(resBody.summary.skipped).toBe(2);
  });

  it("sanitizes formula injection on import", async () => {
    const body = csv("=cmd(),Hack,نوشیدنی گرم,1000,,,false");
    const res = await importCsv(jsonReq(data.venue.id, "POST", { csv: body }), params(data.venue.id));
    expect(res.status).toBe(200);

    const item = await prisma.menuItem.findFirst({ where: { venueId: data.venue.id, nameFa: "'=cmd()" } });
    expect(item).not.toBeNull();
  });

  it("accepts Persian header aliases", async () => {
    const body = "نام فارسی,قیمت,دسته\nقهوه ترک,90000,نوشیدنی گرم";
    const res = await importCsv(jsonReq(data.venue.id, "POST", { csv: body }), params(data.venue.id));
    expect(res.status).toBe(200);
    const resBody = await res.json();
    expect(resBody.summary.created).toBe(1);

    const item = await prisma.menuItem.findFirst({ where: { venueId: data.venue.id, nameFa: "قهوه ترک" } });
    expect(item?.priceToman).toBe(90000);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await importCsv(
      jsonReq(data.venue.id, "POST", { csv: csv("چای,Tea,نوشیدنی گرم,1000,,,") }),
      params(data.venue.id)
    );
    expect(res.status).toBe(401);
  });
});
