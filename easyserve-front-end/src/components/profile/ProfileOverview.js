"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useUpdateMeMutation } from "@/services/private/me";
import { User, Mail, Phone, MapPin, Save, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function ProfileOverview({ user }) {
  const [updateMe, { isLoading }] = useUpdateMeMutation();

  const [form, setForm] = useState({
    phone: user?.phone || user?.profile?.phone || "",
    address: user?.address || user?.profile?.address || "",
  });

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    try {
      await updateMe(form).unwrap();
      toast.success("Profile information updated successfully! 🎉");
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to update profile. Please try again.");
    }
  };

  return (
    <Card className="rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-xl max-w-2xl">
      <CardHeader className="p-0 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-3 py-0.5 text-xs font-bold text-yellow-900 border border-yellow-400/30">
            <Sparkles className="h-3 w-3 text-yellow-600" /> Personal Information
          </span>
        </div>
        <CardTitle className="text-2xl font-black text-green-950 tracking-tight">
          Account Details
        </CardTitle>
        <CardDescription className="text-xs text-gray-500">
          Update your contact and delivery address settings.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 space-y-5">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-yellow-600" /> Username
              </Label>
              <Input
                value={user?.username || ""}
                disabled
                className="h-11 rounded-xl border-gray-200 bg-gray-100/70 font-semibold text-gray-600 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-yellow-600" /> Email Address
              </Label>
              <Input
                value={user?.email || ""}
                disabled
                className="h-11 rounded-xl border-gray-200 bg-gray-100/70 font-semibold text-gray-600 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-yellow-600" /> Phone Number
            </Label>
            <Input
              placeholder="+92 300 1234567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="h-11 rounded-xl border-gray-200 bg-gray-50/50 text-gray-900 focus:border-green-700 focus:ring-2 focus:ring-green-700/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-yellow-600" /> Default Delivery Address
            </Label>
            <Input
              placeholder="Apartment, Street, Area, City"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="h-11 rounded-xl border-gray-200 bg-gray-50/50 text-gray-900 focus:border-green-700 focus:ring-2 focus:ring-green-700/20"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-8 h-11 rounded-xl bg-green-950 text-yellow-400 hover:bg-green-900 font-bold text-sm shadow-lg transition active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
