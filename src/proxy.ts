import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminSessionToken } from '@/lib/admin-session';
import { verifyCustomerSessionToken } from '@/lib/customer-session';

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;

  // Protect all /admin routes except /admin/login
  if (url.pathname.startsWith('/admin') && url.pathname !== '/admin/login') {
    const session = request.cookies.get('lubrimax_admin_session');

    if (!(await verifyAdminSessionToken(session?.value))) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users away from the login page
  if (url.pathname === '/admin/login') {
    const session = request.cookies.get('lubrimax_admin_session');
    if (await verifyAdminSessionToken(session?.value)) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // Protect customer private routes. Esto es solo un chequeo optimista para
  // UX (redirigir antes de renderizar) — cada Server Action que toca datos
  // de un cliente vuelve a verificar la sesión por su cuenta, como recomienda
  // la guía de seguridad de Next.js para Server Actions.
  if (url.pathname.startsWith('/perfil')) {
    const customerSession = request.cookies.get('lubrimax_customer_session');
    const customerId = await verifyCustomerSessionToken(customerSession?.value);

    if (!customerId) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', url.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated customers away from public auth pages
  if (url.pathname === '/login' || url.pathname === '/registro') {
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
