"use client";

import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthorized, onLoggedOut } from "@/store/slices/authSlice";
import { useGetMeQuery } from "@/services/private/me";

export default function RoleGuard({ allowedRoles, children }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasStoredToken =
    typeof window !== "undefined" && !!localStorage.getItem("token");

  const {
    data: me,
    isLoading: isRestoring,
    error: restoreError,
    refetch: refetchMe,
  } = useGetMeQuery(undefined, {
    skip: !mounted || !hasStoredToken,
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
      mounted &&
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
  }, [hasStoredToken, isRestoring, mounted, refetchMe, restoreError]);

  useEffect(() => {
    if (!mounted) return;

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

    // Role check once user role is available
    const activeRole = user?.user_type || me?.user_type;
    if (activeRole && allowedRoles && !allowedRoles.includes(activeRole)) {
      router.replace("/");
    }
  }, [
    allowedRoles,
    dispatch,
    hasStoredToken,
    isAuthenticated,
    me?.user_type,
    mounted,
    restoreFailed,
    router,
    user?.user_type,
  ]);

  // Loading state while restoring session on initial reload if no user profile is in state
  if (!mounted || (hasStoredToken && !user && !me && isRestoring)) {
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

  const activeRole = user?.user_type || me?.user_type;
  if (activeRole && allowedRoles && !allowedRoles.includes(activeRole)) {
    return null;
  }

  return children;
}


