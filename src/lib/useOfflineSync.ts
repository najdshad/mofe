"use client";

import { useState, useEffect, useCallback } from "react";
import { getQueueLength, replayQueue } from "./offline-queue";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(getQueueLength());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    await replayQueue();
    setPendingCount(getQueueLength());
    setIsSyncing(false);
  }, []);

  return { isOnline, pendingCount, isSyncing, sync };
}
