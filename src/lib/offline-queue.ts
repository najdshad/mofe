"use client";

const STORAGE_KEY = "mofe_offline_queue";

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body: string | null;
  tempOrderId?: string;
  createdAt: number;
  retries: number;
}

export function getQueue(): QueuedRequest[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addToQueue(
  url: string,
  method: string,
  body: Record<string, unknown> | null,
  tempOrderId?: string,
): void {
  const queue = getQueue();
  queue.push({
    id: crypto.randomUUID(),
    url,
    method,
    body: body ? JSON.stringify(body) : null,
    tempOrderId,
    createdAt: Date.now(),
    retries: 0,
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function removeFromQueue(id: string): void {
  const queue = getQueue().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function getQueueLength(): number {
  return getQueue().length;
}

export function clearQueue(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function replayQueue(): Promise<{ synced: number; failed: number }> {
  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  const idMap = new Map<string, string>();

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    let url = item.url;
    for (const [tempId, realId] of idMap) {
      url = url.replace(tempId, realId);
    }

    try {
      const res = await fetch(url, {
        method: item.method,
        headers: { "Content-Type": "application/json" },
        body: item.body || undefined,
      });
      if (res.ok) {
        if (item.tempOrderId) {
          const data = await res.json().catch(() => ({}));
          const realOrderId = data.orderId || data.id;
          if (realOrderId) {
            idMap.set(item.tempOrderId, realOrderId);
          }
        }
        removeFromQueue(item.id);
        synced++;
      } else {
        incrementRetries(item.id);
        failed++;
      }
    } catch {
      incrementRetries(item.id);
      failed++;
    }
  }

  return { synced, failed };
}

function incrementRetries(id: string): void {
  const queue = getQueue();
  const item = queue.find((r) => r.id === id);
  if (item) {
    item.retries++;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }
}
