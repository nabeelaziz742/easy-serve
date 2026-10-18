import RoleGuard from "@/components/auth/RoleGuard";
import StaffShell from "@/components/layout/StaffShell";

export const metadata = {
  title: "Kitchen",
};

export default function KitchenLayout({ children }) {
  return (
    <RoleGuard allowedRoles={["chef"]}>
      <StaffShell>{children}</StaffShell>
    </RoleGuard>
  );
}
