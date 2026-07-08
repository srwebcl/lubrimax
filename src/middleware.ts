import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  
  // Protect all /admin routes except /admin/login
  if (url.pathname.startsWith('/admin') && url.pathname !== '/admin/login') {
    const session = request.cookies.get('lubrimax_admin_session');
    
    if (!session || session.value !== 'authenticated') {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users away from the login page
  if (url.pathname === '/admin/login') {
    const session = request.cookies.get('lubrimax_admin_session');
    if (session && session.value === 'authenticated') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // Protect customer private routes
  if (url.pathname.startsWith('/perfil')) {
    const customerSession = request.cookies.get('lubrimax_customer_session');
    
    if (!customerSession || customerSession.value === '') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', url.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated customers away from public auth pages
  if (url.pathname === '/login' || url.pathname === '/registro') {
    const customerSession = request.cookies.get('lubrimax_customer_session');
    if (customerSession && customerSession.value !== '') {
      return NextResponse.redirect(new URL('/perfil', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/perfil/:path*', '/login', '/registro'],
};
