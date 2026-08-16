"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDispatch } from "react-redux";
import { useState } from "react";
import { onLoggedOut } from "@/store/slices/authSlice";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  ChefHat,
  Star,
  BarChart3,
  LogOut,
  User,
  Menu,
  Banknote,
} from "lucide-react";

const navItems = [
  { href: "/manager",           label: "Dashboard", icon: LayoutDashboard },
  { href: "/manager/menu",      label: "Menu",       icon: UtensilsCrossed },
  { href: "/manager/waiters",   label: "Waiters",    icon: Users },
  { href: "/manager/chefs",     label: "Chefs",      icon: ChefHat },
  { href: "/manager/reviews",   label: "Reviews",    icon: Star },
  { href: "/manager/analytics", label: "Analytics",  icon: BarChart3 },
  { href: "/manager/cash",      label: "Cash",       icon: Banknote },
];

export default function ManagerLayout({ children }) {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="flex flex-col min-h-screen">

      {/* TOPBAR */}
      <header className="h-16 bg-green-950 text-white flex items-center justify-between px-6 shadow-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-xl text-green-300 hover:bg-white/10 hover:text-white transition-all duration-200"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-400 flex items-center justify-center shadow-md">
              <UtensilsCrossed size={18} className="text-green-950" />
            </div>
            <div className="leading-tight">
              <p className="font-black text-white text-base tracking-tight">Easy Serve</p>
              <p className="text-green-400 text-xs font-medium">Manager Panel</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => dispatch(onLoggedOut())}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200/20 bg-red-500/10 text-red-200 hover:bg-red-500/20 transition-all duration-200"
        >
          <LogOut size={15} />
          <span className="text-sm font-semibold">Logout</span>
        </button>
      </header>

      {/* BODY */}
      <div className="flex flex-1 items-stretch">

        {/* SIDEBAR */}
        <aside
          className={`
            ${collapsed ? "w-[68px]" : "w-56"}
            bg-green-950 text-white flex flex-col
            sticky top-16 self-stretch
            min-h-[calc(100vh-64px)]
            shadow-2xl shrink-0
            transition-all duration-300 ease-in-out
            overflow-hidden
          `}
        >
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === "/manager"
                  ? pathname === "/manager"
                  : pathname.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-200 whitespace-nowrap
                    ${collapsed ? "justify-center" : ""}
                    ${isActive
                      ? "bg-yellow-400 text-black shadow-md"
                      : "text-green-100 hover:bg-white/10 hover:text-white"
                    }
                  `}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Profile + Logout */}
          <div className="px-2 pb-5 border-t border-white/10 pt-4 space-y-1">
            <Link
              href="/manager/profile"
              title={collapsed ? "Profile" : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 whitespace-nowrap
                ${collapsed ? "justify-center" : ""}
                ${pathname === "/manager/profile"
                  ? "bg-yellow-400 text-black"
                  : "text-green-100 hover:bg-white/10"
                }
              `}
            >
              <User size={18} className="shrink-0" />
              {!collapsed && <span>Profile</span>}
            </Link>

            <button
              onClick={() => dispatch(onLoggedOut())}
              title={collapsed ? "Logout" : undefined}
              className={`
                flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                text-red-300 hover:bg-red-500/10 transition-all duration-200 whitespace-nowrap
                ${collapsed ? "justify-center" : ""}
              `}
            >
              <LogOut size={18} className="shrink-0" />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 bg-zinc-50 dark:bg-zinc-950 overflow-y-auto">
          {children}
        </main>

      </div>
    </div>
  );
}
