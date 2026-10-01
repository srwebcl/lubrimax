import { getStaffUsers } from "@/actions/admin-staff";
import { verifyStaffSession } from "@/lib/staff-session";
import { Screen, PageHead } from "@/components/admin/kit";
import UsersManager from "./UsersManager";

export const metadata = { title: "Usuarios | Lubrimax" };

export default async function StaffUsersPage() {
  const [users, session] = await Promise.all([getStaffUsers(), verifyStaffSession()]);

  return (
    <Screen size="lg">
      <PageHead
        title="Usuarios"
        subtitle="Accesos del panel: crea trabajadores, define qué funciones pueden usar, cambia roles y resetea contraseñas."
      />
      <UsersManager
        initialUsers={users.map((u) => ({
          ...u,
          lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
          createdAt: u.createdAt.toISOString(),
        }))}
        currentUserId={session?.userId ?? ""}
      />
    </Screen>
  );
}
