"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import CartDrawer from "@/components/landingPage/CartDrawer";
import AIChatbot from "@/components/Aichatbot";
import TableServiceBar from "@/components/dineIn/TableServiceBar";
import { isStaffPath } from "@/components/layout/staffNav";
import useStaffAreaLock from "@/hooks/useStaffAreaLock";

// Pages a guest seated at a table uses: menu, item, orders. The waiter/bill
// buttons stay off everything else (login, home, reservations...).
const TABLE_SERVICE_PAGES = ["/restaurant/", "/item/", "/dine-in", "/orders"];

export default function LayoutClient({ children }) {
  const pathname = usePathname() || "";
  const signingOutStaff = useStaffAreaLock();

  // Staff panels (manager, waiter, chef, floor) use their own app shell, so
  // the public website header, footer, cart and chat assistant stay out.
  const isStaff = isStaffPath(pathname);
  // Restaurant pages mount their own menu-aware assistant.
  const showChatbot = !isStaff && !pathname.startsWith("/restaurant/");
  const showTableService = TABLE_SERVICE_PAGES.some((page) => pathname.startsWith(page));

  // A staff member who typed a public URL is being signed out; show nothing
  // of the public site meanwhile.
  if (signingOutStaff) return null;

  // Printable pages (bills) render on their own, with nothing around them.
  if (isStaff || pathname.startsWith("/receipt/")) return children;

  return (
    <>
      <Header />
      <main className="flex-grow bg-gray-50">{children}</main>
      <Footer />
      <CartDrawer />
      {showChatbot && <AIChatbot />}
      {showTableService && <TableServiceBar />}
    </>
  );
}
