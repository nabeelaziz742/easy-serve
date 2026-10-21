"use client";

import { useSelector, useDispatch } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthorized, onLoggedOut } from "@/store/slices/authSlice";
import { useGetMeQuery } from "@/services/private/me";
import { getAccessToken } from "@/utilities/authStorage";
import { loginUrlFor } from "@/utilities/roleRoutes";

export default function RoleGuard({ allowedRoles, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { user, isAuthenticated, initialized: sessionRestored } = useSelector((state) => state.auth);

  // A page segment can hydrate after the session was already restored into
  // the store, so it must still start from the server's "verifying" markup
  // and switch only once this guard itself has mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const initialized = mounted && sessionRestored;

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
      router.replace(loginUrlFor(pathname));
      return;
    }

    // Explicit permanent session expiration
    if (restoreFailed) {
      dispatch(onLoggedOut());
      router.replace(loginUrlFor(pathname, "expired"));
      return;
    }

    // Role check once user role is available. Opening another role's page
    // (e.g. a manager typing /waiter in the address bar) goes to the login
    // page so the right account can sign in; it used to bounce silently to
    // the current user's own dashboard, which looked like a wrong redirect.
    const activeRole = me?.user_type || user?.user_type;
    if (activeRole && allowedRoles && !allowedRoles.includes(activeRole)) {
      router.replace(loginUrlFor(pathname, "role"));
    }
  }, [
    allowedRoles,
    dispatch,
    hasStoredToken,
    isAuthenticated,
    me?.user_type,
    initialized,
    pathname,
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


