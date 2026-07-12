"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { getQueueLength, replayQueue } from "./offline-queue";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function subscribeQueue(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

export function useOfflineSync() {
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

  const pendingCount = useSyncExternalStore(
    subscribeQueue,
    () => getQueueLength(),
    () => 0,
  );

  const [isSyncing, setIsSyncing] = useState(false);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    await replayQueue();
    setIsSyncing(false);
  }, []);

  return { isOnline, pendingCount, isSyncing, sync };
}
