import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await destroySession();
    return NextResponse.redirect(new URL("/login", request.url));
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
