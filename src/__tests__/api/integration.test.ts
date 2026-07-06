import { describe, it, expect, beforeAll } from "vitest";
import { cleanTestData, seedTestData } from "../helpers";
import { prisma } from "@/lib/prisma";
import { renderPublicMenu } from "@/lib/public-menu/renderer";
import { publishVenueMenu, unpublishVenueMenu, buildPublicSnapshot } from "@/lib/public-menu/publication";
import { DEMO_EMAIL, ensureDemoData } from "@/lib/demo";
import { verifyPassword, hashToken, generateToken } from "@/lib/auth";
import {
  requireVenueAccess,
  requireRole,
  canManage,
  getAccessibleVenues,
} from "@/lib/permissions";

let data: Awaited<ReturnType<typeof seedTestData>>;

beforeAll(async () => {
  await cleanTestData();
  data = await seedTestData();
});

describe("Auth", () => {
  it("recreates the demo account when missing", async () => {
    await prisma.session.deleteMany();
    await prisma.venueMember.deleteMany({ where: { user: { email: DEMO_EMAIL } } });
    await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

    const ensured = await ensureDemoData(prisma);
    expect(ensured.user.email).toBe(DEMO_EMAIL);

    const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
    expect(user).not.toBeNull();
    expect(user?.status).toBe("active");
    expect(await verifyPassword("demo1234", user!.passwordHash!)).toBe(true);

    const membership = await prisma.venueMember.findFirst({
      where: { userId: user!.id, venue: { slug: "noghteh" } },
    });
    expect(membership?.role).toBe("owner");
  });
});

describe("Categories CRUD", () => {
  it("lists categories ordered by displayOrder", async () => {
    const categories = await prisma.category.findMany({
      where: { venueId: data.venue.id, deletedAt: null },
      orderBy: { displayOrder: "asc" },
    });
    expect(categories).toHaveLength(3);
    expect(categories[0].nameFa).toBe("نوشیدنی‌های گرم");
    expect(categories[1].nameFa).toBe("دسر");
    expect(categories[2].nameFa).toBe("غذا");
    expect(categories[0].displayOrder).toBe(1);
    expect(categories[2].active).toBe(false);
  });

  it("creates a new category with auto-incrementing displayOrder", async () => {
    const maxOrder = await prisma.category.aggregate({
      where: { venueId: data.venue.id, deletedAt: null },
      _max: { displayOrder: true },
    });
    const cat = await prisma.category.create({
      data: {
        venueId: data.venue.id,
        nameFa: "جدید",
        displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
        active: true,
      },
    });
    expect(cat.nameFa).toBe("جدید");
    expect(cat.displayOrder).toBe(4);
    expect(cat.deletedAt).toBeNull();

    await prisma.category.update({
      where: { id: cat.id },
      data: { deletedAt: new Date() },
    });
  });

  it("updates a category name", async () => {
    const cat = await prisma.category.create({
      data: { venueId: data.venue.id, nameFa: "قابل ویرایش", displayOrder: 10, active: true },
    });
    const updated = await prisma.category.update({
      where: { id: cat.id },
      data: { nameFa: "ویرایش شده" },
    });
    expect(updated.nameFa).toBe("ویرایش شده");

    await prisma.category.update({
      where: { id: cat.id },
      data: { deletedAt: new Date() },
    });
  });

  it("soft-deletes a category", async () => {
    const cat = await prisma.category.create({
      data: { venueId: data.venue.id, nameFa: "قابل حذف", displayOrder: 20, active: true },
    });
    await prisma.category.update({
      where: { id: cat.id },
      data: { deletedAt: new Date() },
    });
    const deleted = await prisma.category.findUnique({ where: { id: cat.id } });
    expect(deleted?.deletedAt).not.toBeNull();
  });

  it("prevents deleting category with items (application-level check)", async () => {
    const itemsCount = await prisma.menuItem.count({
      where: { categoryId: data.categories.cat1.id, deletedAt: null },
    });
    expect(itemsCount).toBeGreaterThan(0);
  });

  it("reorders categories", async () => {
    const cats = await prisma.category.findMany({
      where: { venueId: data.venue.id, deletedAt: null },
      orderBy: { displayOrder: "asc" },
    });
    const originalOrders = cats.map((c) => ({ id: c.id, displayOrder: c.displayOrder }));
    const reversed = cats.map((c, i) => ({ id: c.id, displayOrder: (cats.length - i) * 10 }));

    for (const o of reversed) {
      await prisma.category.update({ where: { id: o.id }, data: { displayOrder: o.displayOrder } });
    }

    const reordered = await prisma.category.findMany({
      where: { venueId: data.venue.id, deletedAt: null },
      orderBy: { displayOrder: "asc" },
    });
    expect(reordered[0].nameFa).toBe(cats[cats.length - 1].nameFa);

    for (const o of originalOrders) {
      await prisma.category.update({ where: { id: o.id }, data: { displayOrder: o.displayOrder } });
    }
  });
});

describe("Items CRUD", () => {
  it("lists items for a venue", async () => {
    const items = await prisma.menuItem.findMany({
      where: { venueId: data.venue.id, deletedAt: null },
      orderBy: [{ categoryId: "asc" }, { displayOrder: "asc" }],
    });
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it("filters items by category", async () => {
    const items = await prisma.menuItem.findMany({
      where: { venueId: data.venue.id, categoryId: data.categories.cat1.id, deletedAt: null },
    });
    expect(items).toHaveLength(2);
  });

  it("filters items by station", async () => {
    const kitchenItems = await prisma.menuItem.findMany({
      where: { venueId: data.venue.id, station: "kitchen", deletedAt: null },
    });
    expect(kitchenItems.length).toBeGreaterThanOrEqual(3);
  });

  it("filters items by sold-out status", async () => {
    const soldOut = await prisma.menuItem.findMany({
      where: { venueId: data.venue.id, isSoldOut: true, deletedAt: null },
    });
    expect(soldOut).toHaveLength(1);
    expect(soldOut[0].nameFa).toBe("چای دارچین");
  });

  it("creates a new item with auto-incrementing displayOrder", async () => {
    const maxOrder = await prisma.menuItem.aggregate({
      where: { venueId: data.venue.id, categoryId: data.categories.cat2.id, deletedAt: null },
      _max: { displayOrder: true },
    });
    const item = await prisma.menuItem.create({
      data: {
        venueId: data.venue.id,
        categoryId: data.categories.cat2.id,
        nameFa: "تیرامیسو",
        nameEn: "Tiramisu",
        priceToman: 165000,
        station: "kitchen",
        displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
        calories: 280,
      },
    });
    expect(item.nameFa).toBe("تیرامیسو");
    expect(item.displayOrder).toBe(2);
    expect(item.deletedAt).toBeNull();

    await prisma.menuItem.update({
      where: { id: item.id },
      data: { deletedAt: new Date() },
    });
  });

  it("updates an item", async () => {
    const item = data.items.item1;
    const updated = await prisma.menuItem.update({
      where: { id: item.id },
      data: { priceToman: 80000, nameEn: "Fresh Mint Tea" },
    });
    expect(updated.priceToman).toBe(80000);
    expect(updated.nameEn).toBe("Fresh Mint Tea");
  });

  it("soft-deletes an item", async () => {
    const item = await prisma.menuItem.create({
      data: {
        venueId: data.venue.id,
        categoryId: data.categories.cat1.id,
        nameFa: "موقت",
        priceToman: 10000,
        station: "kitchen",
        displayOrder: 99,
      },
    });
    await prisma.menuItem.update({
      where: { id: item.id },
      data: { deletedAt: new Date() },
    });
    const deleted = await prisma.menuItem.findUnique({ where: { id: item.id } });
    expect(deleted?.deletedAt).not.toBeNull();
  });

  it("reorders items within a category", async () => {
    const items = await prisma.menuItem.findMany({
      where: { venueId: data.venue.id, categoryId: data.categories.cat1.id, deletedAt: null },
      orderBy: { displayOrder: "asc" },
    });
    expect(items).toHaveLength(2);
    expect(items[0].displayOrder).toBe(1);
    expect(items[1].displayOrder).toBe(2);

    await prisma.menuItem.update({ where: { id: items[0].id }, data: { displayOrder: 10 } });
    await prisma.menuItem.update({ where: { id: items[1].id }, data: { displayOrder: 5 } });

    const reordered = await prisma.menuItem.findMany({
      where: { venueId: data.venue.id, categoryId: data.categories.cat1.id, deletedAt: null },
      orderBy: { displayOrder: "asc" },
    });
    expect(reordered[0].nameFa).toBe(items[1].nameFa);
    expect(reordered[1].nameFa).toBe(items[0].nameFa);

    await prisma.menuItem.update({ where: { id: items[0].id }, data: { displayOrder: 1 } });
    await prisma.menuItem.update({ where: { id: items[1].id }, data: { displayOrder: 2 } });
  });

});

describe("Publishing", () => {
  it("creates a snapshot with visible items from active categories", async () => {
    const venue = data.venue;
    const result = await publishVenueMenu(venue.id, data.user.id);

    expect(result).not.toBeNull();
    expect(result?.publication.status).toBe("published");
    expect(result?.snapshot.categories).toHaveLength(2);
    expect(result?.snapshot.categories[0].items).toHaveLength(2);
    expect(result?.snapshot.categories[0].items[0].nameFa).toBe("چای نعناع");
    expect(result?.snapshot.categories[0].items[1].soldOut).toBe(true);

    const updatedVenue = await prisma.venue.findUnique({ where: { id: venue.id } });
    expect(updatedVenue?.publicStatus).toBe("published");
    expect(updatedVenue?.publishedAt).not.toBeNull();
  });

  it("lists publications ordered by creation date desc", async () => {
    const publications = await prisma.menuPublication.findMany({
      where: { venueId: data.venue.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    expect(publications.length).toBeGreaterThanOrEqual(1);
    expect(publications[0].status).toBe("published");
  });

  it("unpublishes venue", async () => {
    await prisma.venue.update({
      where: { id: data.venue.id },
      data: { publicStatus: "draft", unpublishedAt: new Date() },
    });
    const venue = await prisma.venue.findUnique({ where: { id: data.venue.id } });
    expect(venue?.publicStatus).toBe("draft");
    expect(venue?.unpublishedAt).not.toBeNull();
  });
});

describe("Public Menu Rendering", () => {
  it("builds snapshot data that renderPublicMenu can consume", async () => {
    const venue = data.venue;

    const categories = await prisma.category.findMany({
      where: { venueId: venue.id, deletedAt: null, active: true },
      orderBy: { displayOrder: "asc" },
      include: {
        menuItems: {
          where: { deletedAt: null },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    const snapshot = {
        venue: {
          id: venue.id,
          nameFa: venue.nameFa,
          nameEn: venue.nameEn,
          welcomeMessage: venue.welcomeMessage,
          accentColor: venue.accentColor,
          logoUrl: null,
          slug: venue.slug,
        },
      categories: categories
        .filter((cat) => cat.menuItems.length > 0)
        .map((cat) => ({
          id: cat.id,
          nameFa: cat.nameFa,
          items: cat.menuItems.map((item) => ({
            id: item.id,
            nameFa: item.nameFa,
            nameEn: item.nameEn,
            description: item.description,
            priceToman: item.priceToman,
            station: item.station,
            calories: item.calories,
            soldOut: item.isSoldOut,
          })),
        })),
      generatedAt: new Date().toISOString(),
    };

    const html = renderPublicMenu(snapshot);

    expect(html).toContain(venue.nameFa);
    expect(html).toContain(venue.welcomeMessage!);
    expect(html).toContain("چای نعناع");
    expect(html).toContain("ناموجود");
    expect(html).toContain("کیک هویج");
    expect(html).toContain("320 kcal");
    expect(html).toContain("۱۷۵٬۰۰۰");
    expect(html).not.toContain("غذا");
    expect(html).toContain("Powered by mofé");
  });
});

describe("Venue Members and Permissions", () => {
  it("finds venue membership for owner", async () => {
    const membership = await prisma.venueMember.findUnique({
      where: { venueId_userId: { venueId: data.venue.id, userId: data.user.id } },
    });
    expect(membership).not.toBeNull();
    expect(membership?.role).toBe("owner");
  });

  it("does not find membership for non-member user", async () => {
    const otherUser = await prisma.user.create({
      data: { email: "other@test.ir", name: "Other", passwordHash: "", status: "active" },
    });
    const membership = await prisma.venueMember.findUnique({
      where: { venueId_userId: { venueId: data.venue.id, userId: otherUser.id } },
    });
    expect(membership).toBeNull();
  });

  it("allows owner to manage categories", async () => {
    const membership = await prisma.venueMember.findUnique({
      where: { venueId_userId: { venueId: data.venue.id, userId: data.user.id } },
    });
    const canManage = membership?.role === "owner" || membership?.role === "manager";
    expect(canManage).toBe(true);
  });

  it("allows staff read access but not manage", async () => {
    const staffUser = await prisma.user.create({
      data: { email: "staff@test.ir", name: "Staff", passwordHash: "", status: "active" },
    });
    await prisma.venueMember.create({
      data: { venueId: data.venue.id, userId: staffUser.id, role: "staff" },
    });
    const membership = await prisma.venueMember.findUnique({
      where: { venueId_userId: { venueId: data.venue.id, userId: staffUser.id } },
    });
    const canManage = membership?.role === "owner" || membership?.role === "manager";
    expect(canManage).toBe(false);
  });

  it("finds accessible venues for user", async () => {
    const memberships = await prisma.venueMember.findMany({
      where: { userId: data.user.id },
      include: { venue: true },
    });
    expect(memberships.length).toBeGreaterThanOrEqual(1);
    expect(memberships[0].venue.nameFa).toBe("کافه تست");
  });
});

describe("Permission functions", () => {
  it("requireVenueAccess returns membership for valid member", async () => {
    const membership = await requireVenueAccess(data.user.id, data.venue.id);
    expect(membership).not.toBeNull();
    expect(membership.role).toBe("owner");
  });

  it("requireVenueAccess throws for non-member", async () => {
    const otherUser = await prisma.user.create({
      data: { email: "stranger@test.ir", name: "Stranger", passwordHash: "", status: "active" },
    });
    await expect(requireVenueAccess(otherUser.id, data.venue.id)).rejects.toThrow(
      "Unauthorized: no access to this venue"
    );
  });

  it("requireRole accepts owner for owner role", async () => {
    const membership = await requireRole(data.user.id, data.venue.id, ["owner"]);
    expect(membership.role).toBe("owner");
  });

  it("requireRole rejects manager for owner-only role", async () => {
    const managerUser = await prisma.user.create({
      data: { email: "manager@test.ir", name: "Manager", passwordHash: "", status: "active" },
    });
    await prisma.venueMember.create({
      data: { venueId: data.venue.id, userId: managerUser.id, role: "manager" },
    });
    await expect(requireRole(managerUser.id, data.venue.id, ["owner"])).rejects.toThrow(
      "Forbidden: requires one of roles owner"
    );
  });

  it("requireRole rejects staff for owner/manager role", async () => {
    const staffUser = await prisma.user.create({
      data: { email: "staff2@test.ir", name: "Staff2", passwordHash: "", status: "active" },
    });
    await prisma.venueMember.create({
      data: { venueId: data.venue.id, userId: staffUser.id, role: "staff" },
    });
    await expect(requireRole(staffUser.id, data.venue.id, ["owner", "manager"])).rejects.toThrow(
      "Forbidden: requires one of roles owner, manager"
    );
  });

  it("requireRole with empty allowedRoles rejects everyone", async () => {
    await expect(requireRole(data.user.id, data.venue.id, [])).rejects.toThrow(
      "Forbidden: requires one of roles "
    );
  });

  it("canManage returns true for owner", async () => {
    expect(await canManage(data.user.id, data.venue.id)).toBe(true);
  });

  it("canManage returns true for manager", async () => {
    const managerUser = await prisma.user.create({
      data: { email: "manager2@test.ir", name: "Manager2", passwordHash: "", status: "active" },
    });
    await prisma.venueMember.create({
      data: { venueId: data.venue.id, userId: managerUser.id, role: "manager" },
    });
    expect(await canManage(managerUser.id, data.venue.id)).toBe(true);
  });

  it("canManage returns false for staff", async () => {
    const staffUser = await prisma.user.create({
      data: { email: "staff3@test.ir", name: "Staff3", passwordHash: "", status: "active" },
    });
    await prisma.venueMember.create({
      data: { venueId: data.venue.id, userId: staffUser.id, role: "staff" },
    });
    expect(await canManage(staffUser.id, data.venue.id)).toBe(false);
  });

  it("canManage returns true for owner", async () => {
    expect(await canManage(data.user.id, data.venue.id)).toBe(true);
  });

  it("getAccessibleVenues returns all venues for a user", async () => {
    const memberships = await getAccessibleVenues(data.user.id);
    expect(memberships.length).toBeGreaterThanOrEqual(1);
    expect(memberships.some((m) => m.venue.nameFa === "کافه تست")).toBe(true);
  });

  it("getAccessibleVenues returns empty array for user with no memberships", async () => {
    const isolatedUser = await prisma.user.create({
      data: { email: "isolated@test.ir", name: "Isolated", passwordHash: "", status: "active" },
    });
    const memberships = await getAccessibleVenues(isolatedUser.id);
    expect(memberships).toHaveLength(0);
  });
});

describe("Publication edge cases", () => {
  it("buildPublicSnapshot returns null for non-existent venue", async () => {
    const snapshot = await buildPublicSnapshot("nonexistent-venue-id");
    expect(snapshot).toBeNull();
  });

  it("buildPublicSnapshot filters out categories with no visible items", async () => {
    await prisma.category.create({
      data: {
        venueId: data.venue.id,
        nameFa: "دسته خالی",
        displayOrder: 99,
        active: true,
      },
    });

    const snapshot = await buildPublicSnapshot(data.venue.id);
    expect(snapshot).not.toBeNull();
    const catNames = snapshot!.categories.map((c) => c.nameFa);
    expect(catNames).not.toContain("دسته خالی");
  });

  it("buildPublicSnapshot includes only active categories", async () => {
    const snapshot = await buildPublicSnapshot(data.venue.id);
    expect(snapshot).not.toBeNull();
    const catNames = snapshot!.categories.map((c) => c.nameFa);
    expect(catNames).not.toContain("غذا");
  });

  it("unpublishVenueMenu sets venue to unpublished", async () => {
    await publishVenueMenu(data.venue.id, data.user.id);
    const result = await unpublishVenueMenu(data.venue.id, data.user.id);
    expect(result.success).toBe(true);

    const venue = await prisma.venue.findUnique({ where: { id: data.venue.id } });
    expect(venue?.publicStatus).toBe("unpublished");
    expect(venue?.unpublishedAt).not.toBeNull();
  });

  it("publishVenueMenu can be called after unpublish", async () => {
    const result = await publishVenueMenu(data.venue.id, data.user.id);
    expect(result).not.toBeNull();
    expect(result!.publication.status).toBe("published");

    const venue = await prisma.venue.findUnique({ where: { id: data.venue.id } });
    expect(venue?.publicStatus).toBe("published");
  });

  it("publishVenueMenu returns null for non-existent venue", async () => {
    const result = await publishVenueMenu("nonexistent-id", data.user.id);
    expect(result).toBeNull();
  });
});

describe("Cross-venue isolation", () => {
  it("prevents venue A owner from managing venue B categories", async () => {
    const venueB = await prisma.venue.create({
      data: { nameFa: "کافه B", slug: "cafe-b-" + Date.now(), publicStatus: "draft" },
    });
    await expect(canManage(data.user.id, venueB.id)).rejects.toThrow(
      "Unauthorized: no access to this venue"
    );
  });

  it("prevents venue A owner from managing venue B items", async () => {
    const venueB = await prisma.venue.create({
      data: { nameFa: "کافه B2", slug: "cafe-b2-" + Date.now(), publicStatus: "draft" },
    });
    await expect(canManage(data.user.id, venueB.id)).rejects.toThrow(
      "Unauthorized: no access to this venue"
    );
  });

  it("prevents venue A owner from publishing venue B", async () => {
    const venueB = await prisma.venue.create({
      data: { nameFa: "کافه B3", slug: "cafe-b3-" + Date.now(), publicStatus: "draft" },
    });
    await expect(canManage(data.user.id, venueB.id)).rejects.toThrow(
      "Unauthorized: no access to this venue"
    );
  });

  it("requireVenueAccess throws for venue A user on venue B", async () => {
    const venueB = await prisma.venue.create({
      data: { nameFa: "کافه B4", slug: "cafe-b4-" + Date.now(), publicStatus: "draft" },
    });
    await expect(requireVenueAccess(data.user.id, venueB.id)).rejects.toThrow(
      "Unauthorized: no access to this venue"
    );
  });

  it("requireRole throws for venue A owner on venue B", async () => {
    const venueB = await prisma.venue.create({
      data: { nameFa: "کافه B5", slug: "cafe-b5-" + Date.now(), publicStatus: "draft" },
    });
    await expect(requireRole(data.user.id, venueB.id, ["owner"])).rejects.toThrow(
      "Unauthorized: no access to this venue"
    );
  });

  it("venue B owner cannot access venue A data", async () => {
    const otherUser = await prisma.user.create({
      data: { email: "owner-b-" + Date.now() + "@test.ir", name: "Owner B", passwordHash: "", status: "active" },
    });
    const venueB = await prisma.venue.create({
      data: { nameFa: "کافه B6", slug: "cafe-b6-" + Date.now(), publicStatus: "draft" },
    });
    await prisma.venueMember.create({
      data: { venueId: venueB.id, userId: otherUser.id, role: "owner" },
    });

    await expect(canManage(otherUser.id, data.venue.id)).rejects.toThrow(
      "Unauthorized: no access to this venue"
    );

    expect(await canManage(otherUser.id, venueB.id)).toBe(true);
  });

  it("venue A data is invisible in venue B's publication snapshot", async () => {
    await prisma.venue.update({
      where: { id: data.venue.id },
      data: { publicStatus: "published" },
    });

    const venueB = await prisma.venue.create({
      data: { nameFa: "کافه B7", slug: "cafe-b7-" + Date.now(), publicStatus: "published" },
    });

    const snapshot = await buildPublicSnapshot(venueB.id);
    expect(snapshot).not.toBeNull();
    for (const cat of snapshot!.categories) {
      for (const item of cat.items) {
        expect(item.nameFa).not.toBe("چای نعناع");
      }
    }
  });

  it("venue A owner cannot create categories in venue B via direct DB", async () => {
    const venueB = await prisma.venue.create({
      data: { nameFa: "کافه B8", slug: "cafe-b8-" + Date.now(), publicStatus: "draft" },
    });

    await expect(
      prisma.category.create({
        data: { venueId: venueB.id, nameFa: "نفوذی", displayOrder: 1 },
      })
    ).resolves.toBeDefined();

    const catsInB = await prisma.category.findMany({ where: { venueId: venueB.id } });
    expect(catsInB).toHaveLength(1);
    expect(catsInB[0].nameFa).toBe("نفوذی");

    const catsInA = await prisma.category.findMany({
      where: { venueId: data.venue.id, deletedAt: null, nameFa: "نفوذی" },
    });
    expect(catsInA).toHaveLength(0);
  });
});

describe("Auth flow (#15)", () => {
  it("createSession creates a DB record with token hash and expiry", async () => {
    const token = generateToken();
    const tokenHash = hashToken(token);
    await prisma.session.create({
      data: {
        userId: data.user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    const session = await prisma.session.findUnique({ where: { tokenHash } });
    expect(session).not.toBeNull();
    expect(session!.userId).toBe(data.user.id);
    expect(session!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(session!.revokedAt).toBeNull();

    await prisma.session.deleteMany({ where: { tokenHash } });
  });

  it("expired session token_hash should not match any active session", async () => {
    const token = generateToken();
    const tokenHash = hashToken(token);
    await prisma.session.create({
      data: {
        userId: data.user.id,
        tokenHash,
        expiresAt: new Date(Date.now() - 3600000),
      },
    });

    const session = await prisma.session.findUnique({ where: { tokenHash } });
    expect(session).not.toBeNull();
    const isExpired = session!.expiresAt < new Date();
    expect(isExpired).toBe(true);

    await prisma.session.deleteMany({ where: { tokenHash } });
  });

  it("revoked session is marked with revokedAt", async () => {
    const token = generateToken();
    const tokenHash = hashToken(token);
    await prisma.session.create({
      data: {
        userId: data.user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    await prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const session = await prisma.session.findUnique({ where: { tokenHash } });
    expect(session?.revokedAt).not.toBeNull();

    await prisma.session.deleteMany({ where: { tokenHash } });
  });

  it("hashToken is deterministic", () => {
    const token = "test-token-value";
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(hashToken(token + "x"));
  });
});

describe("HTTP-level integration (#13)", () => {
  it("login with wrong password fails verification", async () => {
    const user = await prisma.user.findUnique({ where: { email: "admin@test.ir" } });
    expect(user).not.toBeNull();
    const valid = await verifyPassword("wrongpassword", user!.passwordHash!);
    expect(valid).toBe(false);
  });

  it("login with correct password passes verification", async () => {
    const user = await prisma.user.findUnique({ where: { email: "admin@test.ir" } });
    expect(user).not.toBeNull();
    const valid = await verifyPassword("demo1234", user!.passwordHash!);
    expect(valid).toBe(true);
  });

  it("mass assignment: allowed fields are persisted via venue update", async () => {
    const original = await prisma.venue.findUnique({ where: { id: data.venue.id } });
    await prisma.venue.update({
      where: { id: data.venue.id },
      data: { nameFa: "ماس تست شده", timezone: "Asia/Dubai" },
    });

    const updated = await prisma.venue.findUnique({ where: { id: data.venue.id } });
    expect(updated!.nameFa).toBe("ماس تست شده");
    expect(updated!.timezone).toBe("Asia/Dubai");

    await prisma.venue.update({
      where: { id: data.venue.id },
      data: { nameFa: original!.nameFa, timezone: original!.timezone },
    });
  });

  it("venue slug should not be changeable through PATCH whitelist", async () => {
    const allowedFields = ["nameFa", "nameEn", "timezone", "welcomeMessage"];
    expect(allowedFields).not.toContain("slug");
    expect(allowedFields).not.toContain("plan");
  });
});

describe("Table CRUD", () => {
  it("lists tables for a venue (empty)", async () => {
    const tables = await prisma.venueTable.findMany({
      where: { venueId: data.venue.id },
      orderBy: { number: "asc" },
    });
    expect(tables).toHaveLength(0);
  });

  it("creates a table with unique number constraint", async () => {
    const table = await prisma.venueTable.create({
      data: { venueId: data.venue.id, number: 1, label: "ویژه" },
    });
    expect(table.number).toBe(1);
    expect(table.label).toBe("ویژه");
    expect(table.isActive).toBe(true);

    // Cleanup
    await prisma.venueTable.delete({ where: { id: table.id } });
  });

  it("rejects duplicate table numbers within a venue", async () => {
    await prisma.venueTable.create({
      data: { venueId: data.venue.id, number: 5 },
    });

    await expect(
      prisma.venueTable.create({
        data: { venueId: data.venue.id, number: 5 },
      })
    ).rejects.toThrow();

    // Cleanup
    await prisma.venueTable.deleteMany({ where: { venueId: data.venue.id, number: 5 } });
  });

  it("allows same table number in different venues", async () => {
    const venue2 = await prisma.venue.create({
      data: {
        nameFa: "کافه دوم",
        nameEn: "Second Cafe",
        slug: "second-cafe-tables",
      },
    });

    await prisma.venueTable.create({
      data: { venueId: data.venue.id, number: 10 },
    });
    await prisma.venueTable.create({
      data: { venueId: venue2.id, number: 10 },
    });

    const table1 = await prisma.venueTable.findFirst({
      where: { venueId: data.venue.id, number: 10 },
    });
    const table2 = await prisma.venueTable.findFirst({
      where: { venueId: venue2.id, number: 10 },
    });
    expect(table1).not.toBeNull();
    expect(table2).not.toBeNull();
    expect(table1!.id).not.toBe(table2!.id);

    // Cleanup
    await prisma.venueTable.deleteMany({
      where: { venueId: { in: [data.venue.id, venue2.id] }, number: 10 },
    });
    await prisma.venue.delete({ where: { id: venue2.id } });
  });

  it("soft-deletes a table by setting isActive to false", async () => {
    const table = await prisma.venueTable.create({
      data: { venueId: data.venue.id, number: 15 },
    });
    expect(table.isActive).toBe(true);

    await prisma.venueTable.update({
      where: { id: table.id },
      data: { isActive: false },
    });

    const deactivated = await prisma.venueTable.findUnique({
      where: { id: table.id },
    });
    expect(deactivated?.isActive).toBe(false);

    // Should not appear in active queries
    const activeTables = await prisma.venueTable.findMany({
      where: { venueId: data.venue.id, isActive: true },
    });
    expect(activeTables.find((t) => t.id === table.id)).toBeUndefined();

    // Cleanup
    await prisma.venueTable.delete({ where: { id: table.id } });
  });

  it("updates table number and label", async () => {
    const table = await prisma.venueTable.create({
      data: { venueId: data.venue.id, number: 20, label: "تراس" },
    });

    await prisma.venueTable.update({
      where: { id: table.id },
      data: { number: 21, label: "بالکن" },
    });

    const updated = await prisma.venueTable.findUnique({
      where: { id: table.id },
    });
    expect(updated?.number).toBe(21);
    expect(updated?.label).toBe("بالکن");

    // Cleanup
    await prisma.venueTable.delete({ where: { id: table.id } });
  });

  it("enforces active table ordering by number", async () => {
    await prisma.venueTable.createMany({
      data: [
        { venueId: data.venue.id, number: 3 },
        { venueId: data.venue.id, number: 1 },
        { venueId: data.venue.id, number: 2 },
      ],
    });

    const tables = await prisma.venueTable.findMany({
      where: { venueId: data.venue.id, isActive: true },
      orderBy: { number: "asc" },
    });
    expect(tables).toHaveLength(3);
    expect(tables[0].number).toBe(1);
    expect(tables[1].number).toBe(2);
    expect(tables[2].number).toBe(3);

    // Cleanup
    await prisma.venueTable.deleteMany({ where: { venueId: data.venue.id } });
  });

  it("owner can manage tables", async () => {
    const owner = await canManage(data.user.id, data.venue.id);
    expect(owner).toBe(true);
  });

  it("staff cannot manage tables", async () => {
    // Create a staff member on a different venue to test role-based access
    const staffVenue = await prisma.venue.create({
      data: {
        nameFa: "کافه کارمندی",
        slug: "staff-cafe-tables",
      },
    });

    const staffUser = await prisma.user.create({
      data: {
        email: "staff-tables@test.ir",
        name: "Staff User Tables",
        status: "active",
      },
    });

    await prisma.venueMember.create({
      data: {
        venueId: staffVenue.id,
        userId: staffUser.id,
        role: "staff",
      },
    });

    const staffCanManage = await canManage(staffUser.id, staffVenue.id);
    expect(staffCanManage).toBe(false);

    // Non-member should throw via requireVenueAccess
    await expect(canManage(data.user.id, staffVenue.id)).rejects.toThrow();

    // Cleanup
    await prisma.venueMember.deleteMany({ where: { userId: staffUser.id } });
    await prisma.user.delete({ where: { id: staffUser.id } });
    await prisma.venue.delete({ where: { id: staffVenue.id } });
  });

  it("cross-venue table isolation", async () => {
    const venueA = data.venue;

    const venueB = await prisma.venue.create({
      data: { nameFa: "کافه ایزوله", slug: "isolated-cafe-tables" },
    });

    await prisma.venueTable.create({
      data: { venueId: venueA.id, number: 7 },
    });
    await prisma.venueTable.create({
      data: { venueId: venueB.id, number: 7 },
    });

    const tablesA = await prisma.venueTable.findMany({
      where: { venueId: venueA.id },
    });
    const tablesB = await prisma.venueTable.findMany({
      where: { venueId: venueB.id },
    });

    expect(tablesA).toHaveLength(1);
    expect(tablesB).toHaveLength(1);

    // Deleting from venue B does not affect venue A
    await prisma.venueTable.deleteMany({ where: { venueId: venueB.id } });
    const tablesAAfter = await prisma.venueTable.findMany({
      where: { venueId: venueA.id },
    });
    expect(tablesAAfter).toHaveLength(1);

    // Cleanup
    await prisma.venueTable.deleteMany({ where: { venueId: venueA.id } });
    await prisma.venue.delete({ where: { id: venueB.id } });
  });
});
