"use client";

import React from "react";
import { useGetMeQuery } from "@/services/private/me";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import { Skeleton } from "@/components/ui/skeleton";


export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function ProfilePage() {
  const { data, isLoading } = useGetMeQuery();

  if (isLoading) return <ProfileSkeleton />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <ProfileHeader user={data} />
      <ProfileTabs user={data} />
    </div>
  );
}
