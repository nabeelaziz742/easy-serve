import RoleGuard from "@/components/auth/RoleGuard";
import StaffShell from "@/components/layout/StaffShell";

export const metadata = {
  title: "Waiter",
};

export default function WaiterLayout({ children }) {
  return (
    <RoleGuard allowedRoles={["waiter"]}>
      <StaffShell>{children}</StaffShell>
    </RoleGuard>
  );
}
