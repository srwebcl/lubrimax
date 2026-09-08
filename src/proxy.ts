import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  STAFF_SESSION_COOKIE,
  verifyStaffTokenPayload,
} from '@/lib/staff-token';
import { verifyCustomerSessionToken } from '@/lib/customer-session';

// Rutas del panel que SOLO puede ver un ADMIN. El trabajador (WORKER) queda
// restringido a la agenda operativa (`/admin`) y su perfil. Esto es un
// chequeo OPTIMISTA (solo lee la cookie firmada, no la BD) para redirigir
// antes de renderizar; la verdad la imponen los layouts de servidor y cada
// Server Action (ver requireRole en src/lib/staff-session.ts).
const ADMIN_ONLY_PREFIXES = [
  '/admin/servicios',
  '/admin/categorias',
  '/admin/club',
  '/admin/pedidos',
  '/admin/tienda',
  '/admin/cupones',
  '/admin/configuracion',
  '/admin/usuarios',
];

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;

  // ---------- Panel de personal (/admin) ----------
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const token = request.cookies.get(STAFF_SESSION_COOKIE)?.value;
    const payload = await verifyStaffTokenPayload(token);

    if (!payload) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Un trabajador que intenta entrar a una sección de gestión vuelve a la
    // agenda.
    if (
      payload.role !== 'ADMIN' &&
      ADMIN_ONLY_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))
    ) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  if (path === '/admin/login') {
    const token = request.cookies.get(STAFF_SESSION_COOKIE)?.value;
    if (await verifyStaffTokenPayload(token)) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // ---------- Rutas privadas de cliente ----------
  // Chequeo optimista para UX; cada Server Action de cliente revalida por su
  // cuenta.
  if (path.startsWith('/perfil')) {
    const customerSession = request.cookies.get('lubrimax_customer_session');
    const customerId = await verifyCustomerSessionToken(customerSession?.value);

    if (!customerId) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (path === '/login' || path === '/registro') {
    const customerSession = request.cookies.get('lubrimax_customer_session');
    const customerId = await verifyCustomerSessionToken(customerSession?.value);
    if (customerId) {
      return NextResponse.redirect(new URL('/perfil', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/perfil/:path*', '/login', '/registro'],
};
