import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Unauthorized", 401);
  return user;
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
