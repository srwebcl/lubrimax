import { NextResponse } from "next/server";
import { STAFF_SESSION_COOKIE } from "@/lib/staff-token";

// Sesión del panel con firma válida pero ya no vigente en la BD (usuario
// desactivado, "forzar logout", cambio de contraseña…). Los layouts/páginas
// del panel redirigen acá: se borra la cookie y se va al login. Sin esto,
// proxy.ts (que solo verifica la firma) mandaba del login al panel y el
// panel de vuelta al login, en un bucle infinito.
export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url));
  response.cookies.delete(STAFF_SESSION_COOKIE);
  return response;
}
