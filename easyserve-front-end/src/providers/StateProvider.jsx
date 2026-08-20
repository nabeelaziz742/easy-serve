'use client'

import { makeStore } from "@/store";
import React, { useRef } from "react";
import { Provider } from "react-redux";

function StateProvider({ children }) {
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}

export default StateProvider;
