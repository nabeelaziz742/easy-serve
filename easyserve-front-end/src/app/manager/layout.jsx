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
  Boxes,
  ShoppingCart,
  ScrollText,
  Receipt,
} from "lucide-react";
import RoleGuard from "@/components/auth/RoleGuard";

// Clean, modular section architecture prepared for commercial SaaS scalability
const navigationSections = [
  {
    title: "Command Center",
    items: [
      { href: "/manager", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Inventory & Supply",
    items: [
      { href: "/manager/inventory", label: "Inventory", icon: Boxes },
      { href: "/manager/purchases", label: "Purchases / Stock In", icon: ShoppingCart },
      { href: "/manager/recipes", label: "Recipes / BOM", icon: ScrollText },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/manager/expenses", label: "Expenses", icon: Receipt },
      { href: "/manager/reports", label: "Financial Reports", icon: BarChart3 },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/manager/menu", label: "Menu Items", icon: UtensilsCrossed },
      { href: "/manager/cash", label: "Cash Settlement", icon: Banknote },
      { href: "/manager/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Staff & Service",
    items: [
      { href: "/manager/waiters", label: "Waiters", icon: Users },
      { href: "/manager/chefs", label: "Chefs", icon: ChefHat },
      { href: "/manager/reviews", label: "Reviews", icon: Star },
    ],
  },
];

export default function ManagerLayout({ children }) {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <RoleGuard allowedRoles={["manager", "restaurant_owner", "super_admin"]}>
      <div className="flex flex-col h-screen h-[100dvh] overflow-hidden font-sans">

        {/* TOPBAR */}
        <header className="h-16 shrink-0 bg-[#063B2E] text-white flex items-center justify-between px-6 shadow-xl z-50">
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
                <UtensilsCrossed size={18} className="text-[#063B2E]" />
              </div>
              <div className="leading-tight">
                <p className="font-black text-white text-base tracking-tight">Easy Serve</p>
                <p className="text-emerald-300 text-xs font-medium">Manager Panel</p>
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
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* SIDEBAR */}
          <aside
            className={`
              ${collapsed ? "w-[68px]" : "w-60"}
              bg-[#063B2E] text-white flex flex-col
              h-full shrink-0
              shadow-2xl
              transition-all duration-300 ease-in-out
              overflow-hidden
            `}
          >
            <nav className="flex-1 min-h-0 px-2.5 py-4 space-y-4 overflow-y-auto overflow-x-hidden">
              {navigationSections.map((section, sectionIdx) => (
                <div key={section.title} className="space-y-1">
                  {/* Section Title */}
                  {!collapsed ? (
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/60 px-3 pt-1 pb-1">
                      {section.title}
                    </p>
                  ) : sectionIdx > 0 ? (
                    <div className="border-t border-white/10 my-2 mx-1" />
                  ) : null}

                  {/* Section Navigation Items */}
                  {section.items.map(({ href, label, icon: Icon }) => {
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
                            ? "bg-yellow-400 text-black shadow-md font-bold"
                            : "text-emerald-100 hover:bg-white/10 hover:text-white"
                          }
                        `}
                      >
                        <Icon size={18} className="shrink-0" />
                        {!collapsed && <span>{label}</span>}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Profile + Logout */}
            <div className="px-2.5 pb-5 border-t border-white/10 pt-4 space-y-1 shrink-0">
              <Link
                href="/manager/profile"
                title={collapsed ? "Profile" : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-200 whitespace-nowrap
                  ${collapsed ? "justify-center" : ""}
                  ${pathname === "/manager/profile"
                    ? "bg-yellow-400 text-black font-bold"
                    : "text-emerald-100 hover:bg-white/10"
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
          <main className="flex-1 h-full min-h-0 bg-[#F7F7F4] overflow-y-auto overflow-x-hidden focus:outline-none" tabIndex={-1}>
            {children}
          </main>

        </div>
      </div>
    </RoleGuard>
  );
}
