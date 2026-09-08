import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyStaffSession } from "@/lib/staff-session";
import ChangePasswordForm from "./ChangePasswordForm";
import LogoutButton from "./LogoutButton";

export const metadata = { title: "Mi perfil | Lubrimax" };

export default async function AdminProfilePage() {
  const session = await verifyStaffSession();
  if (!session) redirect("/admin/login");

  const user = await prisma.staffUser.findUnique({
    where: { id: session.userId },
    select: { email: true, name: true, role: true, lastLoginAt: true, createdAt: true },
  });
  if (!user) redirect("/admin/login");

  const roleLabel = user.role === "ADMIN" ? "Administrador" : "Trabajador";
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      <div className="border-b border-white/10 pb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-widest italic">
          Mi{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">
            Perfil
          </span>
        </h2>
        <p className="text-gray-400 text-sm mt-2">Datos de tu cuenta y seguridad de acceso.</p>
      </div>

      <div className="bg-brand-surface/80 border border-white/10 p-6 sm:p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/5 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/3" />

        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
          <div className="flex flex-col items-center gap-4 w-full md:w-1/3">
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-brand-blue to-brand-cyan p-[2px] shadow-[0_0_30px_rgba(56,189,248,0.2)]">
              <div className="w-full h-full bg-brand-surface rounded-full flex items-center justify-center">
                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">
                  {initial}
                </span>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white uppercase tracking-widest">{user.name}</h3>
              <p className="text-brand-cyan text-xs font-bold uppercase tracking-widest mt-1">
                {roleLabel}
              </p>
            </div>
            <LogoutButton />
          </div>

          <div className="flex-1 w-full space-y-6">
            <h3 className="text-sm text-gray-400 uppercase tracking-widest font-bold border-b border-white/5 pb-2">
              Datos de la cuenta
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 uppercase tracking-widest text-xs font-bold">Correo</dt>
                <dd className="text-white font-mono">{user.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 uppercase tracking-widest text-xs font-bold">Rol</dt>
                <dd className="text-white">{roleLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 uppercase tracking-widest text-xs font-bold">
                  Último ingreso
                </dt>
                <dd className="text-white">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString("es-CL")
                    : "—"}
                </dd>
              </div>
            </dl>

            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
