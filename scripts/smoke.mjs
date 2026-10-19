import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const base = (process.env.BASE_URL || "http://localhost:8787").replace(/\/$/, "");
const password = await getPassword();
let cookie = "";
const createdItems = [];
let createdCategory = null;

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

async function getPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  try {
    const vars = parseDevVars(await readFile(new URL("../.dev.vars", import.meta.url), "utf8"));
    return vars.ADMIN_PASSWORD;
  } catch {
    throw new Error("Set ADMIN_PASSWORD or create .dev.vars before running the smoke test.");
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

async function cleanup() {
  for (const id of createdItems.splice(0)) {
    await request(`/api/items/${id}`, { method: "DELETE" }).catch(() => {});
  }
  if (createdCategory) {
    await request(`/api/categories/${createdCategory}`, { method: "DELETE" }).catch(() => {});
    createdCategory = null;
  }
}

try {
  const home = await request("/");
  assert.equal(home.status, 200, "public menu should load");
  assert.match(await home.text(), /mofé/);

  const admin = await request("/admin");
  assert.equal(admin.status, 200, "admin shell should load");
  assert.match(await admin.text(), /admin\.js/);

  const html = await request("/export/menu.html");
  assert.equal(html.status, 200, "HTML export should load");
  assert.match(html.headers.get("content-disposition") || "", /attachment/);

  const csv = await request("/export/menu.csv");
  assert.equal(csv.status, 200, "CSV export should load");
  const csvBytes = new Uint8Array(await csv.arrayBuffer());
  assert.deepEqual(
    [...csvBytes.slice(0, 3)],
    [0xef, 0xbb, 0xbf],
    "CSV should start with a UTF-8 BOM",
  );
  const csvText = new TextDecoder().decode(csvBytes);
  assert.match(csvText, /category,name_fa/);

  const login = await request("/api/login", { method: "POST", body: { password } });
  assert.equal(login.status, 200, "login should succeed");
  assert.ok(cookie, "login should set a session cookie");

  const before = await json("/api/menu");
  assert.ok(before.settings?.nameFa, "settings should be present");
  assert.ok(Array.isArray(before.categories), "categories should be an array");

  const suffix = Date.now().toString(36);
  const category = await json("/api/categories", {
    method: "POST",
    body: { nameFa: `تست ${suffix}` },
  });
  createdCategory = category.id;

  const first = await json("/api/items", {
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

  const createdMenu = await json("/api/menu");
  const createdFirst = createdMenu.categories
    .find((entry) => entry.id === createdCategory)
    .items.find((item) => item.id === first.id);
  assert.deepEqual(
    createdFirst.variants.map((variant) => variant.nameFa),
    ["دبل", "تریپل"],
    "multiple variants should be attached to the new item",
  );

  const second = await json("/api/items", {
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

  await json("/api/items/order", {
    method: "PUT",
    body: { categoryId: createdCategory, ids: [second.id, first.id] },
  });

  await json(`/api/items/${first.id}`, {
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

  const after = await json("/api/menu");
  const testCategory = after.categories.find((entry) => entry.id === createdCategory);
  assert.ok(testCategory, "created category should be returned");
  assert.deepEqual(testCategory.items.map((item) => item.id), [second.id, first.id]);
  const edited = testCategory.items.find((item) => item.id === first.id);
  assert.equal(edited.nameFa, `آیتم یک ویرایش ${suffix}`);
  assert.equal(edited.isSoldOut, true);
  assert.equal(edited.variants.length, 1, "variant replacement should remove old rows");
  assert.equal(edited.variants[0].nameFa, "تریپل");

  for (const id of [first.id, second.id]) {
    const response = await request(`/api/items/${id}`, { method: "DELETE" });
    assert.equal(response.status, 200, "item delete should succeed");
  }
  createdItems.length = 0;

  const deleted = await request(`/api/categories/${createdCategory}`, { method: "DELETE" });
  assert.equal(deleted.status, 200, "empty category delete should succeed");
  createdCategory = null;

  const logout = await request("/api/logout", { method: "POST", body: {} });
  assert.equal(logout.status, 200, "logout should succeed");
  cookie = "";
  const unauthorised = await request("/api/menu");
  assert.equal(unauthorised.status, 401, "API should require auth after logout");

  console.log("Smoke test passed: public, exports, auth, category/item CRUD, reorder, delete.");
} finally {
  await cleanup();
}
