export class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "FetchError";
  }
}

export async function fetchApi(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new FetchError(body.error || `Request failed: ${res.status}`, res.status);
  }
  return res.json();
}
