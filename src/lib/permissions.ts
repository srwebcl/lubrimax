// Permisos del TRABAJADOR que el administrador habilita uno a uno
// (Usuarios → Permisos). El ADMIN siempre tiene todo. Lo que es solo del
// admin (tienda, usuarios, estadísticas, ajustes, catálogo) no se delega.
//
// Se guardan en StaffUser.permissions y se leen de la BD en cada request
// (verifyStaffSession), así que un cambio aplica al instante, sin cerrar la
// sesión del trabajador. Se imponen en: Server Actions (requirePermission),
// páginas (requireStaffPage) y la interfaz (botones y menú).

export const WORKER_PERMISSIONS = [
  { key: "intake", label: "Registrar ingresos", hint: "Nuevo ingreso y recepción de reservas (\"Llegó\")." },
  { key: "work", label: "Iniciar y terminar trabajos", hint: "Mover autos entre En espera, En proceso y Listo." },
  { key: "deliver", label: "Entregar vehículos", hint: "Marcar el auto como entregado al cliente." },
  { key: "charge", label: "Cobrar en el local", hint: "Registrar pagos en efectivo, tarjeta o transferencia." },
  { key: "pricing", label: "Ajustar precios a evaluar", hint: "Poner precio a mecánica y servicios personalizados." },
  { key: "noshow", label: "Marcar \"No vino\"", hint: "Liberar el horario de una reserva que no llegó." },
  { key: "agenda", label: "Ver la Agenda", hint: "Reservas de otros días (sin reagendar ni pagos)." },
  { key: "clients_view", label: "Ver clientes", hint: "Directorio, fichas e historial." },
  { key: "clients_edit", label: "Editar clientes", hint: "Modificar datos y vehículos de una ficha." },
] as const;

export type Permission = (typeof WORKER_PERMISSIONS)[number]["key"];

export const ALL_WORKER_PERMISSIONS: Permission[] = WORKER_PERMISSIONS.map((p) => p.key);

export function isPermission(value: string): value is Permission {
  return (ALL_WORKER_PERMISSIONS as string[]).includes(value);
}

/** Normaliza una lista: solo claves válidas y "editar clientes" implica "ver clientes". */
export function normalizePermissions(list: readonly string[]): Permission[] {
  const set = new Set(list.filter(isPermission));
  if (set.has("clients_edit")) set.add("clients_view");
  return ALL_WORKER_PERMISSIONS.filter((p) => set.has(p));
}

export type PermissionSubject = { role: "ADMIN" | "WORKER"; permissions: readonly string[] };

export function can(subject: PermissionSubject | null | undefined, permission: Permission) {
  if (!subject) return false;
  return subject.role === "ADMIN" || subject.permissions.includes(permission);
}
