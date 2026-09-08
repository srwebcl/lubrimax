import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel | Lubrimax",
  robots: { index: false, follow: false },
};

// Layout raíz del panel. NO valida sesión acá: /admin/login vive debajo de
// este layout. La autorización real está en (panel)/layout.tsx (cualquier
// personal) y (panel)/(gestion)/layout.tsx (solo ADMIN), más cada Server
// Action.
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
