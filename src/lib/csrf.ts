import { cookies } from "next/headers";

export const CSRF_COOKIE_NAME = "mofe_csrf";
export const CSRF_HEADER_NAME = "X-CSRF-Token";

export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const csrfCookieOptions = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 60 * 60,
};

export async function validateCsrf(): Promise<void> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const headersList = await (await import("next/headers")).headers();
  const headerToken = headersList.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new Error("CSRF token validation failed");
  }
}
