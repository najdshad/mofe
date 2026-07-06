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
  const res = await fetch(`${ORDERING_SERVICE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Venue-ID": options.venueId,
      Cookie: `mofe_session=${options.cookie}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
