import RoleGuard from "@/components/auth/RoleGuard";
import StaffShell from "@/components/layout/StaffShell";

export const metadata = {
  title: "Super Admin",
};

export default function SuperAdminLayout({ children }) {
  return (
    <RoleGuard allowedRoles={["super_admin"]}>
      <StaffShell>
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">{children}</div>
      </StaffShell>
    </RoleGuard>
  );
}
