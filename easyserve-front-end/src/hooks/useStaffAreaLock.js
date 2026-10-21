"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { onLoggedOut } from "@/store/slices/authSlice";
import { isStaffPath } from "@/components/layout/staffNav";
import { isStaffRole, loginUrlFor } from "@/utilities/roleRoutes";

// Public pages a signed-in staff member may still open: the sign-in screens
// and the printable bill linked from the waiter dashboard.
const STAFF_PUBLIC_PREFIXES = ["/auth/", "/receipt/"];

// Staff sessions stay inside the staff panels. A waiter, chef or manager who
// leaves their panel by editing the URL (e.g. /waiter -> /) is signed out and
// sent to the login page, so an unattended staff login cannot be used to
// browse or order as that person. Customers are not affected.
// Returns true while such a sign-out is in progress, so the caller can avoid
// rendering the public page for that moment.
export default function useStaffAreaLock() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const dispatch = useDispatch();
  const { initialized, isAuthenticated, user } = useSelector((state) => state.auth);

  const role = (user?.user_type || user?.role || "").toLowerCase();
  const leftStaffArea =
    initialized &&
    isAuthenticated &&
    isStaffRole(role) &&
    !isStaffPath(pathname) &&
    !STAFF_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    if (!leftStaffArea) return;
    dispatch(onLoggedOut());
    router.replace(loginUrlFor(null, "left"));
  }, [dispatch, leftStaffArea, router]);

  return leftStaffArea;
}
