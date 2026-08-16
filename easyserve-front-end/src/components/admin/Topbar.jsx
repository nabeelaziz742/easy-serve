"use client";

import { LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { onLoggedOut } from "@/store/slices/authSlice";

export default function Topbar({ onMenuClick }) {
  const dispatch = useDispatch();
  const router = useRouter();

  const handleLogout = () => {
    dispatch(onLoggedOut());
    router.replace("/auth/login");
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md md:px-6">
      <div className="flex items-center gap-2">
        <button
          className="rounded-lg p-2 transition hover:bg-gray-100 md:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
          <p className="hidden text-xs text-gray-500 sm:block">Easy Serve Restaurant</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
        aria-label="Logout"
      >
        <LogOut className="h-4 w-4" />
        <span>Logout</span>
      </button>
    </header>
  );
}
