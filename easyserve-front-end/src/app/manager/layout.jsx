import RoleGuard from "@/components/auth/RoleGuard";
import StaffShell from "@/components/layout/StaffShell";

export const metadata = {
  title: "Manager",
};

export default function ManagerLayout({ children }) {
  return (
    <RoleGuard allowedRoles={["manager", "restaurant_owner", "super_admin"]}>
      <StaffShell>{children}</StaffShell>
    </RoleGuard>
  );
}
