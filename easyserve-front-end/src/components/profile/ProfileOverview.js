"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useUpdateMeMutation } from "@/services/private/me";
import { useState } from "react";

export default function ProfileOverview({ user }) {
  const [updateMe, { isLoading }] = useUpdateMeMutation();

  const [form, setForm] = useState({
    phone: user.phone || "",
    address: user.address || "",
  });

  const onSubmit = async () => {
    await updateMe(form);
  };

  return (
    <Card className="p-6 max-w-xl">
      <div className="grid gap-4">
        <Input label="Username" value={user.username} disabled />
        <Input label="Email" value={user.email} disabled />

        <Input
          label="Phone"
          value={form.phone}
          onChange={(e) =>
            setForm({ ...form, phone: e.target.value })
          }
        />

        <Input
          label="Address"
          value={form.address}
          onChange={(e) =>
            setForm({ ...form, address: e.target.value })
          }
        />

        <Button onClick={onSubmit} disabled={isLoading}>
          Save Changes
        </Button>
      </div>
    </Card>
  );
}
