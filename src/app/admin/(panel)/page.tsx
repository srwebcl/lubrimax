import { requireStaffPage } from "@/lib/staff-session";
import { getBoard } from "@/actions/workshop";
import WorkshopBoard from "./WorkshopBoard";

export const metadata = {
  title: "Taller | Lubrimax",
};

export const dynamic = "force-dynamic";

// Tablero del Taller: pantalla de inicio del panel. Reúne en un solo lugar a
// todos los vehículos del día, lleguen por reserva web o directo al local.
export default async function WorkshopPage() {
  await requireStaffPage();
  const board = await getBoard();

  return (
    <div className="px-4 sm:px-6 py-4 w-full max-w-7xl mx-auto">
      <WorkshopBoard board={board} />
    </div>
  );
}
