"use client";

import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { onAuthorized, onLoggedOut } from "@/store/slices/authSlice";
import { useGetMeQuery } from "@/services/private/me";

export default function RoleGuard({ allowedRoles, children }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const hasStoredToken =
    typeof window !== "undefined" && !!localStorage.getItem("token");

  // Redux state is recreated on a normal browser refresh. If a persisted
  // access/refresh token exists, restore the authenticated user before the
  // guard decides to redirect to login.
  const {
    data: me,
    isLoading: isRestoring,
    isError: restoreFailed,
  } = useGetMeQuery(undefined, {
    skip: isAuthenticated || !hasStoredToken,
  });

  useEffect(() => {
    if (!isAuthenticated && me) {
      dispatch(onAuthorized(me));
    }
  }, [dispatch, isAuthenticated, me]);

  useEffect(() => {
    // Do not redirect while persisted authentication is being restored.
    if (!isAuthenticated && hasStoredToken) {
      if (isRestoring) return;

      // The API layer already attempts silent access-token renewal. Only
      // clear the session when both the persisted credentials and restore
      // request have actually failed.
      if (restoreFailed) {
        dispatch(onLoggedOut());
        router.replace("/auth/login");
      }
      return;
    }

    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    if (user?.user_type && !allowedRoles.includes(user.user_type)) {
      router.replace("/");
    }
  }, [
    allowedRoles,
    dispatch,
    hasStoredToken,
    isAuthenticated,
    isRestoring,
    restoreFailed,
    router,
    user?.user_type,
  ]);

  return children;
}
