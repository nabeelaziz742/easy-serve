"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useGetUserLogsQuery } from "@/services/private/me";

export default function ProfileSecurity() {
  const { data: logs } = useGetUserLogsQuery();

  const [form, setForm] = useState({
    old_password: "",
    new_password: "",
  });

  const onChangePassword = async () => {
    // call change password API
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Change Password */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Change Password</h3>

        <Input
          type="password"
          label="Old Password"
          value={form.old_password}
          onChange={(e) =>
            setForm({ ...form, old_password: e.target.value })
          }
        />

        <Input
          type="password"
          label="New Password"
          value={form.new_password}
          onChange={(e) =>
            setForm({ ...form, new_password: e.target.value })
          }
        />

        <Button className="mt-4" onClick={onChangePassword}>
          Update Password
        </Button>
      </Card>

      {/* Login Activity */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Login Activity</h3>

        {!logs?.length ? (
          <p className="text-gray-500">No activity found</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {logs.map((log) => (
              <li
                key={log.id}
                className="border-b pb-2"
              >
                <p>{log.action}</p>
                <p className="text-gray-400">
                  {new Date(log.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
