"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import CartDrawer from "@/components/landingPage/CartDrawer";
import AIChatbot from "@/components/Aichatbot";
import { isStaffPath } from "@/components/layout/staffNav";

export default function LayoutClient({ children }) {
  const pathname = usePathname() || "";

  // Staff panels (manager, waiter, chef, floor) use their own app shell, so
  // the public website header, footer, cart and chat assistant stay out.
  const isStaff = isStaffPath(pathname);
  // Restaurant pages mount their own menu-aware assistant.
  const showChatbot = !isStaff && !pathname.startsWith("/restaurant/");

  // Printable pages (bills) render on their own, with nothing around them.
  if (isStaff || pathname.startsWith("/receipt/")) return children;

  return (
    <>
      <Header />
      <main className="flex-grow bg-gray-50">{children}</main>
      <Footer />
      <CartDrawer />
      {showChatbot && <AIChatbot />}
    </>
  );
}
