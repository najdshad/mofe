import { generateIdentifier, hashIdentifier } from "./auth";
import type {
  Category,
  Item,
  ItemInput,
  ManagedUser,
  MenuData,
  SettingsInput,
  User,
  UserInput,
  UserRole,
  Variant,
  VariantInput,
  Venue,
  VenueInput,
  VenueSummary,
} from "./types";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
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

export const VENUE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export function normalizeVenueSlug(value: unknown): string {
  if (typeof value !== "string") {
    fail("نام آدرس فقط می‌تواند شامل حروف کوچک انگلیسی، عدد و خط تیره باشد.");
  }
  const slug = value.trim().toLowerCase();
  if (!slug || !VENUE_SLUG_PATTERN.test(slug)) {
    fail("نام آدرس فقط می‌تواند شامل حروف کوچک انگلیسی، عدد و خط تیره باشد.");
  }
  return slug;
}

export function validateVenueInput(value: unknown): VenueInput {
  const data = asObject(value);
  return {
    slug: normalizeVenueSlug(requiredString(data.slug, "نام آدرس", 64)),
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

export function validateVenueAssignment(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  return requiredInt(value, "منو", 1, Number.MAX_SAFE_INTEGER);
}

export function validateUserInput(value: unknown): UserInput {
  const data = asObject(value);
  return {
    name: requiredString(data.name, "نام کاربر", 80),
    venueId: validateVenueAssignment(data.venueId),
  };
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

type VenueRow = {
  id: number;
  slug: string;
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

function mapVenue(row: VenueRow): Venue {
  return {
    id: row.id,
    slug: row.slug,
    nameFa: row.name_fa,
    nameEn: row.name_en,
    welcomeMessage: row.welcome_message,
    metaDescription: row.meta_description,
    logoDataUrl: row.logo_data_url,
  };
}

export async function listVenues(
  db: D1Database,
  onlyId?: number,
): Promise<VenueSummary[]> {
  const statement = onlyId === undefined
    ? db.prepare("SELECT id, slug, name_fa, name_en FROM venues ORDER BY id")
    : db
      .prepare("SELECT id, slug, name_fa, name_en FROM venues WHERE id = ? ORDER BY id")
      .bind(onlyId);
  const rows = await statement.all<{
    id: number;
    slug: string;
    name_fa: string;
    name_en: string | null;
  }>();
  return rows.results.map((row) => ({
    id: row.id,
    slug: row.slug,
    nameFa: row.name_fa,
    nameEn: row.name_en,
  }));
}

export async function getVenueBySlug(
  db: D1Database,
  slug: string,
): Promise<Venue | null> {
  const row = await db
    .prepare(
      "SELECT id, slug, name_fa, name_en, welcome_message, meta_description, logo_data_url FROM venues WHERE slug = ? COLLATE NOCASE",
    )
    .bind(slug)
    .first<VenueRow>();
  return row ? mapVenue(row) : null;
}

export async function isVenueSlugAvailable(
  db: D1Database,
  slug: string,
  excludeId = 0,
): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM venues WHERE slug = ? AND id <> ?")
    .bind(slug, excludeId)
    .first<{ id: number }>();
  return row === null;
}

export async function createVenue(
  db: D1Database,
  input: VenueInput,
): Promise<{ id: number; slug: string }> {
  try {
    const result = await db
      .prepare(
        "INSERT INTO venues (slug, name_fa, name_en, welcome_message, meta_description, logo_data_url) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(
        input.slug,
        input.nameFa,
        input.nameEn,
        input.welcomeMessage,
        input.metaDescription,
        input.logoDataUrl,
      )
      .run();
    return { id: result.meta.last_row_id, slug: input.slug };
  } catch (error) {
    if (isUniqueError(error)) {
      throw new ApiError(409, "این نام آدرس قبلاً استفاده شده است.");
    }
    throw error;
  }
}

export async function updateVenue(
  db: D1Database,
  id: number,
  input: VenueInput,
): Promise<void> {
  try {
    const result = await db
      .prepare(
        "UPDATE venues SET slug = ?, name_fa = ?, name_en = ?, welcome_message = ?, meta_description = ?, logo_data_url = ? WHERE id = ?",
      )
      .bind(
        input.slug,
        input.nameFa,
        input.nameEn,
        input.welcomeMessage,
        input.metaDescription,
        input.logoDataUrl,
        id,
      )
      .run();
    if (result.meta.changes === 0) {
      throw new ApiError(404, "منو یافت نشد.");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isUniqueError(error)) {
      throw new ApiError(409, "این نام آدرس قبلاً استفاده شده است.");
    }
    throw error;
  }
}

export async function getMenu(
  db: D1Database,
  venueId: number,
): Promise<MenuData> {
  const venueRow = await db
    .prepare(
      "SELECT id, slug, name_fa, name_en, welcome_message, meta_description, logo_data_url FROM venues WHERE id = ?",
    )
    .bind(venueId)
    .first<VenueRow>();
  if (!venueRow) throw new ApiError(404, "منو یافت نشد.");

  const [categoryRows, itemRows, variantRows] = await Promise.all([
    db
      .prepare(
        "SELECT id, name_fa, sort_order FROM categories WHERE venue_id = ? ORDER BY sort_order, id",
      )
      .bind(venueId)
      .all<CategoryRow>(),
    db
      .prepare(
        "SELECT i.id, i.category_id, i.name_fa, i.name_en, i.description, i.price_toman, i.is_sold_out, i.sort_order FROM items i JOIN categories c ON c.id = i.category_id WHERE c.venue_id = ? ORDER BY i.category_id, i.sort_order, i.id",
      )
      .bind(venueId)
      .all<ItemRow>(),
    db
      .prepare(
        "SELECT v.id, v.item_id, v.name_fa, v.name_en, v.price_delta, v.sort_order FROM variants v JOIN items i ON i.id = v.item_id JOIN categories c ON c.id = i.category_id WHERE c.venue_id = ? ORDER BY v.item_id, v.sort_order, v.id",
      )
      .bind(venueId)
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

  return { venue: mapVenue(venueRow), categories };
}

function isUniqueError(error: unknown): boolean {
  return (
    error instanceof Error && /unique constraint failed/i.test(error.message)
  );
}

export async function createCategory(
  db: D1Database,
  venueId: number,
  nameFa: string,
): Promise<number> {
  try {
    const row = await db
      .prepare(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM categories WHERE venue_id = ?",
      )
      .bind(venueId)
      .first<{ next: number }>();
    const result = await db
      .prepare(
        "INSERT INTO categories (venue_id, name_fa, sort_order) VALUES (?, ?, ?)",
      )
      .bind(venueId, nameFa, row?.next ?? 0)
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
  venueId: number,
  id: number,
  nameFa: string,
): Promise<void> {
  try {
    const result = await db
      .prepare(
        "UPDATE categories SET name_fa = ? WHERE id = ? AND venue_id = ?",
      )
      .bind(nameFa, id, venueId)
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
  venueId: number,
  id: number,
): Promise<void> {
  await assertCategory(db, venueId, id);

  await db.batch([
    db
      .prepare(
        "DELETE FROM variants WHERE item_id IN (SELECT i.id FROM items i JOIN categories c ON c.id = i.category_id WHERE i.category_id = ? AND c.venue_id = ?)",
      )
      .bind(id, venueId),
    db.prepare("DELETE FROM items WHERE category_id = ?").bind(id),
    db
      .prepare("DELETE FROM categories WHERE id = ? AND venue_id = ?")
      .bind(id, venueId),
  ]);
}

export async function reorderCategories(
  db: D1Database,
  venueId: number,
  ids: number[],
): Promise<void> {
  const rows = await db
    .prepare(
      "SELECT id FROM categories WHERE venue_id = ? ORDER BY sort_order, id",
    )
    .bind(venueId)
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
          "UPDATE categories SET sort_order = ? WHERE id = ? AND venue_id = ?",
        )
        .bind(index, id, venueId),
    ),
  );
}

async function assertCategory(
  db: D1Database,
  venueId: number,
  id: number,
): Promise<void> {
  const row = await db
    .prepare("SELECT c.id FROM categories c WHERE c.id = ? AND c.venue_id = ?")
    .bind(id, venueId)
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
  venueId: number,
  input: ItemInput,
): Promise<number> {
  await assertCategory(db, venueId, input.categoryId);
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
  venueId: number,
  id: number,
  input: ItemInput,
): Promise<void> {
  const existing = await db
    .prepare(
      "SELECT i.category_id, i.sort_order FROM items i JOIN categories c ON c.id = i.category_id WHERE i.id = ? AND c.venue_id = ?",
    )
    .bind(id, venueId)
    .first<{ category_id: number; sort_order: number }>();
  if (!existing) throw new ApiError(404, "آیتم یافت نشد.");

  await assertCategory(db, venueId, input.categoryId);
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
  venueId: number,
  id: number,
): Promise<void> {
  const existing = await db
    .prepare(
      "SELECT i.id FROM items i JOIN categories c ON c.id = i.category_id WHERE i.id = ? AND c.venue_id = ?",
    )
    .bind(id, venueId)
    .first<{ id: number }>();
  if (!existing) throw new ApiError(404, "آیتم یافت نشد.");

  await db.batch([
    db.prepare("DELETE FROM variants WHERE item_id = ?").bind(id),
    db.prepare("DELETE FROM items WHERE id = ?").bind(id),
  ]);
}

export async function reorderItems(
  db: D1Database,
  venueId: number,
  categoryId: number,
  ids: number[],
): Promise<void> {
  await assertCategory(db, venueId, categoryId);
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

type UserRow = {
  id: number;
  name: string;
  role: UserRole;
  venue_id: number | null;
  session_version: number;
};

type AdminRow = UserRow & { identifier_hash: string };

const USER_COLUMNS = "id, name, role, venue_id, session_version";

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    venueId: row.venue_id,
    sessionVersion: row.session_version,
  };
}

export async function getUserById(
  db: D1Database,
  id: number,
): Promise<User | null> {
  const row = await db
    .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`)
    .bind(id)
    .first<UserRow>();
  return row ? mapUser(row) : null;
}

export async function getUserByIdentifierHash(
  db: D1Database,
  hash: string,
): Promise<User | null> {
  const row = await db
    .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE identifier_hash = ?`)
    .bind(hash)
    .first<UserRow>();
  return row ? mapUser(row) : null;
}

export async function upsertAdminUser(
  db: D1Database,
  hash: string,
): Promise<User> {
  const existing = await db
    .prepare(
      `SELECT ${USER_COLUMNS}, identifier_hash FROM users WHERE role = 'admin'`,
    )
    .first<AdminRow>();

  if (!existing) {
    const result = await db
      .prepare(
        "INSERT INTO users (identifier_hash, name, role, venue_id) VALUES (?, 'مدیر', 'admin', NULL)",
      )
      .bind(hash)
      .run();
    return {
      id: result.meta.last_row_id,
      name: "مدیر",
      role: "admin",
      venueId: null,
      sessionVersion: 0,
    };
  }

  if (existing.identifier_hash === hash) return mapUser(existing);

  await db
    .prepare(
      "UPDATE users SET identifier_hash = ?, session_version = session_version + 1 WHERE id = ?",
    )
    .bind(hash, existing.id)
    .run();
  return { ...mapUser(existing), sessionVersion: existing.session_version + 1 };
}

async function assertVenueExists(
  db: D1Database,
  venueId: number,
): Promise<void> {
  const row = await db
    .prepare("SELECT id FROM venues WHERE id = ?")
    .bind(venueId)
    .first<{ id: number }>();
  if (!row) throw new ApiError(400, "منو یافت نشد.");
}

export async function listUsers(db: D1Database): Promise<ManagedUser[]> {
  const rows = await db
    .prepare(
      `SELECT u.id, u.name, u.venue_id, v.name_fa AS venue_name
       FROM users u
       LEFT JOIN venues v ON v.id = u.venue_id
       WHERE u.role = 'user'
       ORDER BY u.id`,
    )
    .all<{
      id: number;
      name: string;
      venue_id: number | null;
      venue_name: string | null;
    }>();
  return rows.results.map((row) => ({
    id: row.id,
    name: row.name,
    venueId: row.venue_id,
    venueName: row.venue_name,
  }));
}

export async function createUser(
  db: D1Database,
  input: UserInput,
): Promise<{ id: number; identifier: string }> {
  if (input.venueId !== null) await assertVenueExists(db, input.venueId);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const identifier = generateIdentifier();
    try {
      const result = await db
        .prepare(
          "INSERT INTO users (identifier_hash, name, role, venue_id) VALUES (?, ?, 'user', ?)",
        )
        .bind(await hashIdentifier(identifier), input.name, input.venueId)
        .run();
      return { id: result.meta.last_row_id, identifier };
    } catch (error) {
      if (!isUniqueError(error)) throw error;
    }
  }
  throw new Error("Could not generate a unique user identifier");
}

export async function rotateUserIdentifier(
  db: D1Database,
  id: number,
): Promise<string> {
  const row = await db
    .prepare("SELECT role FROM users WHERE id = ?")
    .bind(id)
    .first<{ role: UserRole }>();
  if (!row) throw new ApiError(404, "کاربر یافت نشد.");
  if (row.role === "admin") {
    throw new ApiError(403, "شناسه حساب مدیر قابل تغییر نیست.");
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const identifier = generateIdentifier();
    try {
      const result = await db
        .prepare(
          "UPDATE users SET identifier_hash = ?, session_version = session_version + 1 WHERE id = ?",
        )
        .bind(await hashIdentifier(identifier), id)
        .run();
      if (result.meta.changes === 0) {
        throw new ApiError(404, "کاربر یافت نشد.");
      }
      return identifier;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (!isUniqueError(error)) throw error;
    }
  }
  throw new Error("Could not generate a unique user identifier");
}

export async function updateUserVenue(
  db: D1Database,
  id: number,
  venueId: number | null,
): Promise<void> {
  const row = await db
    .prepare("SELECT role FROM users WHERE id = ?")
    .bind(id)
    .first<{ role: UserRole }>();
  if (!row) throw new ApiError(404, "کاربر یافت نشد.");
  if (row.role === "admin") {
    throw new ApiError(403, "دسترسی حساب مدیر قابل تغییر نیست.");
  }
  if (venueId !== null) await assertVenueExists(db, venueId);
  await db
    .prepare("UPDATE users SET venue_id = ? WHERE id = ?")
    .bind(venueId, id)
    .run();
}

export async function deleteUser(
  db: D1Database,
  id: number,
): Promise<void> {
  const row = await db
    .prepare("SELECT role FROM users WHERE id = ?")
    .bind(id)
    .first<{ role: UserRole }>();
  if (!row) throw new ApiError(404, "کاربر یافت نشد.");
  if (row.role === "admin") {
    throw new ApiError(403, "حساب مدیر قابل حذف نیست.");
  }
  await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
}
