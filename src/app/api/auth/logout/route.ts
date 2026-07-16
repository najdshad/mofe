import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { destroySession } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  try {
    await validateCsrf();
    await destroySession();
    return NextResponse.redirect(new URL("/login", request.url));
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
