import adminHtml from "./admin.html";
import menuTemplate from "./menu.template.html";
import {
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_MS,
  SESSION_TTL_MS,
  clearSessionCookie,
  hashIdentifier,
  isSecureRequest,
  parseCookies,
  secretMatches,
  sessionCookie,
  signSession,
  verifySession,
  SESSION_COOKIE,
} from "./auth";
import {
  ApiError,
  clearLoginAttempts,
  createCategory,
  createItem,
  createUser,
  createVenue,
  deleteCategory,
  deleteItem,
  deleteUser,
  getLoginAttempt,
  getMenu,
  getUserById,
  getUserByIdentifierHash,
  getVenueBySlug,
  isVenueSlugAvailable,
  listUsers,
  listVenues,
  normalizeVenueSlug,
  recordLoginFailure,
  renameCategory,
  reorderCategories,
  reorderItems,
  rotateUserIdentifier,
  updateItem,
  updateUserVenue,
  updateVenue,
  upsertAdminUser,
  validateCategoryInput,
  validateItemInput,
  validateReorderIds,
  validateUserInput,
  validateVenueAssignment,
  validateVenueInput,
} from "./db";
import { renderCsv, renderMenu } from "./render";
import type { Env, User } from "./types";

const MENU_CSP =
  "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const ADMIN_CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
const API_CSP = "default-src 'none'; base-uri 'none'; frame-ancestors 'none'";

function htmlHeaders(
  csp: string,
  cacheControl: string,
  noindex: boolean,
): Headers {
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": cacheControl,
    "Content-Security-Policy": csp,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  if (noindex) headers.set("X-Robots-Tag", "noindex");
  return headers;
}

function apiHeaders(): Headers {
  return new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Security-Policy": API_CSP,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex",
  });
}

function json(data: unknown, status = 200, extra?: Record<string, string>): Response {
  const headers = apiHeaders();
  if (extra) {
    for (const [name, value] of Object.entries(extra)) {
      headers.set(name, value);
    }
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function errorResponse(status: number, message: string): Response {
  return json({ error: message }, status);
}

async function requireUser(request: Request, env: Env): Promise<User> {
  if (!env.SESSION_SECRET) {
    throw new ApiError(500, "پیکربندی سرور ناقص است.");
  }
  const value = parseCookies(request.headers.get("cookie"))[SESSION_COOKIE];
  const session = await verifySession(value, env.SESSION_SECRET);
  if (!session) throw new ApiError(401, "دسترسی غیرمجاز است.");
  const user = await getUserById(env.DB, session.userId);
  if (!user || user.sessionVersion !== session.sessionVersion) {
    throw new ApiError(401, "دسترسی غیرمجاز است.");
  }
  return user;
}

async function requireAdmin(request: Request, env: Env): Promise<User> {
  const user = await requireUser(request, env);
  if (user.role !== "admin") {
    throw new ApiError(403, "این بخش فقط برای مدیر مجاز است.");
  }
  return user;
}

function requireVenueAccess(user: User, venueId: number): void {
  if (user.role !== "admin" && user.venueId !== venueId) {
    throw new ApiError(403, "دسترسی به این منو ندارید.");
  }
}

function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    venueId: user.venueId,
  };
}

function checkMutation(request: Request): void {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new ApiError(400, "درخواست باید از نوع JSON باشد.");
  }
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw new ApiError(400, "منبع درخواست نامعتبر است.");
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "داده‌های JSON نامعتبر است.");
  }
}

function bodyRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApiError(400, "داده‌های ورودی نامعتبر است.");
  }
  return value as Record<string, unknown>;
}

function readId(raw: string | undefined): number {
  if (!raw || !/^[1-9]\d*$/.test(raw)) {
    throw new ApiError(404, "مسیر یافت نشد.");
  }
  const id = Number(raw);
  if (!Number.isSafeInteger(id)) {
    throw new ApiError(404, "مسیر یافت نشد.");
  }
  return id;
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  if (!env.SESSION_SECRET) {
    throw new ApiError(500, "پیکربندی سرور ناقص است.");
  }
  const adminIdentifier = env.ADMIN_IDENTIFIER?.trim() ?? "";
  if (adminIdentifier.length < 16) {
    throw new ApiError(500, "پیکربندی سرور ناقص است.");
  }

  const ip = request.headers.get("CF-Connecting-IP")?.trim() || "local";
  const now = Date.now();
  const attempt = await getLoginAttempt(env.DB, ip);
  if (
    attempt &&
    attempt.resetAt > now &&
    attempt.count >= LOGIN_MAX_FAILURES
  ) {
    throw new ApiError(
      429,
      "تلاش‌های ناموفق بیش از حد مجاز است؛ بعداً دوباره تلاش کنید.",
    );
  }

  const body = bodyRecord(await readJson(request));
  if (typeof body.identifier !== "string") {
    throw new ApiError(400, "شناسه ورود الزامی است.");
  }
  const identifier = body.identifier.trim();
  if (!identifier || identifier.length > 200) {
    throw new ApiError(400, "شناسه ورود نامعتبر است.");
  }

  const hash = await hashIdentifier(identifier);
  let user: User | null = null;
  if (await secretMatches(identifier, adminIdentifier)) {
    user = await upsertAdminUser(env.DB, hash);
  } else {
    const candidate = await getUserByIdentifierHash(env.DB, hash);
    if (candidate && candidate.role === "user") user = candidate;
  }

  if (!user) {
    await recordLoginFailure(env.DB, ip, now, LOGIN_WINDOW_MS);
    throw new ApiError(401, "شناسه ورود نامعتبر است.");
  }

  await clearLoginAttempts(env.DB, ip);
  const expiresAt = now + SESSION_TTL_MS;
  const signature = await signSession(
    expiresAt,
    user.id,
    user.sessionVersion,
    env.SESSION_SECRET,
  );
  return json(
    { ok: true, user: publicUser(user) },
    200,
    {
      "Set-Cookie": sessionCookie(
        expiresAt,
        user.id,
        user.sessionVersion,
        signature,
        isSecureRequest(request),
      ),
    },
  );
}

function handleLogout(request: Request): Response {
  return json(
    { ok: true },
    200,
    { "Set-Cookie": clearSessionCookie(isSecureRequest(request)) },
  );
}

function venueNotFound(): Response {
  return new Response("منو یافت نشد", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function loadVenueMenu(env: Env, slug: string) {
  const venue = await getVenueBySlug(env.DB, slug);
  if (!venue) return null;
  const { categories } = await getMenu(env.DB, venue.id);
  return { venue, categories };
}

async function serveMenu(env: Env, slug: string): Promise<Response> {
  const data = await loadVenueMenu(env, slug);
  if (!data) return venueNotFound();
  const html = renderMenu(menuTemplate, data.venue, data.categories);
  return new Response(html, {
    headers: htmlHeaders(MENU_CSP, "public, max-age=30", false),
  });
}

async function exportMenuHtml(env: Env, slug: string): Promise<Response> {
  const data = await loadVenueMenu(env, slug);
  if (!data) return venueNotFound();
  const html = renderMenu(menuTemplate, data.venue, data.categories);
  const headers = htmlHeaders(MENU_CSP, "no-store", false);
  headers.set("Content-Disposition", `attachment; filename="${slug}-menu.html"`);
  return new Response(html, { headers });
}

async function exportMenuCsv(env: Env, slug: string): Promise<Response> {
  const data = await loadVenueMenu(env, slug);
  if (!data) return venueNotFound();
  const csv = renderCsv(data.categories);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-menu.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

async function handleApi(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const method = request.method;
  const path = url.pathname;

  if (path === "/api/login" && method === "POST") {
    checkMutation(request);
    return handleLogin(request, env);
  }

  if (path === "/api/logout" && method === "POST") {
    checkMutation(request);
    return handleLogout(request);
  }

  if (path === "/api/venues/check" && method === "GET") {
    await requireUser(request, env);
    const slug = normalizeVenueSlug(url.searchParams.get("slug") ?? "");
    const excludeRaw = url.searchParams.get("exclude");
    let exclude = 0;
    if (excludeRaw !== null) {
      if (
        !/^[1-9]\d*$/.test(excludeRaw) ||
        !Number.isSafeInteger(Number(excludeRaw))
      ) {
        throw new ApiError(400, "شناسه نامعتبر است.");
      }
      exclude = Number(excludeRaw);
    }
    return json({ available: await isVenueSlugAvailable(env.DB, slug, exclude) });
  }

  if (path === "/api/venues" && method === "GET") {
    const user = await requireUser(request, env);
    const venues = await listVenues(
      env.DB,
      user.role === "admin" ? undefined : user.venueId ?? 0,
    );
    return json({ venues, user: publicUser(user) });
  }

  if (path === "/api/venues" && method === "POST") {
    checkMutation(request);
    await requireAdmin(request, env);
    const input = validateVenueInput(await readJson(request));
    const created = await createVenue(env.DB, input);
    return json({ ok: true, id: created.id, slug: created.slug });
  }

  if (path === "/api/users" && method === "GET") {
    await requireAdmin(request, env);
    return json({ users: await listUsers(env.DB) });
  }

  if (path === "/api/users" && method === "POST") {
    checkMutation(request);
    await requireAdmin(request, env);
    const input = validateUserInput(await readJson(request));
    const created = await createUser(env.DB, input);
    return json({
      ok: true,
      id: created.id,
      identifier: created.identifier,
    });
  }

  const userMatch = /^\/api\/users\/([^/]+)(\/rotate)?$/.exec(path);
  if (userMatch) {
    const userId = readId(userMatch[1]);
    const action = userMatch[2] ?? "";

    if (action === "/rotate" && method === "POST") {
      checkMutation(request);
      await requireAdmin(request, env);
      const identifier = await rotateUserIdentifier(env.DB, userId);
      return json({ ok: true, identifier });
    }

    if (action === "" && method === "PUT") {
      checkMutation(request);
      await requireAdmin(request, env);
      const body = bodyRecord(await readJson(request));
      await updateUserVenue(
        env.DB,
        userId,
        validateVenueAssignment(body.venueId),
      );
      return json({ ok: true });
    }

    if (action === "" && method === "DELETE") {
      checkMutation(request);
      await requireAdmin(request, env);
      await deleteUser(env.DB, userId);
      return json({ ok: true });
    }
  }

  const venueMatch = /^\/api\/venues\/([^/]+)(\/.*)?$/.exec(path);
  if (venueMatch) {
    const venueId = readId(venueMatch[1]);
    const rest = venueMatch[2] ?? "";
    const user = await requireUser(request, env);
    requireVenueAccess(user, venueId);

    if (rest === "/menu" && method === "GET") {
      return json(await getMenu(env.DB, venueId));
    }

    if (rest === "" && method === "PUT") {
      checkMutation(request);
      const input = validateVenueInput(await readJson(request));
      await updateVenue(env.DB, venueId, input);
      return json({ ok: true, slug: input.slug });
    }

    if (rest === "/categories" && method === "POST") {
      checkMutation(request);
      const id = await createCategory(
        env.DB,
        venueId,
        validateCategoryInput(bodyRecord(await readJson(request))),
      );
      return json({ ok: true, id });
    }

    if (rest === "/categories/order" && method === "PUT") {
      checkMutation(request);
      const body = bodyRecord(await readJson(request));
      await reorderCategories(env.DB, venueId, validateReorderIds(body.ids));
      return json({ ok: true });
    }

    const categoryMatch = /^\/categories\/([^/]+)$/.exec(rest);
    if (categoryMatch && method === "PUT") {
      checkMutation(request);
      const id = readId(categoryMatch[1]);
      const body = bodyRecord(await readJson(request));
      await renameCategory(env.DB, venueId, id, validateCategoryInput(body));
      return json({ ok: true });
    }

    if (categoryMatch && method === "DELETE") {
      checkMutation(request);
      await deleteCategory(env.DB, venueId, readId(categoryMatch[1]));
      return json({ ok: true });
    }

    if (rest === "/items" && method === "POST") {
      checkMutation(request);
      const id = await createItem(
        env.DB,
        venueId,
        validateItemInput(await readJson(request)),
      );
      return json({ ok: true, id });
    }

    if (rest === "/items/order" && method === "PUT") {
      checkMutation(request);
      const body = bodyRecord(await readJson(request));
      const categoryId = body.categoryId;
      if (
        typeof categoryId !== "number" ||
        !Number.isSafeInteger(categoryId) ||
        categoryId <= 0
      ) {
        throw new ApiError(400, "شناسه دسته نامعتبر است.");
      }
      await reorderItems(
        env.DB,
        venueId,
        categoryId,
        validateReorderIds(body.ids),
      );
      return json({ ok: true });
    }

    const itemMatch = /^\/items\/([^/]+)$/.exec(rest);
    if (itemMatch && method === "PUT") {
      checkMutation(request);
      const id = readId(itemMatch[1]);
      await updateItem(
        env.DB,
        venueId,
        id,
        validateItemInput(await readJson(request)),
      );
      return json({ ok: true });
    }

    if (itemMatch && method === "DELETE") {
      checkMutation(request);
      await deleteItem(env.DB, venueId, readId(itemMatch[1]));
      return json({ ok: true });
    }
  }

  return errorResponse(404, "مسیر یافت نشد.");
}

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (request.method === "GET" && pathname === "/") {
    return new Response(adminHtml, {
      headers: htmlHeaders(ADMIN_CSP, "no-store", true),
    });
  }
  if (request.method === "GET" && pathname === "/admin") {
    return Response.redirect(new URL("/", request.url).toString(), 302);
  }

  const menuMatch = /^\/m\/([^/]+)(\/.*)?$/.exec(pathname);
  if (request.method === "GET" && menuMatch) {
    const slug = menuMatch[1];
    const rest = menuMatch[2] ?? "";
    if (rest === "") return serveMenu(env, slug);
    if (rest === "/export/menu.html") return exportMenuHtml(env, slug);
    if (rest === "/export/menu.csv") return exportMenuCsv(env, slug);
  }

  if (pathname.startsWith("/api/")) {
    return handleApi(request, env, url);
  }

  return new Response("یافت نشد", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function errorPage(): Response {
  return new Response(
    "<!doctype html><html lang=\"fa\" dir=\"rtl\"><meta charset=\"utf-8\"><title>خطا</title><body><p>خطایی رخ داد. لطفاً دوباره تلاش کنید.</p></body></html>",
    {
      status: 500,
      headers: htmlHeaders(MENU_CSP, "no-store", true),
    },
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    try {
      return await handle(request, env);
    } catch (error) {
      if (error instanceof ApiError) {
        if (pathname.startsWith("/api/")) {
          return errorResponse(error.status, error.message);
        }
        return errorPage();
      }
      console.error(error);
      if (pathname.startsWith("/api/")) {
        return errorResponse(500, "خطای داخلی سرور.");
      }
      return errorPage();
    }
  },
} satisfies ExportedHandler<Env>;
