"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import CartDrawer from "@/components/landingPage/CartDrawer";

export default function LayoutClient({ children }) {
  const pathname = usePathname();
  
  // Sirf /admin hide karo, /manager nahi
const hideHeaderFooter = pathname.startsWith("/admin") || pathname.startsWith("/manager");
  return (
    <>
      {!hideHeaderFooter && <Header />}
      <main className="flex-grow bg-gray-50">{children}</main>
      {!hideHeaderFooter && <Footer />}
      <CartDrawer />
    </>
  );
}