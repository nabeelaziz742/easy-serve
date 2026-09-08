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
    isFetching: isRestoreFetching,
    error: restoreError,
    refetch: refetchMe,
  } = useGetMeQuery(undefined, {
    skip: !mounted || isAuthenticated || !hasStoredToken,
  });

  const restoreFailed =
    !!restoreError &&
    (restoreError.status === 401 || restoreError.status === 403);

  useEffect(() => {
    if (!isAuthenticated && me) {
      dispatch(onAuthorized(me));
    }
  }, [dispatch, isAuthenticated, me]);

  useEffect(() => {
    if (
      mounted &&
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
    mounted,
    refetchMe,
    restoreError,
  ]);

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated && hasStoredToken) {
      if (isRestoring || isRestoreFetching || !me) return;

      if (restoreFailed) {
        dispatch(onLoggedOut());
        router.replace("/auth/login");
      }
      return;
    }

    if (!isAuthenticated && !hasStoredToken) {
      router.replace("/auth/login");
      return;
    }

    if (user?.user_type && allowedRoles && !allowedRoles.includes(user.user_type)) {
      router.replace("/");
    }
  }, [
    allowedRoles,
    dispatch,
    hasStoredToken,
    isAuthenticated,
    isRestoreFetching,
    isRestoring,
    me,
    mounted,
    restoreFailed,
    router,
    user?.user_type,
  ]);

  // While verifying or restoring authentication session on client reload
  if (!mounted || (!isAuthenticated && hasStoredToken)) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-4 p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        <p className="text-sm font-medium text-zinc-500">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user?.user_type && allowedRoles && !allowedRoles.includes(user.user_type)) {
    return null;
  }

  return children;
}

