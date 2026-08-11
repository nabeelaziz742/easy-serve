"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, List, Star, Table, X } from "lucide-react";
import { useSelector } from "react-redux"


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
};

export default function Sidebar({ open, setOpen }) {
  const { user } = useSelector((state) => state.auth);
  const role = user?.user_type || "waiter";
  
  const navItems = roleBasedNav[role];

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      <motion.aside
        initial={false}
        // animate={{ x: open ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 260, damping: 25 }}
        className="fixed md:static z-50 w-64 bg-white border-r border-gray-200 flex flex-col p-4 space-y-4"
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-lg font-semibold tracking-wide text-yellow-700">
            EasyServe
          </h1>
          <button onClick={() => setOpen(false)} className="md:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-2">
          {navItems.map(({ name, icon: Icon, href }) => (
            <Link
              key={name}
              href={href}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-yellow-50 transition text-gray-700 font-medium"
              onClick={() => setOpen(false)}
            >
              <Icon className="w-5 h-5 text-yellow-600" />
              <span>{name}</span>
            </Link>
          ))}
        </nav>
      </motion.aside>
    </>
  );
}
