import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyStaffSession } from "@/lib/staff-session";
import { Screen, PageHead, CARD } from "@/components/admin/kit";
import ChangePasswordForm from "./ChangePasswordForm";
import LogoutButton from "./LogoutButton";
import InstallCard from "@/components/pwa/InstallCard";

export const metadata = { title: "Mi perfil | Lubrimax" };

export default async function AdminProfilePage() {
  const session = await verifyStaffSession();
  if (!session) redirect("/admin/login");

  const user = await prisma.staffUser.findUnique({
    where: { id: session.userId },
    select: { email: true, name: true, role: true, lastLoginAt: true },
  });
  if (!user) redirect("/admin/login");

  const roleLabel = user.role === "ADMIN" ? "Administrador" : "Trabajador";
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Screen>
      <PageHead title="Mi perfil" subtitle="Datos de tu cuenta y seguridad." />

      <div className={`${CARD} flex items-center gap-4`}>
        <span className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-blue to-brand-cyan grid place-items-center text-2xl font-black text-white shrink-0">
          {initial}
        </span>
        <div className="min-w-0">
          <div className="text-lg font-bold text-white truncate">{user.name}</div>
          <div className="text-sm text-brand-cyan font-semibold">{roleLabel}</div>
          <div className="text-xs text-gray-500 font-mono truncate">{user.email}</div>
        </div>
      </div>

      <div className={`${CARD} space-y-2 text-sm`}>
        <div className="flex justify-between">
          <span className="text-gray-500">Último ingreso</span>
          <span className="text-gray-200">
            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("es-CL") : "—"}
          </span>
        </div>
      </div>

      <InstallCard />

      <div className={CARD}>
        <ChangePasswordForm />
      </div>

      <LogoutButton />
    </Screen>
  );
}
