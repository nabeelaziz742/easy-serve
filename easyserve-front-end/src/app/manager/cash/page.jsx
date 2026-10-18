"use client";

import { Banknote } from "lucide-react";
import RoleGuard from "@/components/auth/RoleGuard";
import ManagerCashSettlement from "@/components/admin/ManagerCashSettlement";
import PageHeader from "@/components/layout/PageHeader";

export default function ManagerCashPage() {
  return (
    <RoleGuard allowedRoles={["manager", "restaurant_owner"]}>
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        <PageHeader
          icon={Banknote}
          title="Cash Settlement"
          description="Review cash received by waiters and settle it into the restaurant accounts."
        />
        <ManagerCashSettlement />
      </div>
    </RoleGuard>
  );
}
