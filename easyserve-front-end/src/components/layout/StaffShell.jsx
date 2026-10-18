"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, User, UtensilsCrossed, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { onLoggedOut } from "@/store/slices/authSlice";
import { getPanelLabel, getStaffNav } from "./staffNav";

const isActive = (pathname, { href, exact }) =>
  exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

function NavList({ sections, pathname, collapsed, onNavigate }) {
  return (
    <nav className="flex-1 min-h-0 space-y-4 overflow-y-auto overflow-x-hidden px-2.5 py-4">
      {sections.map((section, sectionIdx) => (
        <div key={section.title} className="space-y-0.5">
          {!collapsed ? (
            <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">
              {section.title}
            </p>
          ) : sectionIdx > 0 ? (
            <div className="mx-1 my-2 border-t border-white/10" />
          ) : null}
          {section.items.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  collapsed ? "justify-center" : ""
                } ${active ? "text-black" : "text-emerald-100 hover:bg-white/10 hover:text-white"}`}
              >
                {active && (
                  <motion.span
                    layoutId={collapsed ? undefined : "staff-nav-active"}
                    className="absolute inset-0 rounded-lg bg-yellow-400 shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <Icon size={17} className="relative shrink-0" />
                {!collapsed && <span className={`relative ${active ? "font-bold" : ""}`}>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ collapsed, onLogout, profileHref, pathname, onNavigate }) {
  return (
    <div className="shrink-0 space-y-0.5 border-t border-white/10 px-2.5 pb-4 pt-3">
      {profileHref && (
        <Link
          href={profileHref}
          onClick={onNavigate}
          title={collapsed ? "Profile" : undefined}
          className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            collapsed ? "justify-center" : ""
          } ${pathname === profileHref ? "bg-yellow-400 font-bold text-black" : "text-emerald-100 hover:bg-white/10"}`}
        >
          <User size={17} className="shrink-0" />
          {!collapsed && <span>Profile</span>}
        </Link>
      )}
      <button
        type="button"
        onClick={onLogout}
        title={collapsed ? "Logout" : undefined}
        className={`flex w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <LogOut size={17} className="shrink-0" />
        {!collapsed && <span>Logout</span>}
      </button>
    </div>
  );
}

// Shared app shell for every staff role: collapsible sidebar on desktop,
// slide-in drawer on phones and tablets.
export default function StaffShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const storeUser = useSelector((state) => state.auth.user);
  // The session is restored from browser storage, which the server cannot
  // see, so role-based parts render only after mount to avoid a hydration
  // mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const user = mounted ? storeUser : null;
  const role = (user?.user_type || user?.role || "").toLowerCase();
  const sections = getStaffNav(role);
  const profileHref = ["manager", "restaurant_owner", "super_admin"].includes(role) ? "/manager/profile" : null;
  const displayName = user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "";

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer whenever the route changes.
  useEffect(() => setDrawerOpen(false), [pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (event) => event.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const handleLogout = () => {
    dispatch(onLoggedOut());
    router.replace("/auth/login");
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#F7F7F4] font-sans">
      {/* Top bar */}
      <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-3 bg-[#063B2E] px-3 text-white shadow-md sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-green-200 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="hidden rounded-lg p-2 text-green-200 transition-colors hover:bg-white/10 hover:text-white lg:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-400 shadow-sm">
              <UtensilsCrossed size={16} className="text-[#063B2E]" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-black tracking-tight">Easy Serve</p>
              <p className="truncate text-[11px] font-medium text-emerald-300">{getPanelLabel(role)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {displayName && (
            <div className="hidden items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 sm:flex">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-[11px] font-black uppercase text-[#063B2E]">
                {displayName.charAt(0)}
              </span>
              <span className="max-w-[10rem] truncate text-xs font-semibold">{displayName}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-red-200/20 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/20"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside
          className={`hidden shrink-0 flex-col bg-[#063B2E] text-white transition-[width] duration-300 ease-in-out lg:flex ${
            collapsed ? "w-[68px]" : "w-60"
          }`}
        >
          <NavList sections={sections} pathname={pathname} collapsed={collapsed} />
          <SidebarFooter collapsed={collapsed} onLogout={handleLogout} profileHref={profileHref} pathname={pathname} />
        </aside>

        {/* Mobile / tablet drawer */}
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawerOpen(false)}
                className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
              />
              <motion.aside
                key="drawer"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 38 }}
                className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-[#063B2E] text-white shadow-2xl lg:hidden"
                role="dialog"
                aria-label="Navigation"
              >
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
                  <div className="leading-tight">
                    <p className="text-sm font-black">Easy Serve</p>
                    <p className="text-[11px] text-emerald-300">{getPanelLabel(role)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="rounded-lg p-2 text-green-200 hover:bg-white/10 hover:text-white"
                    aria-label="Close navigation"
                  >
                    <X size={18} />
                  </button>
                </div>
                <NavList sections={sections} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
                <SidebarFooter
                  onLogout={handleLogout}
                  profileHref={profileHref}
                  pathname={pathname}
                  onNavigate={() => setDrawerOpen(false)}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden focus:outline-none" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
