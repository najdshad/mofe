import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const base = (process.env.BASE_URL || "http://localhost:8787").replace(/\/$/, "");
const adminIdentifier = await getAdminIdentifier();
let cookie = "";
let adminCookie = "";
const createdItems = [];
let createdCategory = null;
let createdUser = null;
let venue = null;

function parseDevVars(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

async function getAdminIdentifier() {
  if (process.env.ADMIN_IDENTIFIER) return process.env.ADMIN_IDENTIFIER;
  try {
    const vars = parseDevVars(await readFile(new URL("../.dev.vars", import.meta.url), "utf8"));
    if (vars.ADMIN_IDENTIFIER) return vars.ADMIN_IDENTIFIER;
    throw new Error("missing ADMIN_IDENTIFIER");
  } catch {
    throw new Error("Set ADMIN_IDENTIFIER or add it to .dev.vars before running the smoke test.");
  }
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { Origin: base };
  if (cookie) headers.Cookie = cookie;
  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  if (method === "POST" && path === "/api/login") {
    const setCookie = response.headers.getSetCookie?.()[0] || response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
  }
  return response;
}

async function json(path, options) {
  const response = await request(path, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options?.method || "GET"} ${path} -> ${response.status}: ${payload.error || "unknown error"}`);
  }
  return payload;
}

async function login(identifier) {
  cookie = "";
  return request("/api/login", { method: "POST", body: { identifier } });
}

async function cleanup() {
  if (adminCookie) cookie = adminCookie;
  if (createdUser) {
    await request(`/api/users/${createdUser}`, { method: "DELETE" }).catch(() => {});
    createdUser = null;
  }
  if (!venue) return;
  for (const id of createdItems.splice(0)) {
    await request(`/api/venues/${venue.id}/items/${id}`, { method: "DELETE" }).catch(() => {});
  }
  if (createdCategory) {
    await request(`/api/venues/${venue.id}/categories/${createdCategory}`, { method: "DELETE" }).catch(() => {});
    createdCategory = null;
  }
}

try {
  const home = await request("/");
  assert.equal(home.status, 200, "landing page should load");
  assert.match(await home.text(), /href="\/login"/);
  assert.doesNotMatch(home.headers.get("x-robots-tag") || "", /noindex/, "landing page should be indexable");

  const loginPage = await request("/login");
  assert.equal(loginPage.status, 200, "login shell should load");
  assert.match(await loginPage.text(), /\/admin\.js/);

  const admin = await request("/admin");
  assert.equal(admin.status, 302, "admin should redirect");
  const location = admin.headers.get("location") || "";
  assert.equal(new URL(location, base).pathname, "/login", "admin should redirect to the login shell");

  const unauthorised = await request("/api/venues");
  assert.equal(unauthorised.status, 401, "API should require auth before login");

  const loginResponse = await login(adminIdentifier);
  assert.equal(loginResponse.status, 200, "admin login should succeed");
  assert.ok(cookie, "login should set a session cookie");
  adminCookie = cookie;

  const venues = await json("/api/venues");
  assert.equal(venues.user.role, "admin", "admin session should have the admin role");
  assert.ok(Array.isArray(venues.venues) && venues.venues.length > 0, "at least one venue should exist");
  venue = venues.venues[0];
  assert.ok(venue.id && venue.slug, "venue should have an id and slug");

  const suffix = Date.now().toString(36);
  const taken = await json(`/api/venues/check?slug=${encodeURIComponent(venue.slug)}`);
  assert.equal(taken.available, false, "existing slug should be unavailable");
  const freeSlug = `smoke-${suffix}`;
  const free = await json(`/api/venues/check?slug=${encodeURIComponent(freeSlug)}`);
  assert.equal(free.available, true, "random slug should be available");

  const adminDuplicate = await request("/api/venues", {
    method: "POST",
    body: { slug: venue.slug, nameFa: "x" },
  });
  assert.equal(adminDuplicate.status, 409, "admin should reach venue validation");

  const beforeUsers = await json("/api/users");
  assert.ok(Array.isArray(beforeUsers.users), "admin should list users");

  const createdUserData = await json("/api/users", {
    method: "POST",
    body: { name: `کاربر تست ${suffix}`, venueId: venue.id },
  });
  createdUser = createdUserData.id;
  assert.match(createdUserData.identifier, /^mofe_[0-9a-f]{32}$/);
  const firstIdentifier = createdUserData.identifier;

  const listedUsers = await json("/api/users");
  const listedUser = listedUsers.users.find((user) => user.id === createdUser);
  assert.ok(listedUser, "created user should be listed");
  assert.equal(listedUser.venueId, venue.id);
  assert.equal(listedUser.venueName, venue.nameFa);

  const userLogin = await login(firstIdentifier);
  assert.equal(userLogin.status, 200, "user should log in by identifier");
  const userCookie = cookie;

  cookie = adminCookie;
  const rotated = await json(`/api/users/${createdUser}/rotate`, {
    method: "POST",
    body: {},
  });
  assert.match(rotated.identifier, /^mofe_[0-9a-f]{32}$/);
  assert.notEqual(rotated.identifier, firstIdentifier);
  cookie = userCookie;
  const revoked = await request("/api/venues");
  assert.equal(revoked.status, 401, "rotation should revoke the old session");

  const oldLogin = await login(firstIdentifier);
  assert.equal(oldLogin.status, 401, "rotated identifier should stop working");
  const newLogin = await login(rotated.identifier);
  assert.equal(newLogin.status, 200, "new identifier should work");
  const newUserCookie = cookie;

  const userVenues = await json("/api/venues");
  assert.equal(userVenues.user.role, "user");
  assert.equal(userVenues.venues.length, 1, "user should see one venue");
  assert.equal(userVenues.venues[0].id, venue.id);
  const userMenu = await request(`/api/venues/${venue.id}/menu`);
  assert.equal(userMenu.status, 200, "user should read the assigned menu");
  const otherMenu = await request("/api/venues/999999/menu");
  assert.equal(otherMenu.status, 403, "user should not read another venue");
  const userCreateVenue = await request("/api/venues", {
    method: "POST",
    body: { slug: venue.slug, nameFa: "x" },
  });
  assert.equal(userCreateVenue.status, 403, "user should not create a venue");
  const userListUsers = await request("/api/users");
  assert.equal(userListUsers.status, 403, "user should not list users");
  const userCreateUser = await request("/api/users", { method: "POST", body: {} });
  assert.equal(userCreateUser.status, 403, "user should not create users");

  cookie = adminCookie;
  await json(`/api/users/${createdUser}`, {
    method: "PUT",
    body: { venueId: null },
  });
  cookie = newUserCookie;
  const noVenues = await json("/api/venues");
  assert.equal(noVenues.venues.length, 0, "unassigned user should have no venues");
  const noMenu = await request(`/api/venues/${venue.id}/menu`);
  assert.equal(noMenu.status, 403, "unassigned user should lose venue access");

  cookie = adminCookie;
  await json(`/api/users/${createdUser}`, {
    method: "PUT",
    body: { venueId: venue.id },
  });
  const removed = await request(`/api/users/${createdUser}`, { method: "DELETE" });
  assert.equal(removed.status, 200, "admin should delete a user");
  createdUser = null;
  cookie = newUserCookie;
  const deletedSession = await request("/api/venues");
  assert.equal(deletedSession.status, 401, "deleted user session should be invalid");
  const deletedLogin = await login(rotated.identifier);
  assert.equal(deletedLogin.status, 401, "deleted user should not log in");
  cookie = adminCookie;

  const before = await json(`/api/venues/${venue.id}/menu`);
  assert.ok(before.venue?.nameFa, "venue should be present");
  assert.ok(Array.isArray(before.categories), "categories should be an array");

  const menu = await request(`/m/${venue.slug}`);
  assert.equal(menu.status, 200, "public menu should load");

  const html = await request(`/m/${venue.slug}/export/menu.html`);
  assert.equal(html.status, 200, "HTML export should load");
  assert.match(html.headers.get("content-disposition") || "", /attachment/);

  const csv = await request(`/m/${venue.slug}/export/menu.csv`);
  assert.equal(csv.status, 200, "CSV export should load");
  const csvBytes = new Uint8Array(await csv.arrayBuffer());
  assert.deepEqual(
    [...csvBytes.slice(0, 3)],
    [0xef, 0xbb, 0xbf],
    "CSV should start with a UTF-8 BOM",
  );
  const csvText = new TextDecoder().decode(csvBytes);
  assert.match(csvText, /category,name_fa/);

  const missing = await request(`/m/definitely-missing-${suffix}`);
  assert.equal(missing.status, 404, "unknown venue should 404");

  const category = await json(`/api/venues/${venue.id}/categories`, {
    method: "POST",
    body: { nameFa: `تست ${suffix}` },
  });
  createdCategory = category.id;

  const first = await json(`/api/venues/${venue.id}/items`, {
    method: "POST",
    body: {
      categoryId: createdCategory,
      nameFa: `آیتم یک ${suffix}`,
      nameEn: "Smoke One",
      description: "تست خودکار",
      priceToman: 123000,
      isSoldOut: false,
      variants: [
        { nameFa: "دبل", nameEn: "Double", priceDelta: 20000 },
        { nameFa: "تریپل", nameEn: "Triple", priceDelta: 30000 },
      ],
    },
  });
  createdItems.push(first.id);

  const createdMenu = await json(`/api/venues/${venue.id}/menu`);
  const createdFirst = createdMenu.categories
    .find((entry) => entry.id === createdCategory)
    .items.find((item) => item.id === first.id);
  assert.deepEqual(
    createdFirst.variants.map((variant) => variant.nameFa),
    ["دبل", "تریپل"],
    "multiple variants should be attached to the new item",
  );

  const second = await json(`/api/venues/${venue.id}/items`, {
    method: "POST",
    body: {
      categoryId: createdCategory,
      nameFa: `آیتم دو ${suffix}`,
      nameEn: "",
      description: "",
      priceToman: 456000,
      isSoldOut: true,
      variants: [],
    },
  });
  createdItems.push(second.id);

  await json(`/api/venues/${venue.id}/items/order`, {
    method: "PUT",
    body: { categoryId: createdCategory, ids: [second.id, first.id] },
  });

  await json(`/api/venues/${venue.id}/items/${first.id}`, {
    method: "PUT",
    body: {
      categoryId: createdCategory,
      nameFa: `آیتم یک ویرایش ${suffix}`,
      nameEn: "Smoke One",
      description: "ویرایش شد",
      priceToman: 124000,
      isSoldOut: true,
      variants: [{ nameFa: "تریپل", nameEn: "Triple", priceDelta: 30000 }],
    },
  });

  const after = await json(`/api/venues/${venue.id}/menu`);
  const testCategory = after.categories.find((entry) => entry.id === createdCategory);
  assert.ok(testCategory, "created category should be returned");
  assert.deepEqual(testCategory.items.map((item) => item.id), [second.id, first.id]);
  const edited = testCategory.items.find((item) => item.id === first.id);
  assert.equal(edited.nameFa, `آیتم یک ویرایش ${suffix}`);
  assert.equal(edited.isSoldOut, true);
  assert.equal(edited.variants.length, 1, "variant replacement should remove old rows");
  assert.equal(edited.variants[0].nameFa, "تریپل");

  const firstDelete = await request(`/api/venues/${venue.id}/items/${first.id}`, { method: "DELETE" });
  assert.equal(firstDelete.status, 200, "item delete should succeed");
  createdItems.splice(createdItems.indexOf(first.id), 1);

  const deletedCategoryId = createdCategory;
  const deleted = await request(`/api/venues/${venue.id}/categories/${deletedCategoryId}`, { method: "DELETE" });
  assert.equal(deleted.status, 200, "category delete with items should succeed");
  createdCategory = null;
  createdItems.length = 0;

  const afterCategoryDelete = await json(`/api/venues/${venue.id}/menu`);
  assert.ok(
    !afterCategoryDelete.categories.some((entry) => entry.id === deletedCategoryId),
    "deleted category should be gone with its items",
  );

  const logout = await request("/api/logout", { method: "POST", body: {} });
  assert.equal(logout.status, 200, "logout should succeed");
  cookie = "";
  const afterLogout = await request("/api/venues");
  assert.equal(afterLogout.status, 401, "API should require auth after logout");

  console.log("Smoke test passed: admin/user auth, user management, venue scoping, public menu, exports, venue-scoped category/item CRUD, reorder, delete.");
} finally {
  await cleanup();
}
