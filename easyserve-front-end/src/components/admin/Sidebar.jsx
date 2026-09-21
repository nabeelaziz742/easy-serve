"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, List, Star, Table, X, Utensils } from "lucide-react";
import { useSelector } from "react-redux";

const roleBasedNav = {
  waiter: [
    { name: "Dashboard", icon: Home, href: "/admin/waiter" },
    { name: "Reviews", icon: Star, href: "/admin/reviews" },
    { name: "Orders", icon: List, href: "/admin/orders" },
    { name: "Tables", icon: Table, href: "/admin/tables" },
  ],
  chef: [
    { name: "Dashboard", icon: Home, href: "/admin/chef" },
    { name: "Reviews", icon: Star, href: "/admin/reviews" },
    { name: "Orders", icon: List, href: "/admin/orders" },
    { name: "Tables", icon: Table, href: "/admin/tables" },
  ],
  manager: [
    { name: "Dashboard", icon: Home, href: "/admin/manager" },
    { name: "Reviews", icon: Star, href: "/admin/reviews" },
    { name: "Orders", icon: List, href: "/admin/orders" },
    { name: "Tables", icon: Table, href: "/admin/tables" },
  ],
  restaurant_owner: [
    { name: "Dashboard", icon: Home, href: "/admin/manager" },
    { name: "Reviews", icon: Star, href: "/admin/reviews" },
    { name: "Orders", icon: List, href: "/admin/orders" },
    { name: "Tables", icon: Table, href: "/admin/tables" },
  ],
  super_admin: [
    { name: "Dashboard", icon: Home, href: "/admin/manager" },
    { name: "Reviews", icon: Star, href: "/admin/reviews" },
    { name: "Orders", icon: List, href: "/admin/orders" },
    { name: "Tables", icon: Table, href: "/admin/tables" },
  ],
};

export default function Sidebar({ open, setOpen }) {
  const pathname = usePathname();
  const { user } = useSelector((state) => state.auth);
  const role = (user?.user_type || user?.role || "waiter").toLowerCase();

  const navItems = roleBasedNav[role] || roleBasedNav.waiter || [];

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs"
        />
      )}

      <motion.aside
        initial={false}
        transition={{ type: "spring", stiffness: 260, damping: 25 }}
        className="fixed md:static z-50 w-64 bg-white border-r border-gray-200 flex flex-col p-4 space-y-4 min-h-screen shrink-0"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-black shadow-md font-bold">
              <Utensils size={18} />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-green-950">
                Easy Serve
              </h1>
              <p className="text-[10px] text-gray-500 capitalize">{role} Panel</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-700 md:hidden" aria-label="Close sidebar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-1.5 flex-1">
          {navItems.map(({ name, icon: Icon, href }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={name}
                href={href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-green-950 text-yellow-400 shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-green-950"
                }`}
                onClick={() => setOpen(false)}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-yellow-400" : "text-gray-500"}`} />
                <span>{name}</span>
              </Link>
            );
          })}
        </nav>
      </motion.aside>
    </>
  );
}
