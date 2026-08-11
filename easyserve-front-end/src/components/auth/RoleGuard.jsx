"use client";

import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RoleGuard({
  allowedRoles,
  children,
}) {
  const router = useRouter();

  const { user, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    if (
      user?.user_type &&
      !allowedRoles.includes(user.user_type)
    ) {
      router.push("/");
    }
  }, [user, isAuthenticated, router, allowedRoles]);

  return children;
}