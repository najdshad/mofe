"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export function useStatusMessage() {
  const [statusMessage, setStatusMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const showStatus = useCallback(
    (message: string) => {
      setStatusMessage(message);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setStatusMessage("");
        timerRef.current = null;
      }, 3000);
      router.refresh();
    },
    [router]
  );

  return { statusMessage, showStatus };
}
