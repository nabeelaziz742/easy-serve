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
    isFetching: isRestoreFetching,
    error: restoreError,
    refetch: refetchMe,
  } = useGetMeQuery(undefined, {
    skip: isAuthenticated || !hasStoredToken,
  });

  // Only a genuine "this token is not valid" response from the server
  // should end the session. A missing/failed network request (backend
  // still booting, dev-server hiccup, offline blip, etc.) must NOT log
  // the user out — the baseQuery already retries via refresh token, and
  // RTK Query will retry this query again shortly on its own.
  const restoreFailed =
    !!restoreError &&
    (restoreError.status === 401 || restoreError.status === 403);

  useEffect(() => {
    if (!isAuthenticated && me) {
      dispatch(onAuthorized(me));
    }
  }, [dispatch, isAuthenticated, me]);

  // Transient failure (network blip, backend still starting, etc.) — don't
  // log the user out, just quietly retry restoring the session shortly.
  useEffect(() => {
    if (
      !isAuthenticated &&
      hasStoredToken &&
      !isRestoring &&
      !isRestoreFetching &&
      restoreError &&
      restoreError.status !== 401 &&
      restoreError.status !== 403
    ) {
      const timer = setTimeout(() => refetchMe(), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [
    hasStoredToken,
    isAuthenticated,
    isRestoreFetching,
    isRestoring,
    refetchMe,
    restoreError,
  ]);

  useEffect(() => {
    // Do not redirect while persisted authentication is being restored.
    if (!isAuthenticated && hasStoredToken) {
      if (isRestoring || isRestoreFetching) return;

      // The API layer already attempts silent access-token renewal. Only
      // clear the session when the server explicitly rejected the token
      // (not on a transient/network error).
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
