"use client";

import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { onAuthorized, onLoggedOut } from "@/store/slices/authSlice";
import { useGetMeQuery } from "@/services/private/me";
import { getAccessToken } from "@/utilities/authStorage";
import { getRoleHome } from "@/utilities/roleRoutes";

export default function RoleGuard({ allowedRoles, children }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated, initialized } = useSelector((state) => state.auth);

  // No routing decision is made until the persisted session has been
  // restored into the store (see StateProvider).
  const hasStoredToken = initialized && !!getAccessToken();

  const {
    data: me,
    isLoading: isRestoring,
    error: restoreError,
    refetch: refetchMe,
  } = useGetMeQuery(undefined, {
    skip: !initialized || !hasStoredToken,
  });

  const restoreFailed =
    !!restoreError &&
    (restoreError.status === 401 || restoreError.status === 403);

  useEffect(() => {
    if (me) {
      dispatch(onAuthorized(me));
    }
  }, [dispatch, me]);

  useEffect(() => {
    if (
      initialized &&
      hasStoredToken &&
      !isRestoring &&
      restoreError &&
      restoreError.status !== 401 &&
      restoreError.status !== 403
    ) {
      const timer = setTimeout(() => refetchMe(), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [hasStoredToken, isRestoring, initialized, refetchMe, restoreError]);

  useEffect(() => {
    if (!initialized) return;

    // No stored token and not authenticated
    if (!hasStoredToken && !isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    // Explicit permanent session expiration
    if (restoreFailed) {
      dispatch(onLoggedOut());
      router.replace("/auth/login");
      return;
    }

    // Role check once user role is available. A user on another role's
    // page is sent to their own landing page, never to a page their role
    // is not allowed to see.
    const activeRole = me?.user_type || user?.user_type;
    if (activeRole && allowedRoles && !allowedRoles.includes(activeRole)) {
      router.replace(getRoleHome(activeRole));
    }
  }, [
    allowedRoles,
    dispatch,
    hasStoredToken,
    isAuthenticated,
    me?.user_type,
    initialized,
    restoreFailed,
    router,
    user?.user_type,
  ]);

  // Loading state while restoring session on initial reload if no user profile is in state
  if (!initialized || (hasStoredToken && !user && !me && isRestoring)) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-4 p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        <p className="text-sm font-medium text-zinc-500">Verifying session...</p>
      </div>
    );
  }

  if (!hasStoredToken && !isAuthenticated) {
    return null;
  }

  const activeRole = me?.user_type || user?.user_type;
  if (activeRole && allowedRoles && !allowedRoles.includes(activeRole)) {
    return null;
  }

  return children;
}


