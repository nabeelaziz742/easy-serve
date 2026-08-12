"use client";

import {useRouter, useSearchParams} from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
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
import React, { Suspense } from "react";


function ReservationPageContent() {
  const router = useRouter();


  const searchParams = useSearchParams();
  const restaurant = searchParams.get("restaurant");

  const [createReservation, { isLoading }] =
    useCreateReservationMutation();

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
      alert("Restaurant not selected");
      router.push("/restaurant?mode=reservation");
      return;
    }

    try {
      const payload = {
        ...form,
        restaurant,
      };

      const res = await createReservation(payload).unwrap();

      router.push(`/reservation/success?id=${res.id}`);
    } catch (err) {
      console.error("Reservation error:", err);
      alert("Failed to create reservation");
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
      <Card className="w-full max-w-lg rounded-2xl border border-border/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Reserve a Table</CardTitle>
          <CardDescription>
            Secure your dining experience in advance.
          </CardDescription>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" onChange={(e) => handleChange("date", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Time</Label>
            <Select onValueChange={(v) => handleChange("time", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {["18:00", "18:30", "19:00", "19:30", "20:00"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Guests</Label>
            <Select onValueChange={(v) => handleChange("guest_count", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Guests" />
              </SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5,6,7,8].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} Guests
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Name</Label>
            <Input onChange={(e) => handleChange("name", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Phone</Label>
            <Input onChange={(e) => handleChange("phone", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea onChange={(e) => handleChange("notes", e.target.value)} />
          </div>

          <Button
            className="w-full h-11"
            disabled={isLoading}
            onClick={handleSubmit}
          >
            {isLoading ? "Booking..." : "Confirm Reservation"}
          </Button>

        </CardContent>
      </Card>
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