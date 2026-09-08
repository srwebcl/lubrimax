import { redirect } from "next/navigation";
import { verifyStaffSession } from "@/lib/staff-session";

// Secciones de gestión (catálogo, tienda, cupones, club, ajustes, usuarios):
// SOLO ADMIN. Un trabajador que llega acá — por link directo o URL a mano —
// se va a la agenda. Defensa en profundidad: proxy.ts ya lo redirige de
// forma optimista y cada Server Action de estas secciones llama requireRole.
export default async function GestionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifyStaffSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "ADMIN") redirect("/admin");

  return children;
}
