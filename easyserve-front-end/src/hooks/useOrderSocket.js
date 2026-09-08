"use client";

import { useRef } from "react";

/**
 * useOrderSocket
 * Safe fallback hook. EasyServe uses RTK Query live polling (3s) for seamless
 * synchronization across Customer, Waiter, Chef, and Manager interfaces.
 */
export default function useOrderSocket(_onMessage) {
  const socketRef = useRef(null);
  return socketRef;
}

