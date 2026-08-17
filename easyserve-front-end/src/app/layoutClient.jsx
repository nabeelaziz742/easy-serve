'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function LayoutClient({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    const publicPaths = ['/','/auth/login','/auth/register'];
    const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
    if (isPublic) return;
    const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
    const userRaw = localStorage.getItem('user') || localStorage.getItem('currentUser');
    if (!token && !userRaw) router.replace('/auth/login');
  }, [pathname, router]);
  return children;
}
