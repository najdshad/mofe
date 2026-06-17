import { describe, it, expect, beforeAll } from "vitest";
import { cleanTestData, seedTestData } from "../helpers";
import { prisma } from "@/lib/prisma";
import { renderPublicMenu } from "@/lib/public-menu/renderer";
import { publishVenueMenu, unpublishVenueMenu, buildPublicSnapshot } from "@/lib/public-menu/publication";
import { DEMO_EMAIL, ensureDemoData } from "@/lib/demo";
import { verifyPassword } from "@/lib/auth";
import {
  requireVenueAccess,
  requireRole,
  canManageCategories,
  canManageItems,
  canPublish,
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

  it("filters items by visibility", async () => {
    const hidden = await prisma.menuItem.findMany({
      where: { venueId: data.venue.id, visibleOnPublicMenu: false, deletedAt: null },
    });
    expect(hidden).toHaveLength(0);
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

  it("bulk updates visibility", async () => {
    const visibleItems = await prisma.menuItem.findMany({
      where: { venueId: data.venue.id, visibleOnPublicMenu: true, deletedAt: null },
    });

    const result = await prisma.menuItem.updateMany({
      where: { id: { in: visibleItems.map((i) => i.id) }, venueId: data.venue.id },
      data: { visibleOnPublicMenu: false },
    });
    expect(result.count).toBe(visibleItems.length);

    await prisma.menuItem.updateMany({
      where: { venueId: data.venue.id },
      data: { visibleOnPublicMenu: true },
    });
  });

  it("bulk updates visibility filtered by station", async () => {
    const kitchenItems = await prisma.menuItem.count({
      where: { venueId: data.venue.id, station: "kitchen", visibleOnPublicMenu: true, deletedAt: null },
    });
    const result = await prisma.menuItem.updateMany({
      where: { venueId: data.venue.id, station: "kitchen", deletedAt: null },
      data: { visibleOnPublicMenu: false },
    });
    expect(result.count).toBe(kitchenItems);

    await prisma.menuItem.updateMany({
      where: { venueId: data.venue.id },
      data: { visibleOnPublicMenu: true },
    });
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
          where: { deletedAt: null, visibleOnPublicMenu: true },
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

  it("canManageCategories returns true for owner", async () => {
    expect(await canManageCategories(data.user.id, data.venue.id)).toBe(true);
  });

  it("canManageCategories returns true for manager", async () => {
    const managerUser = await prisma.user.create({
      data: { email: "manager2@test.ir", name: "Manager2", passwordHash: "", status: "active" },
    });
    await prisma.venueMember.create({
      data: { venueId: data.venue.id, userId: managerUser.id, role: "manager" },
    });
    expect(await canManageCategories(managerUser.id, data.venue.id)).toBe(true);
  });

  it("canManageCategories returns false for staff", async () => {
    const staffUser = await prisma.user.create({
      data: { email: "staff3@test.ir", name: "Staff3", passwordHash: "", status: "active" },
    });
    await prisma.venueMember.create({
      data: { venueId: data.venue.id, userId: staffUser.id, role: "staff" },
    });
    expect(await canManageCategories(staffUser.id, data.venue.id)).toBe(false);
  });

  it("canManageItems and canPublish match canManageCategories", async () => {
    expect(await canManageItems(data.user.id, data.venue.id)).toBe(
      await canManageCategories(data.user.id, data.venue.id)
    );
    expect(await canPublish(data.user.id, data.venue.id)).toBe(
      await canManageCategories(data.user.id, data.venue.id)
    );
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

  it("buildPublicSnapshot includes only visible items", async () => {
    await prisma.menuItem.update({
      where: { id: data.items.item1.id },
      data: { visibleOnPublicMenu: false },
    });

    const snapshot = await buildPublicSnapshot(data.venue.id);
    const itemsForCat = snapshot!.categories.find((c) =>
      c.items.some((i) => i.nameFa === "چای نعناع")
    );
    expect(itemsForCat).toBeUndefined();

    await prisma.menuItem.update({
      where: { id: data.items.item1.id },
      data: { visibleOnPublicMenu: true },
    });
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
