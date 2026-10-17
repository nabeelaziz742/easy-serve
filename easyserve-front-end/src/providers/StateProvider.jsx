'use client'

import { makeStore } from "@/store";
import { onSessionRestored } from "@/store/slices/authSlice";
import { readSession } from "@/utilities/authStorage";
import React, { useEffect, useRef } from "react";
import { Provider } from "react-redux";

function StateProvider({ children }) {
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  // Restore this tab's persisted session once mounted (after hydration).
  useEffect(() => {
    storeRef.current.dispatch(onSessionRestored(readSession()));
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}

export default StateProvider;
