import type {
  Category,
  Item,
  ItemInput,
  MenuData,
  Settings,
  SettingsInput,
  Variant,
  VariantInput,
} from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly itemCount?: number;

  constructor(status: number, message: string, itemCount?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.itemCount = itemCount;
  }
}

function fail(message: string): never {
  throw new ApiError(400, message);
}

function asObject(value: unknown, label = "داده‌های ورودی"): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${label} نامعتبر است.`);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string, max: number): string {
  if (typeof value !== "string") fail(`${label} الزامی است.`);
  const trimmed = value.trim();
  if (!trimmed) fail(`${label} الزامی است.`);
  if (trimmed.length > max) fail(`${label} بیش از حد طولانی است.`);
  return trimmed;
}

function optionalString(
  value: unknown,
  label: string,
  max: number,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") fail(`${label} نامعتبر است.`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) fail(`${label} بیش از حد طولانی است.`);
  return trimmed;
}

function requiredInt(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    fail(`${label} نامعتبر است.`);
  }
  return value;
}

function requiredBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") fail(`${label} نامعتبر است.`);
  return value;
}

function requiredId(value: unknown, label: string): number {
  return requiredInt(value, label, 1, Number.MAX_SAFE_INTEGER);
}

export function validateCategoryInput(value: unknown): string {
  const data = asObject(value);
  return requiredString(data.nameFa, "نام دسته", 80);
}

export function validateReorderIds(value: unknown): number[] {
  if (!Array.isArray(value)) fail("فهرست ترتیب نامعتبر است.");
  const ids = value.map((id) => requiredId(id, "شناسه"));
  if (new Set(ids).size !== ids.length) {
    fail("فهرست ترتیب دارای شناسه تکراری است.");
  }
  return ids;
}

export function assertExactSet(
  current: readonly number[],
  requested: readonly number[],
): void {
  const currentSet = new Set(current);
  if (
    new Set(requested).size !== requested.length ||
    current.length !== requested.length ||
    requested.some((id) => !currentSet.has(id))
  ) {
    throw new ApiError(
      409,
      "ترتیب تغییر کرده است؛ صفحه را دوباره بارگذاری کنید.",
    );
  }
}

function isValidLogo(type: string, bytes: Uint8Array): boolean {
  if (type === "webp") {
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  if (type === "png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  return (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

export function validateLogo(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") fail("لوگو نامعتبر است.");
  if (!value) return null;
  if (value.length > 200_000) fail("حجم لوگو بیش از حد مجاز است.");

  const match = /^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(
    value,
  );
  if (!match) fail("فرمت لوگو نامعتبر است.");

  const type = match[1].toLowerCase();
  let bytes: Uint8Array;
  try {
    const binary = atob(match[2]);
    bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    fail("فرمت لوگو نامعتبر است.");
  }

  if (!isValidLogo(type, bytes)) fail("فرمت لوگو نامعتبر است.");
  return value;
}

export function validateSettings(value: unknown): SettingsInput {
  const data = asObject(value);
  return {
    nameFa: requiredString(data.nameFa, "نام کافه", 120),
    nameEn: optionalString(data.nameEn, "نام انگلیسی", 120),
    welcomeMessage: optionalString(data.welcomeMessage, "پیام خوش‌آمد", 500),
    metaDescription: optionalString(
      data.metaDescription,
      "توضیحات صفحه",
      300,
    ),
    logoDataUrl: validateLogo(data.logoDataUrl),
  };
}

export function validateItemInput(value: unknown): ItemInput {
  const data = asObject(value);
  const variantsRaw = data.variants ?? [];
  if (!Array.isArray(variantsRaw)) fail("فهرست گزینه‌ها نامعتبر است.");
  if (variantsRaw.length > 10) fail("تعداد گزینه‌ها بیش از حد مجاز است.");

  const variants: VariantInput[] = variantsRaw.map((variant, index) => {
    const item = asObject(variant, `گزینه ${index + 1}`);
    return {
      nameFa: requiredString(item.nameFa, `نام گزینه ${index + 1}`, 100),
      nameEn: optionalString(item.nameEn, `نام انگلیسی گزینه ${index + 1}`, 100),
      priceDelta: requiredInt(
        item.priceDelta,
        `اختلاف قیمت گزینه ${index + 1}`,
        -1_000_000_000,
        1_000_000_000,
      ),
    };
  });

  return {
    categoryId: requiredId(data.categoryId, "دسته"),
    nameFa: requiredString(data.nameFa, "نام آیتم", 200),
    nameEn: optionalString(data.nameEn, "نام انگلیسی آیتم", 200),
    description: optionalString(data.description, "توضیحات آیتم", 1000),
    priceToman: requiredInt(data.priceToman, "قیمت", 0, 1_000_000_000),
    isSoldOut: requiredBoolean(data.isSoldOut, "وضعیت موجودی"),
    variants,
  };
}

type SettingsRow = {
  name_fa: string;
  name_en: string | null;
  welcome_message: string | null;
  meta_description: string | null;
  logo_data_url: string | null;
};

type CategoryRow = { id: number; name_fa: string; sort_order: number };
type ItemRow = {
  id: number;
  category_id: number;
  name_fa: string;
  name_en: string | null;
  description: string | null;
  price_toman: number;
  is_sold_out: number;
  sort_order: number;
};
type VariantRow = {
  id: number;
  item_id: number;
  name_fa: string;
  name_en: string | null;
  price_delta: number;
  sort_order: number;
};

function mapSettings(row: SettingsRow | null): Settings {
  return {
    nameFa: row?.name_fa ?? "",
    nameEn: row?.name_en ?? null,
    welcomeMessage: row?.welcome_message ?? null,
    metaDescription: row?.meta_description ?? null,
    logoDataUrl: row?.logo_data_url ?? null,
  };
}

export async function getMenu(db: D1Database): Promise<MenuData> {
  const [settings, categoryRows, itemRows, variantRows] = await Promise.all([
    db
      .prepare(
        "SELECT name_fa, name_en, welcome_message, meta_description, logo_data_url FROM settings WHERE id = 1",
      )
      .first<SettingsRow>(),
    db
      .prepare(
        "SELECT id, name_fa, sort_order FROM categories ORDER BY sort_order, id",
      )
      .all<CategoryRow>(),
    db
      .prepare(
        "SELECT id, category_id, name_fa, name_en, description, price_toman, is_sold_out, sort_order FROM items ORDER BY category_id, sort_order, id",
      )
      .all<ItemRow>(),
    db
      .prepare(
        "SELECT id, item_id, name_fa, name_en, price_delta, sort_order FROM variants ORDER BY item_id, sort_order, id",
      )
      .all<VariantRow>(),
  ]);

  const categories: Category[] = categoryRows.results.map((row) => ({
    id: row.id,
    nameFa: row.name_fa,
    sortOrder: row.sort_order,
    items: [],
  }));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const itemsById = new Map<number, Item>();

  for (const row of itemRows.results) {
    const item: Item = {
      id: row.id,
      nameFa: row.name_fa,
      nameEn: row.name_en,
      description: row.description,
      priceToman: row.price_toman,
      isSoldOut: row.is_sold_out === 1,
      sortOrder: row.sort_order,
      variants: [],
    };
    itemsById.set(item.id, item);
    categoriesById.get(row.category_id)?.items.push(item);
  }

  for (const row of variantRows.results) {
    const variant: Variant = {
      id: row.id,
      nameFa: row.name_fa,
      nameEn: row.name_en,
      priceDelta: row.price_delta,
      sortOrder: row.sort_order,
    };
    itemsById.get(row.item_id)?.variants.push(variant);
  }

  return { settings: mapSettings(settings), categories };
}

function isUniqueError(error: unknown): boolean {
  return (
    error instanceof Error && /unique constraint failed/i.test(error.message)
  );
}

export async function createCategory(
  db: D1Database,
  nameFa: string,
): Promise<number> {
  try {
    const row = await db
      .prepare(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM categories",
      )
      .first<{ next: number }>();
    const result = await db
      .prepare("INSERT INTO categories (name_fa, sort_order) VALUES (?, ?)")
      .bind(nameFa, row?.next ?? 0)
      .run();
    return result.meta.last_row_id;
  } catch (error) {
    if (isUniqueError(error)) {
      throw new ApiError(409, "نام دسته تکراری است.");
    }
    throw error;
  }
}

export async function renameCategory(
  db: D1Database,
  id: number,
  nameFa: string,
): Promise<void> {
  try {
    const result = await db
      .prepare("UPDATE categories SET name_fa = ? WHERE id = ?")
      .bind(nameFa, id)
      .run();
    if (result.meta.changes === 0) {
      throw new ApiError(404, "دسته یافت نشد.");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isUniqueError(error)) {
      throw new ApiError(409, "نام دسته تکراری است.");
    }
    throw error;
  }
}

export async function deleteCategory(
  db: D1Database,
  id: number,
): Promise<void> {
  const row = await db
    .prepare("SELECT COUNT(*) AS count FROM items WHERE category_id = ?")
    .bind(id)
    .first<{ count: number }>();
  const itemCount = row?.count ?? 0;
  if (itemCount > 0) {
    throw new ApiError(
      409,
      "این دسته خالی نیست؛ ابتدا آیتم‌های آن را جابه‌جا یا حذف کنید.",
      itemCount,
    );
  }

  const result = await db
    .prepare("DELETE FROM categories WHERE id = ?")
    .bind(id)
    .run();
  if (result.meta.changes === 0) throw new ApiError(404, "دسته یافت نشد.");
}

export async function reorderCategories(
  db: D1Database,
  ids: number[],
): Promise<void> {
  const rows = await db
    .prepare("SELECT id FROM categories ORDER BY sort_order, id")
    .all<{ id: number }>();
  assertExactSet(
    rows.results.map((row) => row.id),
    ids,
  );
  if (ids.length === 0) return;

  await db.batch(
    ids.map((id, index) =>
      db
        .prepare("UPDATE categories SET sort_order = ? WHERE id = ?")
        .bind(index, id),
    ),
  );
}

async function assertCategory(db: D1Database, id: number): Promise<void> {
  const row = await db
    .prepare("SELECT id FROM categories WHERE id = ?")
    .bind(id)
    .first<{ id: number }>();
  if (!row) throw new ApiError(404, "دسته یافت نشد.");
}

async function nextItemOrder(
  db: D1Database,
  categoryId: number,
): Promise<number> {
  const row = await db
    .prepare(
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM items WHERE category_id = ?",
    )
    .bind(categoryId)
    .first<{ next: number }>();
  return row?.next ?? 0;
}

function variantInserts(
  db: D1Database,
  itemId: number,
  variants: VariantInput[],
): D1PreparedStatement[] {
  return variants.map((variant, index) =>
    db
      .prepare(
        "INSERT INTO variants (item_id, name_fa, name_en, price_delta, sort_order) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(
        itemId,
        variant.nameFa,
        variant.nameEn,
        variant.priceDelta,
        index,
      ),
  );
}

export async function createItem(
  db: D1Database,
  input: ItemInput,
): Promise<number> {
  await assertCategory(db, input.categoryId);
  const sortOrder = await nextItemOrder(db, input.categoryId);
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        "INSERT INTO items (category_id, name_fa, name_en, description, price_toman, is_sold_out, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        input.categoryId,
        input.nameFa,
        input.nameEn,
        input.description,
        input.priceToman,
        input.isSoldOut ? 1 : 0,
        sortOrder,
      ),
    ...input.variants.map((variant, index) =>
      db
        .prepare(
          // The batch is atomic; MAX(id) is the item inserted by the first statement.
          "INSERT INTO variants (item_id, name_fa, name_en, price_delta, sort_order) VALUES ((SELECT MAX(id) FROM items), ?, ?, ?, ?)",
        )
        .bind(variant.nameFa, variant.nameEn, variant.priceDelta, index),
    ),
  ];

  const results = await db.batch(statements);
  return results[0].meta.last_row_id;
}

export async function updateItem(
  db: D1Database,
  id: number,
  input: ItemInput,
): Promise<void> {
  const existing = await db
    .prepare("SELECT category_id, sort_order FROM items WHERE id = ?")
    .bind(id)
    .first<{ category_id: number; sort_order: number }>();
  if (!existing) throw new ApiError(404, "آیتم یافت نشد.");

  await assertCategory(db, input.categoryId);
  const sortOrder =
    existing.category_id === input.categoryId
      ? existing.sort_order
      : await nextItemOrder(db, input.categoryId);

  await db.batch([
    db
      .prepare(
        "UPDATE items SET category_id = ?, name_fa = ?, name_en = ?, description = ?, price_toman = ?, is_sold_out = ?, sort_order = ? WHERE id = ?",
      )
      .bind(
        input.categoryId,
        input.nameFa,
        input.nameEn,
        input.description,
        input.priceToman,
        input.isSoldOut ? 1 : 0,
        sortOrder,
        id,
      ),
    db.prepare("DELETE FROM variants WHERE item_id = ?").bind(id),
    ...variantInserts(db, id, input.variants),
  ]);
}

export async function deleteItem(
  db: D1Database,
  id: number,
): Promise<void> {
  const existing = await db
    .prepare("SELECT id FROM items WHERE id = ?")
    .bind(id)
    .first<{ id: number }>();
  if (!existing) throw new ApiError(404, "آیتم یافت نشد.");

  await db.batch([
    db.prepare("DELETE FROM variants WHERE item_id = ?").bind(id),
    db.prepare("DELETE FROM items WHERE id = ?").bind(id),
  ]);
}

export async function reorderItems(
  db: D1Database,
  categoryId: number,
  ids: number[],
): Promise<void> {
  await assertCategory(db, categoryId);
  const rows = await db
    .prepare(
      "SELECT id FROM items WHERE category_id = ? ORDER BY sort_order, id",
    )
    .bind(categoryId)
    .all<{ id: number }>();
  assertExactSet(
    rows.results.map((row) => row.id),
    ids,
  );
  if (ids.length === 0) return;

  await db.batch(
    ids.map((id, index) =>
      db
        .prepare(
          "UPDATE items SET sort_order = ? WHERE id = ? AND category_id = ?",
        )
        .bind(index, id, categoryId),
    ),
  );
}

export async function saveSettings(
  db: D1Database,
  settings: SettingsInput,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO settings (id, name_fa, name_en, welcome_message, meta_description, logo_data_url)
       VALUES (1, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name_fa = excluded.name_fa,
         name_en = excluded.name_en,
         welcome_message = excluded.welcome_message,
         meta_description = excluded.meta_description,
         logo_data_url = excluded.logo_data_url`,
    )
    .bind(
      settings.nameFa,
      settings.nameEn,
      settings.welcomeMessage,
      settings.metaDescription,
      settings.logoDataUrl,
    )
    .run();
}

export type LoginAttempt = { count: number; resetAt: number };

export async function getLoginAttempt(
  db: D1Database,
  ip: string,
): Promise<LoginAttempt | null> {
  const row = await db
    .prepare("SELECT count, reset_at FROM login_attempts WHERE ip = ?")
    .bind(ip)
    .first<{ count: number; reset_at: number }>();
  return row ? { count: row.count, resetAt: row.reset_at } : null;
}

export async function recordLoginFailure(
  db: D1Database,
  ip: string,
  now: number,
  windowMs: number,
): Promise<void> {
  const resetAt = now + windowMs;
  await db
    .prepare(
      `INSERT INTO login_attempts (ip, count, reset_at) VALUES (?, 1, ?)
       ON CONFLICT(ip) DO UPDATE SET
         count = CASE WHEN login_attempts.reset_at <= ? THEN 1 ELSE login_attempts.count + 1 END,
         reset_at = CASE WHEN login_attempts.reset_at <= ? THEN ? ELSE login_attempts.reset_at END`,
    )
    .bind(ip, resetAt, now, now, resetAt)
    .run();
}

export async function clearLoginAttempts(
  db: D1Database,
  ip: string,
): Promise<void> {
  await db.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
}
