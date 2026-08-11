'use client'

import store from "@/store";
import React from "react";
import { Provider } from "react-redux";

function StateProvider({ children }) {
  return <Provider store={store}>{children}</Provider>;
}

export default StateProvider;
