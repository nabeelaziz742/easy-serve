"use client";

import React from "react";
import { useGetMeQuery } from "@/services/private/me";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import RoleGuard from "@/components/auth/RoleGuard";

export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <Skeleton className="h-96 w-full rounded-3xl" />
    </div>
  );
}

export default function ProfilePage() {
  const { data, isLoading } = useGetMeQuery();

  if (isLoading) return <ProfileSkeleton />;

  return (
    <RoleGuard>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 py-10 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto max-w-5xl space-y-8"
        >
          <ProfileHeader user={data} />
          <ProfileTabs user={data} />
        </motion.div>
      </div>
    </RoleGuard>
  );
}
