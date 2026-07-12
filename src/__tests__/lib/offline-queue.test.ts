import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

const store: Record<string, string> = {};
const mockStorage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const k in store) delete store[k];
  }),
};

let uuidCounter = 0;
vi.stubGlobal("window", {});
vi.stubGlobal("localStorage", mockStorage);
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => `test-uuid-${++uuidCounter}`),
});

import {
  addToQueue,
  getQueue,
  removeFromQueue,
  getQueueLength,
  clearQueue,
  replayQueue,
} from "@/lib/offline-queue";

describe("offline-queue", () => {
  beforeEach(() => {
    for (const k in store) delete store[k];
    uuidCounter = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("addToQueue", () => {
    it("stores a new operation in the queue", () => {
      addToQueue("/api/orders", "POST", { tableNumber: "5", guestCount: 1 });

      const queue = getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].url).toBe("/api/orders");
      expect(queue[0].method).toBe("POST");
      expect(JSON.parse(queue[0].body!)).toEqual({ tableNumber: "5", guestCount: 1 });
      expect(queue[0].id).toBeTruthy();
      expect(queue[0].createdAt).toBeGreaterThan(0);
      expect(queue[0].retries).toBe(0);
    });

    it("stores a DELETE operation without body", () => {
      addToQueue("/api/orders/order-1/items/item-1", "DELETE", null);

      const queue = getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].method).toBe("DELETE");
      expect(queue[0].body).toBeNull();
    });

    it("stores multiple operations in order", () => {
      addToQueue("/api/orders", "POST", { tableNumber: "5" });
      addToQueue("/api/orders/order-1/send", "POST", null);

      const queue = getQueue();
      expect(queue).toHaveLength(2);
      expect(queue[0].url).toBe("/api/orders");
      expect(queue[1].url).toBe("/api/orders/order-1/send");
    });

    it("stores operations with tempOrderId", () => {
      addToQueue("/api/orders", "POST", { tableNumber: "5" }, "temp-order-abc");

      const queue = getQueue();
      expect(queue[0].tempOrderId).toBe("temp-order-abc");
    });

    it("persists to localStorage", () => {
      addToQueue("/api/orders", "POST", { tableNumber: "3" });

      expect(mockStorage.setItem).toHaveBeenCalledOnce();
      const saved = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
      expect(saved).toHaveLength(1);
      expect(saved[0].url).toBe("/api/orders");
    });
  });

  describe("getQueue", () => {
    it("returns an empty array when queue is empty", () => {
      expect(getQueue()).toEqual([]);
    });

    it("returns all stored operations", () => {
      addToQueue("/api/orders/1/complete", "POST", null);
      addToQueue("/api/orders/1/items", "POST", { menuItemId: "item-1" });

      const queue = getQueue();
      expect(queue).toHaveLength(2);
    });

    it("returns a copy (not reference) of the queue", () => {
      addToQueue("/api/orders", "POST", {});
      const queue = getQueue();
      queue.pop();
      expect(getQueue()).toHaveLength(1);
    });

    it("returns empty array when localStorage data is corrupted", () => {
      store["mofe_offline_queue"] = "not-valid-json";
      expect(getQueue()).toEqual([]);
    });
  });

  describe("removeFromQueue", () => {
    it("removes an operation by id", () => {
      addToQueue("/api/orders/1", "GET", null);
      addToQueue("/api/orders/2", "GET", null);

      const queue = getQueue();
      const idToRemove = queue[0].id;

      removeFromQueue(idToRemove);

      const remaining = getQueue();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(queue[1].id);
    });

    it("does nothing when id does not exist", () => {
      addToQueue("/api/orders/1", "GET", null);
      removeFromQueue("non-existent-id");
      expect(getQueue()).toHaveLength(1);
    });

    it("persists removal to localStorage", () => {
      addToQueue("/api/orders/1", "GET", null);
      const id = getQueue()[0].id;

      removeFromQueue(id);

      const saved = JSON.parse(store["mofe_offline_queue"]);
      expect(saved).toHaveLength(0);
    });
  });

  describe("getQueueLength", () => {
    it("returns 0 for empty queue", () => {
      expect(getQueueLength()).toBe(0);
    });

    it("returns the number of queued operations", () => {
      addToQueue("/api/orders/1", "GET", null);
      addToQueue("/api/orders/2", "GET", null);
      expect(getQueueLength()).toBe(2);
    });

    it("updates after removal", () => {
      addToQueue("/api/orders/1", "GET", null);
      addToQueue("/api/orders/2", "GET", null);
      removeFromQueue(getQueue()[0].id);
      expect(getQueueLength()).toBe(1);
    });
  });

  describe("clearQueue", () => {
    it("removes all operations", () => {
      addToQueue("/api/orders/1", "GET", null);
      addToQueue("/api/orders/2", "GET", null);

      clearQueue();

      expect(getQueue()).toEqual([]);
      expect(getQueueLength()).toBe(0);
    });

    it("removes the localStorage key", () => {
      addToQueue("/api/orders", "POST", {});
      clearQueue();
      expect(mockStorage.removeItem).toHaveBeenCalledWith("mofe_offline_queue");
    });
  });

  describe("replayQueue", () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("returns zero counts when queue is empty", async () => {
      const result = await replayQueue();
      expect(result).toEqual({ synced: 0, failed: 0 });
    });

    it("replays a single operation successfully", async () => {
      addToQueue("/api/orders", "POST", { tableNumber: "5" });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ orderId: "real-order-1" }),
      });

      const result = await replayQueue();

      expect(result).toEqual({ synced: 1, failed: 0 });
      expect(global.fetch).toHaveBeenCalledOnce();
      expect(getQueue()).toEqual([]); // queue cleared

      const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body)).toEqual({ tableNumber: "5" });
    });

    it("replays a GET operation", async () => {
      addToQueue("/api/orders?status=SENT", "GET", null);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await replayQueue();

      expect(result).toEqual({ synced: 1, failed: 0 });
      const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe("/api/orders?status=SENT");
    });

    it("replays a DELETE operation", async () => {
      addToQueue("/api/orders/order-1/items/item-1", "DELETE", null);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await replayQueue();
      expect(result).toEqual({ synced: 1, failed: 0 });

      const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(options.method).toBe("DELETE");
      expect(options.body).toBeUndefined();
    });

    it("replays operations in order", async () => {
      addToQueue("/api/orders", "POST", { tableNumber: "5" });
      addToQueue("/api/orders/new-order/send", "POST", null);

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ orderId: "real-new-order" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      global.fetch = fetchMock;

      const result = await replayQueue();

      expect(result).toEqual({ synced: 2, failed: 0 });
      expect(fetchMock.mock.calls[0][0]).toBe("/api/orders");
      expect(fetchMock.mock.calls[1][0]).toBe("/api/orders/new-order/send");
    });

    it("replaces tempOrderId in URLs of subsequent operations", async () => {
      addToQueue("/api/orders", "POST", { tableNumber: "5" }, "temp-123");
      addToQueue("/api/orders/temp-123/items", "POST", { menuItemId: "item-1" });

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ orderId: "real-456" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      global.fetch = fetchMock;

      const result = await replayQueue();

      expect(result).toEqual({ synced: 2, failed: 0 });
      expect(fetchMock.mock.calls[1][0]).toBe("/api/orders/real-456/items");
    });

    it("replaces tempOrderId using data.id as fallback", async () => {
      addToQueue("/api/orders", "POST", { tableNumber: "5" }, "temp-789");
      addToQueue("/api/orders/temp-789/send", "POST", null);

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "real-000" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      global.fetch = fetchMock;

      await replayQueue();

      expect(fetchMock.mock.calls[1][0]).toBe("/api/orders/real-000/send");
    });

    it("counts failed operations when fetch throws", async () => {
      addToQueue("/api/orders", "POST", { tableNumber: "5" });

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await replayQueue();

      expect(result).toEqual({ synced: 0, failed: 1 });
      // Failed items stay in the queue
      expect(getQueue()).toHaveLength(1);
    });

    it("counts failed operations on non-ok response", async () => {
      addToQueue("/api/orders", "POST", { tableNumber: "5" });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: "Service unavailable" }),
      });

      const result = await replayQueue();

      expect(result).toEqual({ synced: 0, failed: 1 });
      expect(getQueue()).toHaveLength(1);
      expect(getQueue()[0].retries).toBe(1);
    });

    it("handles mixed success and failure", async () => {
      addToQueue("/api/orders", "POST", { tableNumber: "5" });
      addToQueue("/api/orders/fail-me/send", "POST", null);
      addToQueue("/api/orders/order-3/complete", "POST", null);

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ orderId: "real-1" }),
        })
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      global.fetch = fetchMock;

      const result = await replayQueue();

      expect(result).toEqual({ synced: 2, failed: 1 });
      expect(getQueue()).toHaveLength(1);
      expect(getQueue()[0].url).toBe("/api/orders/fail-me/send");
    });
  });
});
