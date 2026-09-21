"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import ProfileOverview from "./ProfileOverview";
import ProfileFiles from "./ProfileFiles";
import ProfileSecurity from "./ProfileSecurity";
import { User, Shield, FolderOpen } from "lucide-react";

export default function ProfileTabs({ user }) {
  return (
    <Tabs defaultValue="overview" className="w-full space-y-6">
      <TabsList className="h-12 w-full max-w-md rounded-2xl bg-gray-100/90 p-1.5 border border-gray-200/80 shadow-xs grid grid-cols-3">
        <TabsTrigger
          value="overview"
          className="rounded-xl text-xs font-bold data-[state=active]:bg-green-950 data-[state=active]:text-yellow-400 data-[state=active]:shadow-md transition-all flex items-center justify-center gap-1.5"
        >
          <User className="h-3.5 w-3.5" />
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="files"
          className="rounded-xl text-xs font-bold data-[state=active]:bg-green-950 data-[state=active]:text-yellow-400 data-[state=active]:shadow-md transition-all flex items-center justify-center gap-1.5"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Files
        </TabsTrigger>
        <TabsTrigger
          value="security"
          className="rounded-xl text-xs font-bold data-[state=active]:bg-green-950 data-[state=active]:text-yellow-400 data-[state=active]:shadow-md transition-all flex items-center justify-center gap-1.5"
        >
          <Shield className="h-3.5 w-3.5" />
          Security
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="focus-visible:outline-none">
        <ProfileOverview user={user} />
      </TabsContent>

      <TabsContent value="files" className="focus-visible:outline-none">
        <ProfileFiles />
      </TabsContent>

      <TabsContent value="security" className="focus-visible:outline-none">
        <ProfileSecurity />
      </TabsContent>
    </Tabs>
  );
}
