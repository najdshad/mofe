export class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "FetchError";
  }
}

function csrfHeaders(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(new RegExp("(^| )mofe_csrf=([^;]+)"));
  return match ? { "X-CSRF-Token": match[2] } : {};
}

export async function fetchApi(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...csrfHeaders(), ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new FetchError(body.error || `Request failed: ${res.status}`, res.status);
  }
  return res.json();
}
