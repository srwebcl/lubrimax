import { getStaffUsers } from "@/actions/admin-staff";
import { verifyStaffSession } from "@/lib/staff-session";
import UsersManager from "./UsersManager";

export const metadata = { title: "Usuarios | Lubrimax" };

export default async function StaffUsersPage() {
  const [users, session] = await Promise.all([getStaffUsers(), verifyStaffSession()]);

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-8 border-b border-white/10 pb-6">
        <h2 className="text-xl md:text-3xl font-bold text-white uppercase tracking-widest italic">
          Usuarios{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">
            del Panel
          </span>
        </h2>
        <p className="text-gray-400 text-sm mt-2">
          Administra los accesos: crea trabajadores, cambia roles, resetea contraseñas o
          fuerza el cierre de sesión.
        </p>
      </div>

      <UsersManager
        initialUsers={users.map((u) => ({
          ...u,
          lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
          createdAt: u.createdAt.toISOString(),
        }))}
        currentUserId={session?.userId ?? ""}
      />
    </div>
  );
}
