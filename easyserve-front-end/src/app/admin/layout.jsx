import RoleGuard from "@/components/auth/RoleGuard";
import StaffShell from "@/components/layout/StaffShell";

export const metadata = {
  title: "Floor",
};

export default function DashboardLayout({ children }) {
  return (
    <RoleGuard allowedRoles={["manager", "restaurant_owner", "super_admin", "waiter", "chef"]}>
      <StaffShell>
        <div className="mx-auto max-w-7xl p-4 md:p-6">{children}</div>
      </StaffShell>
    </RoleGuard>
  );
}
