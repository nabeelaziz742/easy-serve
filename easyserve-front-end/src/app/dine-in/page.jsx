"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function DineInPage() {
  const params = useSearchParams();

  const restaurant = params.get("restaurant");
  const table = params.get("table");

  useEffect(() => {
    if (!restaurant || !table) {
      alert("Invalid dine-in session");
    }
  }, [restaurant, table]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-lg rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle>Dine-In Session</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p><strong>Restaurant ID:</strong> {restaurant}</p>
          <p><strong>Table Number:</strong> {table}</p>

          <Button className="w-full">
            Start Ordering
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
