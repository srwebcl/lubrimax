import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Protegemos todas las rutas que empiecen por /admin
  if (url.pathname.startsWith('/admin')) {
    const basicAuth = req.headers.get('authorization');
    
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      const [user, pwd] = atob(authValue).split(':');

      // Se recomienda fuertemente configurar estas variables en el entorno (.env)
      const validUser = process.env.ADMIN_USER || 'admin';
      const validPwd = process.env.ADMIN_PASSWORD || 'lubrimax123';

      if (user === validUser && pwd === validPwd) {
        return NextResponse.next();
      }
    }

    // Si no hay autenticación o las credenciales son incorrectas, lanza prompt de login
    return new NextResponse('Autenticación requerida para acceder al Centro de Comando Lubrimax', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Acceso Restringido LUBRIMAX"',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
