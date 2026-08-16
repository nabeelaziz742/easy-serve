"use client";

import RoleGuard from "@/components/auth/RoleGuard";
import ManagerCashSettlement from "@/components/admin/ManagerCashSettlement";

export default function ManagerCashPage() {
  return (
    <RoleGuard allowedRoles={["manager", "restaurant_owner"]}>
      <main className="mx-auto min-h-screen max-w-7xl space-y-6 px-6 py-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Finance</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-900 dark:text-white">Cash Settlement</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Review cash received by waiters and settle it into the restaurant accounts.</p>
        </div>
        <ManagerCashSettlement />
      </main>
    </RoleGuard>
  );
}
