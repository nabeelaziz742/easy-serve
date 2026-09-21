"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";


import RoleGuard from "@/components/auth/RoleGuard";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <RoleGuard allowedRoles={["manager", "restaurant_owner", "super_admin", "waiter", "chef"]}>
      <div className="flex min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 text-gray-900">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

        <div className="flex-1 flex flex-col">
          <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
