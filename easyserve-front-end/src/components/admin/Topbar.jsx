"use client";

import { Menu } from "lucide-react";

export default function Topbar({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm flex items-center justify-between px-4 md:px-6 py-3">
      <div className="flex items-center gap-2">
        <button
          className="md:hidden p-2 rounded hover:bg-gray-100"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">Dashboard</h2>
      </div>

      <div className="flex items-center gap-3">
        <img
          src="https://i.pravatar.cc/40"
          alt="user"
          className="w-8 h-8 rounded-full"
        />
      </div>
    </header>
  );
}
