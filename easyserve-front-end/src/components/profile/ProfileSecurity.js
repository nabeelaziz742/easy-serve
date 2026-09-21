"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useGetUserLogsQuery } from "@/services/private/me";
import { Lock, Shield, History, KeyRound, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function ProfileSecurity() {
  const { data: logs, isLoading: logsLoading } = useGetUserLogsQuery();

  const [form, setForm] = useState({
    old_password: "",
    new_password: "",
  });

  const onChangePassword = async (e) => {
    e?.preventDefault?.();
    if (!form.old_password || !form.new_password) {
      toast.error("Please enter both current and new password.");
      return;
    }
    toast.info("Password update functionality is protected by security policy.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Change Password Card */}
      <Card className="rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-xl">
        <CardHeader className="p-0 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-3 py-0.5 text-xs font-bold text-yellow-900 border border-yellow-400/30">
              <KeyRound className="h-3 w-3 text-yellow-600" /> Credentials
            </span>
          </div>
          <CardTitle className="text-xl font-black text-green-950 tracking-tight">
            Change Password
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Ensure your account uses a secure password.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 space-y-4">
          <form onSubmit={onChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-yellow-600" /> Current Password
              </Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={form.old_password}
                onChange={(e) =>
                  setForm({ ...form, old_password: e.target.value })
                }
                className="h-11 rounded-xl border-gray-200 bg-gray-50/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-yellow-600" /> New Password
              </Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={form.new_password}
                onChange={(e) =>
                  setForm({ ...form, new_password: e.target.value })
                }
                className="h-11 rounded-xl border-gray-200 bg-gray-50/50"
              />
            </div>

            <Button
              type="submit"
              className="mt-2 w-full sm:w-auto px-7 h-11 rounded-xl bg-green-950 text-yellow-400 hover:bg-green-900 font-bold text-xs shadow-md transition active:scale-[0.98]"
            >
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Login Activity Card */}
      <Card className="rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-xl">
        <CardHeader className="p-0 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-3 py-0.5 text-xs font-bold text-yellow-900 border border-yellow-400/30">
              <History className="h-3 w-3 text-yellow-600" /> Audit Trail
            </span>
          </div>
          <CardTitle className="text-xl font-black text-green-950 tracking-tight">
            Security & Login Logs
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Recent authentication events associated with your profile.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {logsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : !logs?.length ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-400">
              No recent security activity logged.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-gray-800">{log.action || "User Session Logged"}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString()
                        : "Recently"}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 font-bold text-[10px]">
                    Success
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
