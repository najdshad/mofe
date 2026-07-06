import { NextResponse } from "next/server";

const ORDERING_SERVICE_URL = process.env.ORDERING_SERVICE_URL || "http://localhost:8080";

interface ProxyOptions {
  method?: string;
  body?: unknown;
  cookie: string;
  venueId: string;
}

export async function proxyToOrdering(
  path: string,
  options: ProxyOptions
) {
  let res: Response;
  try {
    res = await fetch(`${ORDERING_SERVICE_URL}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Venue-ID": options.venueId,
        Cookie: options.cookie,
        Origin: "http://localhost:3000",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    return NextResponse.json(
      { error: "سرویس سفارش‌گیری در دسترس نیست", code: "ORDERING_SERVICE_UNAVAILABLE" },
      { status: 503 },
    );
  }
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
