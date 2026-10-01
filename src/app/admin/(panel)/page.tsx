import { requireStaffPage } from "@/lib/staff-session";
import { getBoard } from "@/actions/workshop";
import WorkshopBoard from "./WorkshopBoard";
import { can } from "@/lib/permissions";

export const metadata = {
  title: "Taller | Lubrimax",
};

export const dynamic = "force-dynamic";

// Tablero del Taller: pantalla de inicio del panel. Reúne en un solo lugar a
// todos los vehículos del día, lleguen por reserva web o directo al local.
export default async function WorkshopPage() {
  const session = await requireStaffPage();
  const board = await getBoard();
  // Qué puede hacer este usuario en el Tablero (el admin, todo).
  const allowed = {
    intake: can(session, "intake"),
    work: can(session, "work"),
    deliver: can(session, "deliver"),
    charge: can(session, "charge"),
    pricing: can(session, "pricing"),
    noshow: can(session, "noshow"),
  };

  return (
    <div className="px-4 sm:px-6 py-4 w-full max-w-7xl mx-auto">
      <WorkshopBoard board={board} allowed={allowed} />
    </div>
  );
}
