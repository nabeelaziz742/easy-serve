"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { toggleCart } from "@/store/slices/cartSlice";
import { onLoggedOut } from "@/store/slices/authSlice";
import { useState } from "react";
import {
  User,
  Home,
  ClipboardList,
  UserPlus,
  LogIn,
  LogOut,
  ShoppingCart,
  Menu,
  X,
} from "lucide-react";

export function Header() {
  const dispatch = useDispatch();
  const items = useSelector((state) => state.cart.items);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const user = useSelector((state) => state.auth.user);

  const role = (user?.role || user?.user_type)?.toLowerCase?.() || null;
  const isManager = role === "manager";

  // Use isAuthenticated (set by both the login flow and the reload-restore
  // flow) as the single source of truth for "is this user logged in",
  // instead of deriving it from the token field — the token was not always
  // kept in sync with isAuthenticated after a page-reload session restore.
  const isLoggedIn = isAuthenticated;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openProfileMenu, setOpenProfileMenu] = useState(false);

  const totalItems =
    items?.reduce((acc, item) => acc + (item?.qty || 0), 0) || 0;

  const logoutHandler = () => {
    dispatch(onLoggedOut());
    setOpenProfileMenu(false);
    setMobileOpen(false);
  };

  if (isAuthenticated && !user) return null;

  // ========================= MANAGER HEADER =========================
  if (isManager) {
    return (
      <header className="sticky top-0 z-50 border-b border-white/10 bg-green-950/95 text-white shadow-2xl backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-5">

          {/* Logo */}
          <Link href="/manager" className="flex items-center gap-3 transition duration-300 hover:scale-105">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow-400 text-black shadow-lg">
              🍴
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-wide md:text-2xl">Easy Serve</h1>
              <p className="text-[10px] text-green-200 md:text-[11px]">Manager Panel</p>
            </div>
          </Link>

          {/* Sirf Profile Button */}
          <div className="relative">
            <button
              onClick={() => setOpenProfileMenu(!openProfileMenu)}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 transition-all duration-300 hover:bg-white/20"
            >
              <User className="h-5 w-5" />
              <span>Profile</span>
            </button>

            {openProfileMenu && (
              <div className="absolute right-0 top-14 w-52 overflow-hidden rounded-2xl border border-gray-200 bg-white py-2 text-black shadow-2xl">
                <Link
                  href="/manager/profile"
                  onClick={() => setOpenProfileMenu(false)}
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-gray-100"
                >
                  <User size={16} />
                  Profile
                </Link>
                <button
                  onClick={logoutHandler}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-gray-100"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>

        </div>
      </header>
    );
  }

  // ========================= CUSTOMER HEADER =========================
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-green-950/95 text-white shadow-2xl backdrop-blur-md">

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-5">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 transition duration-300 hover:scale-105">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow-400 text-black shadow-lg">
            🍴
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-wide md:text-2xl">Easy Serve</h1>
            <p className="text-[10px] text-green-200 md:text-[11px]">Smart Dining Experience</p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">

          <Link href="/" className="flex items-center gap-2 transition-all duration-300 hover:text-yellow-300">
            <Home size={18} />
            Home
          </Link>

          <Link href="/orders" className="flex items-center gap-2 transition-all duration-300 hover:text-yellow-300">
            <ClipboardList size={18} />
            Orders
          </Link>

          {!isLoggedIn && (
            <>
              <Link
                href="/auth/register"
                className="flex items-center gap-2 rounded-full border border-transparent px-4 py-2 transition-all duration-300 hover:border-yellow-400 hover:bg-white/10 hover:text-yellow-300"
              >
                <UserPlus size={18} />
                Register
              </Link>

              <Link
                href="/auth/login"
                className="flex items-center gap-2 rounded-full bg-yellow-400 px-5 py-2 font-semibold text-black shadow-lg transition-all duration-300 hover:scale-105 hover:bg-yellow-300"
              >
                <LogIn size={18} />
                Login
              </Link>
            </>
          )}

          {isLoggedIn && (
            <div className="relative">
              <button
                onClick={() => setOpenProfileMenu(!openProfileMenu)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 transition-all duration-300 hover:bg-white/20"
              >
                <User className="h-5 w-5" />
                <span>Account</span>
              </button>

              {openProfileMenu && (
                <div className="absolute right-0 top-14 w-52 overflow-hidden rounded-2xl border border-gray-200 bg-white py-2 text-black shadow-2xl">
                  <Link
                    href="/profile"
                    onClick={() => setOpenProfileMenu(false)}
                    className="flex items-center gap-3 px-5 py-3 transition hover:bg-gray-100"
                  >
                    <User size={16} />
                    Profile
                  </Link>
                  <button
                    onClick={logoutHandler}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-gray-100"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Cart */}
          <button
            onClick={() => dispatch(toggleCart())}
            className="relative rounded-full bg-white/10 p-3 transition-all duration-300 hover:scale-110 hover:bg-white/20"
          >
            <ShoppingCart className="h-6 w-6" />
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-black shadow-md">
                {totalItems}
              </span>
            )}
          </button>

        </nav>

        {/* Mobile Button */}
        <button
          className="rounded-lg p-2 transition hover:bg-white/10 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="border-t border-white/10 bg-green-950/95 px-6 py-6 backdrop-blur-xl md:hidden"
        >
          <div className="space-y-5 text-sm font-medium">

            <Link href="/" className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 transition-all duration-300 hover:bg-white/10 hover:text-yellow-300">
              <Home size={18} />
              Home
            </Link>

            <Link href="/orders" className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 transition-all duration-300 hover:bg-white/10 hover:text-yellow-300">
              <ClipboardList size={18} />
              Orders
            </Link>

            {!isLoggedIn && (
              <>
                <Link href="/auth/register" className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 transition-all duration-300 hover:bg-white/10 hover:text-yellow-300">
                  <UserPlus size={18} />
                  Register
                </Link>

                <Link href="/auth/login" className="flex items-center gap-3 rounded-2xl bg-yellow-400 px-4 py-3 font-semibold text-black transition-all duration-300 hover:bg-yellow-300">
                  <LogIn size={18} />
                  Login
                </Link>
              </>
            )}

            {isLoggedIn && (
              <>
                <Link href="/profile" className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 transition-all duration-300 hover:bg-white/10 hover:text-yellow-300">
                  <User size={18} />
                  Profile
                </Link>

                <button
                  onClick={logoutHandler}
                  className="flex w-full items-center gap-3 rounded-2xl bg-red-500/10 px-4 py-3 text-red-300 transition-all duration-300 hover:bg-red-500/20"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </>
            )}

          </div>
        </motion.div>
      )}

    </header>
  );
}