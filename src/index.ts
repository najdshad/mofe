import adminHtml from "./admin.html";
import menuTemplate from "./menu.template.html";
import {
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_MS,
  SESSION_TTL_MS,
  clearSessionCookie,
  isSecureRequest,
  parseCookies,
  passwordMatches,
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
  deleteCategory,
  deleteItem,
  getLoginAttempt,
  getMenu,
  recordLoginFailure,
  renameCategory,
  reorderCategories,
  reorderItems,
  saveSettings,
  updateItem,
  validateCategoryInput,
  validateItemInput,
  validateReorderIds,
  validateSettings,
} from "./db";
import { renderCsv, renderMenu } from "./render";
import type { Env } from "./types";

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

function errorResponse(
  status: number,
  message: string,
  itemCount?: number,
): Response {
  const body: Record<string, unknown> = { error: message };
  if (typeof itemCount === "number") body.itemCount = itemCount;
  return json(body, status);
}

async function requireAuth(request: Request, env: Env): Promise<Response | null> {
  if (!env.SESSION_SECRET) {
    return errorResponse(500, "پیکربندی سرور ناقص است.");
  }
  const value = parseCookies(request.headers.get("cookie"))[SESSION_COOKIE];
  if (!(await verifySession(value, env.SESSION_SECRET))) {
    return errorResponse(401, "دسترسی غیرمجاز است.");
  }
  return null;
}

function checkMutation(request: Request): Response | null {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.split(";")[0].trim().toLowerCase() !== "application/json") {
    return errorResponse(400, "درخواست باید از نوع JSON باشد.");
  }
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return errorResponse(400, "منبع درخواست نامعتبر است.");
  }
  return null;
}

async function guardMutation(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const csrfError = checkMutation(request);
  if (csrfError) return csrfError;
  return requireAuth(request, env);
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
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return errorResponse(500, "پیکربندی سرور ناقص است.");
  }

  const ip = request.headers.get("CF-Connecting-IP")?.trim() || "local";
  const now = Date.now();
  const attempt = await getLoginAttempt(env.DB, ip);
  if (
    attempt &&
    attempt.resetAt > now &&
    attempt.count >= LOGIN_MAX_FAILURES
  ) {
    return errorResponse(
      429,
      "تلاش‌های ناموفق بیش از حد مجاز است؛ بعداً دوباره تلاش کنید.",
    );
  }

  const body = bodyRecord(await readJson(request));
  const password = body.password;
  if (typeof password !== "string") {
    throw new ApiError(400, "رمز عبور الزامی است.");
  }

  if (!(await passwordMatches(password, env.ADMIN_PASSWORD))) {
    await recordLoginFailure(env.DB, ip, now, LOGIN_WINDOW_MS);
    return errorResponse(401, "رمز عبور نادرست است.");
  }

  await clearLoginAttempts(env.DB, ip);
  const expiresAt = now + SESSION_TTL_MS;
  const signature = await signSession(expiresAt, env.SESSION_SECRET);
  return json(
    { ok: true },
    200,
    {
      "Set-Cookie": sessionCookie(
        expiresAt,
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

async function serveMenu(env: Env): Promise<Response> {
  const { settings, categories } = await getMenu(env.DB);
  const html = renderMenu(menuTemplate, settings, categories);
  return new Response(html, {
    headers: htmlHeaders(MENU_CSP, "public, max-age=30", false),
  });
}

async function exportMenuHtml(env: Env): Promise<Response> {
  const { settings, categories } = await getMenu(env.DB);
  const html = renderMenu(menuTemplate, settings, categories);
  const headers = htmlHeaders(MENU_CSP, "no-store", false);
  headers.set("Content-Disposition", 'attachment; filename="menu.html"');
  return new Response(html, { headers });
}

async function exportMenuCsv(env: Env): Promise<Response> {
  const { categories } = await getMenu(env.DB);
  const csv = renderCsv(categories);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="menu.csv"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

async function handleApi(
  request: Request,
  env: Env,
  path: string,
): Promise<Response> {
  const method = request.method;

  if (path === "/api/login" && method === "POST") {
    const csrfError = checkMutation(request);
    if (csrfError) return csrfError;
    return handleLogin(request, env);
  }

  if (path === "/api/logout" && method === "POST") {
    const csrfError = checkMutation(request);
    if (csrfError) return csrfError;
    return handleLogout(request);
  }

  if (path === "/api/menu" && method === "GET") {
    const authError = await requireAuth(request, env);
    if (authError) return authError;
    return json(await getMenu(env.DB));
  }

  if (path === "/api/settings" && method === "PUT") {
    const authError = await guardMutation(request, env);
    if (authError) return authError;
    await saveSettings(env.DB, validateSettings(await readJson(request)));
    return json({ ok: true });
  }

  if (path === "/api/categories/order" && method === "PUT") {
    const authError = await guardMutation(request, env);
    if (authError) return authError;
    const body = bodyRecord(await readJson(request));
    await reorderCategories(env.DB, validateReorderIds(body.ids));
    return json({ ok: true });
  }

  if (path === "/api/categories" && method === "POST") {
    const authError = await guardMutation(request, env);
    if (authError) return authError;
    const body = bodyRecord(await readJson(request));
    const id = await createCategory(
      env.DB,
      validateCategoryInput(body),
    );
    return json({ ok: true, id });
  }

  const categoryMatch = /^\/api\/categories\/([^/]+)$/.exec(path);
  if (categoryMatch && method === "PUT") {
    const authError = await guardMutation(request, env);
    if (authError) return authError;
    const id = readId(categoryMatch[1]);
    const body = bodyRecord(await readJson(request));
    await renameCategory(env.DB, id, validateCategoryInput(body));
    return json({ ok: true });
  }

  if (categoryMatch && method === "DELETE") {
    const authError = await guardMutation(request, env);
    if (authError) return authError;
    await deleteCategory(env.DB, readId(categoryMatch[1]));
    return json({ ok: true });
  }

  if (path === "/api/items/order" && method === "PUT") {
    const authError = await guardMutation(request, env);
    if (authError) return authError;
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
      categoryId,
      validateReorderIds(body.ids),
    );
    return json({ ok: true });
  }

  if (path === "/api/items" && method === "POST") {
    const authError = await guardMutation(request, env);
    if (authError) return authError;
    const id = await createItem(
      env.DB,
      validateItemInput(await readJson(request)),
    );
    return json({ ok: true, id });
  }

  const itemMatch = /^\/api\/items\/([^/]+)$/.exec(path);
  if (itemMatch && method === "PUT") {
    const authError = await guardMutation(request, env);
    if (authError) return authError;
    const id = readId(itemMatch[1]);
    await updateItem(
      env.DB,
      id,
      validateItemInput(await readJson(request)),
    );
    return json({ ok: true });
  }

  if (itemMatch && method === "DELETE") {
    const authError = await guardMutation(request, env);
    if (authError) return authError;
    await deleteItem(env.DB, readId(itemMatch[1]));
    return json({ ok: true });
  }

  return errorResponse(404, "مسیر یافت نشد.");
}

async function handle(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);

  if (request.method === "GET" && pathname === "/") {
    return serveMenu(env);
  }
  if (request.method === "GET" && pathname === "/admin") {
    return new Response(adminHtml, {
      headers: htmlHeaders(ADMIN_CSP, "no-store", true),
    });
  }
  if (request.method === "GET" && pathname === "/export/menu.html") {
    return exportMenuHtml(env);
  }
  if (request.method === "GET" && pathname === "/export/menu.csv") {
    return exportMenuCsv(env);
  }
  if (pathname.startsWith("/api/")) {
    return handleApi(request, env, pathname);
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
          return errorResponse(error.status, error.message, error.itemCount);
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
