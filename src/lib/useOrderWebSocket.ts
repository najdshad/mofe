"use client";

import { useEffect, useRef } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

export function useOrderWebSocket(
  venueId: string,
  onEvent: (event: { type: string; payload: unknown }) => void,
  onReconnect?: () => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let wasConnected = false;

    function connect() {
      const ws = new WebSocket(`${WS_URL}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (wasConnected) {
          onReconnectRef.current?.();
        }
        wasConnected = true;
      };

      ws.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data);
          onEventRef.current(event);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [venueId]);
}
