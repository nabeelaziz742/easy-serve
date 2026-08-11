"use client";

import React, { createContext, useContext, useState } from "react";
import clsx from "clsx";

const TabsContext = createContext(null);

export function Tabs({ defaultValue, children, className }) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={clsx("w-full", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }) {
  return (
    <div
      className={clsx(
        "flex gap-2 border-b mb-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children }) {
  const { activeTab, setActiveTab } = useContext(TabsContext);

  const isActive = activeTab === value;

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={clsx(
        "px-4 py-2 text-sm font-medium border-b-2 transition",
        isActive
          ? "border-green-900 text-green-900"
          : "border-transparent text-gray-500 hover:text-gray-900"
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }) {
  const { activeTab } = useContext(TabsContext);

  if (activeTab !== value) return null;

  return <div className="pt-4">{children}</div>;
}
