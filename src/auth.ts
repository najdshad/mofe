const encoder = new TextEncoder();

export const SESSION_COOKIE = "mofe_admin";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_FAILURES = 5;

function bytesOf(value: string | Uint8Array): Uint8Array {
  return typeof value === "string" ? encoder.encode(value) : value;
}

export function constantTimeEqual(
  a: string | Uint8Array,
  b: string | Uint8Array,
): boolean {
  const left = bytesOf(a);
  const right = bytesOf(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

export async function hashSha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(value)),
  );
}

export async function passwordMatches(
  provided: string,
  expected: string,
): Promise<boolean> {
  if (!expected) return false;
  const [left, right] = await Promise.all([
    hashSha256(provided),
    hashSha256(expected),
  ]);
  return constantTimeEqual(left, right);
}

export async function signSession(
  expiresAt: number,
  secret: string,
): Promise<string> {
  if (!secret) throw new Error("SESSION_SECRET is missing");
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    encoder.encode(String(expiresAt)),
  );
  return toHex(new Uint8Array(signature));
}

export async function verifySession(
  value: string | null | undefined,
  secret: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (!secret || !value) return false;
  const dot = value.indexOf(".");
  if (dot <= 0 || dot !== value.lastIndexOf(".")) return false;

  const expiresRaw = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  if (!/^\d+$/.test(expiresRaw) || !/^[0-9a-f]{64}$/i.test(signature)) {
    return false;
  }

  const expiresAt = Number(expiresRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return false;

  const expected = await signSession(expiresAt, secret);
  return constantTimeEqual(signature.toLowerCase(), expected);
}

export function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name && !(name in cookies)) cookies[name] = value;
  }
  return cookies;
}

function baseCookie(secure: boolean): string {
  return `Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function sessionCookie(
  expiresAt: number,
  signature: string,
  secure: boolean,
): string {
  return `${SESSION_COOKIE}=${expiresAt}.${signature}; Max-Age=${
    SESSION_TTL_MS / 1000
  }; ${baseCookie(secure)}`;
}

export function clearSessionCookie(secure: boolean): string {
  return `${SESSION_COOKIE}=; Max-Age=0; ${baseCookie(secure)}`;
}

export function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === "https:";
}
