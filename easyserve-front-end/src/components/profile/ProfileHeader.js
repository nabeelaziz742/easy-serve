"use client";

import { Card } from "@/components/ui/card";
import ProfileAvatar from "./ProfileAvatar";
import { Sparkles, Mail, ShieldCheck } from "lucide-react";

export default function ProfileHeader({ user }) {
  const firstName = user?.profile?.first_name || user?.first_name || "";
  const lastName = user?.profile?.last_name || user?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || user?.username || "EasyServe Member";
  const userType = (user?.user_type || user?.role || "Customer").replace(/_/g, " ");

  return (
    <Card className="smooth-card overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-xl">
      {/* Top Banner Gradient */}
      <div className="h-20 bg-gradient-to-r from-green-950 via-green-900 to-green-950 relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:16px_16px]" />
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 px-6 sm:px-8 pb-6 -mt-10">
        <div className="shrink-0 ring-4 ring-white rounded-full shadow-lg bg-white">
          <ProfileAvatar user={user} />
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-green-950 truncate">
              {fullName}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-3 py-0.5 text-xs font-bold text-yellow-900 border border-yellow-400/40 capitalize">
              <Sparkles className="h-3 w-3 text-yellow-600" />
              {userType}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-medium text-gray-500">
            {user?.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-yellow-600" />
                {user.email}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Verified Account
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
