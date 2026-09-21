"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateReservationMutation } from "@/services/private/reservations";
import React, { Suspense, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Users, User, Phone, FileText, Sparkles, Utensils } from "lucide-react";
import { toast } from "sonner";

function ReservationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurant = searchParams.get("restaurant");

  const [createReservation, { isLoading }] = useCreateReservationMutation();

  const [form, setForm] = useState({
    date: "",
    time: "",
    guest_count: "",
    name: "",
    phone: "",
    notes: "",
  });

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!restaurant) {
      toast.error("Please select a restaurant first.");
      router.push("/restaurant?mode=reservation");
      return;
    }

    if (!form.date || !form.time || !form.guest_count) {
      toast.error("Please select reservation date, time, and guest count.");
      return;
    }

    try {
      const payload = {
        ...form,
        restaurant,
      };

      const res = await createReservation(payload).unwrap();
      toast.success("Reservation confirmed! 🎉");
      router.push(`/reservation/success?id=${res.id}`);
    } catch (err) {
      console.error("Reservation error:", err);
      toast.error(err?.data?.detail || "Failed to create reservation. Please try again.");
    }
  };

  return (
    <div className="min-h-[85vh] bg-gradient-to-b from-gray-50 via-white to-gray-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <Card className="rounded-3xl border border-gray-200/80 bg-white shadow-xl overflow-hidden">
          <CardHeader className="bg-green-950 text-white p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-3 py-0.5 text-xs font-bold text-yellow-300 border border-yellow-400/30">
                <Sparkles className="h-3 w-3" /> Guaranteed Table
              </span>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Utensils className="h-6 w-6 text-yellow-400" /> Reserve a Table
            </CardTitle>
            <CardDescription className="text-sm text-green-200">
              Select your preferred date, time and seating preferences.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-yellow-600" /> Date
              </Label>
              <Input
                type="date"
                onChange={(e) => handleChange("date", e.target.value)}
                className="h-11 rounded-xl border-gray-200 bg-gray-50/50"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-yellow-600" /> Time Slot
                </Label>
                <Select onValueChange={(v) => handleChange("time", v)}>
                  <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-gray-50/50">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {["12:00", "13:00", "14:00", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-yellow-600" /> Guests
                </Label>
                <Select onValueChange={(v) => handleChange("guest_count", v)}>
                  <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-gray-50/50">
                    <SelectValue placeholder="Guests" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} {n === 1 ? "Guest" : "Guests"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="my-2" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-yellow-600" /> Full Name
                </Label>
                <Input
                  placeholder="Your Name"
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="h-11 rounded-xl border-gray-200 bg-gray-50/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-yellow-600" /> Phone Number
                </Label>
                <Input
                  placeholder="+92 300 1234567"
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="h-11 rounded-xl border-gray-200 bg-gray-50/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-yellow-600" /> Special Requests / Notes
              </Label>
              <Textarea
                placeholder="Allergies, high chair, window seating, anniversary, etc."
                onChange={(e) => handleChange("notes", e.target.value)}
                className="rounded-xl border-gray-200 bg-gray-50/50 resize-none"
                rows={3}
              />
            </div>

            <Button
              className="w-full h-12 rounded-2xl bg-green-950 text-yellow-400 hover:bg-green-900 font-bold text-base shadow-xl transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
              disabled={isLoading}
              onClick={handleSubmit}
            >
              {isLoading ? "Securing Table..." : "Confirm Reservation"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function ReservationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ReservationPageContent />
    </Suspense>
  );
}