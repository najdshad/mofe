"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export function useStatusMessage() {
  const [statusMessage, setStatusMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showStatus = useCallback((message: string) => {
    setStatusMessage(message);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setStatusMessage("");
      timerRef.current = null;
    }, 3000);
  }, []);

  return { statusMessage, showStatus };
}
