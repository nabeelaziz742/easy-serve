"use client";

import { useEffect, useRef } from "react";
import { connectOrderSocket } from "@/lib/websocket";

export default function useOrderSocket(onMessage) {
  const socketRef = useRef(null);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) return;

    socketRef.current = connectOrderSocket(token, (payload) => {
      if (onMessage) onMessage(payload);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [onMessage]);

  return socketRef;
}
