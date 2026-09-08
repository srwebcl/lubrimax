import { redirect } from "next/navigation";
import { verifyStaffSession } from "@/lib/staff-session";
import AdminShell from "../AdminShell";

// Puerta de entrada al panel operativo: exige una sesión de personal válida
// (admin o trabajador). El chequeo toca la BD (usuario activo + epoch), así
// que una desactivación expulsa en la siguiente navegación.
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifyStaffSession();
  if (!session) redirect("/admin/login");

  return (
    <AdminShell role={session.role} staffName={session.name}>
      {children}
    </AdminShell>
  );
}
