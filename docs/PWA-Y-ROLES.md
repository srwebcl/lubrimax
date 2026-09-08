# PWA + accesos Admin / Trabajador

Rama: `feat/pwa-roles`. Este documento resume el cambio y los pasos manuales
para dejarlo en producción.

## Qué cambió

### Autenticación del panel
- Se elimina la credencial única de entorno. Ahora hay **cuentas nominales**
  en la tabla `StaffUser` (contraseña bcrypt) con rol `ADMIN` o `WORKER`.
- El login (`/admin/login`) es **por correo + contraseña**, el mismo para
  ambos roles.
- La cookie de sesión (`lubrimax_staff_session`) va firmada (HMAC) y lleva
  `userId`, `role` y `epoch`. En cada request sensible se revalida contra la
  BD: si el usuario está desactivado o su `sessionEpoch` cambió, la sesión
  cae al instante.
- Duración de sesión: **12 h** (equipos compartidos del taller).
- `SameSite=Strict`, `HttpOnly`, `Secure` en producción.

### Autorización (defensa en profundidad)
1. `proxy.ts` — chequeo optimista: sin sesión → `/admin/login`; trabajador en
   una sección de gestión → `/admin`.
2. Layouts de servidor — `(panel)/layout.tsx` exige sesión;
   `(panel)/(gestion)/layout.tsx` exige `ADMIN`.
3. Server Actions — `requireStaff()` / `requireRole("ADMIN")` al inicio de
   cada acción. **Esta es la línea de defensa real.**

### Matriz de acceso
| Sección | Admin | Trabajador |
|---|---|---|
| Agenda (`/admin`) + marcar avance de trabajo | ✅ | ✅ |
| Mi perfil / cambiar mi contraseña | ✅ | ✅ |
| Reagendar / estado de pago / estado de reserva | ✅ | ❌ |
| Catálogo, categorías, club, pedidos, tienda, cupones, ajustes | ✅ | ❌ |
| Usuarios del panel (`/admin/usuarios`) | ✅ | ❌ |

### Datos nuevos (schema)
- `enum StaffRole { ADMIN WORKER }`
- `model StaffUser` (email, password, name, role, isActive, sessionEpoch, lastLoginAt)
- `Booking.workStatus` — `PENDING` / `IN_PROGRESS` / `DONE`. Campo **separado**
  de `Booking.status` (ciclo comercial). Lo marca el trabajador desde la agenda.
- `model BookingActivityLog` — bitácora de quién cambió qué reserva.

### PWA
- `app/manifest.ts` → `/manifest.webmanifest`, `display: standalone`,
  `start_url: /admin`, tema oscuro.
- Iconos en `public/icons/` (192, 512, maskable, apple-touch).
- `public/sw.js` — service worker propio: instala la app, cachea el cascarón
  público y `/offline`. **Nunca cachea `/admin`, `/api`, Server Actions ni
  rutas de cuenta de cliente.**
- SW se registra **solo en producción** (`ServiceWorkerRegister`).

### Seguridad general
- `next.config.ts`: HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy`; `Cache-Control: no-store` para `/sw.js`.
- Se corrigió un agujero pre-existente: `admin-categories.ts` no verificaba
  autorización en sus mutaciones.
- Rate limit de login por **IP y por correo**.

## Pasos para producción

1. **Variables de entorno** (local en `.env`, y en Vercel → Project Settings
   → Environment Variables):
   ```
   STAFF_SESSION_SECRET=<openssl rand -base64 32>
   ```
   (Local ya quedó seteada. En Vercel hay que agregarla.)

2. **Aplicar el schema a la BD** (aditivo, no borra datos):
   ```
   npx prisma db push
   ```
   > Requiere `DIRECT_URL`. Si prefieres migraciones versionadas:
   > `npx prisma migrate dev --name staff_roles_pwa`.

3. **Crear el primer administrador**:
   ```
   SEED_ADMIN_EMAIL="dueno@lubrimax.cl" \
   SEED_ADMIN_PASSWORD="una-clave-larga-y-unica" \
   SEED_ADMIN_NAME="Nombre Apellido" \
   npm run seed:admin
   ```
   Idempotente: se puede volver a correr para resetear esa cuenta.

4. **Desde el panel** (`/admin/usuarios`): crear las cuentas de los
   trabajadores con rol `Trabajador`.

5. **Desplegar** la rama. Verificar que Vercel tiene `STAFF_SESSION_SECRET`
   antes del deploy o el login fallará (a propósito, sin fallback inseguro).

6. (Opcional) Quitar `ADMIN_USER` / `ADMIN_PASSWORD` de Vercel una vez creado
   el primer admin.

## Checklist de pruebas (post-deploy)

- [ ] Login admin con correo/clave → ve todo el menú.
- [ ] Login trabajador → solo ve "Agenda"; `/admin/servicios` a mano lo
      redirige a `/admin`.
- [ ] Trabajador marca "En proceso" / "Terminado" en una reserva → persiste.
- [ ] Admin reagenda una reserva → queda registro en `BookingActivityLog`.
- [ ] `/admin/usuarios`: crear, editar rol, resetear clave, forzar logout.
- [ ] "Forzar logout" a un usuario con sesión abierta → en su siguiente
      navegación cae a `/admin/login`.
- [ ] No se puede desactivar / degradar al último admin.
- [ ] Cambiar mi contraseña desde `/admin/perfil` → sigo con sesión.
- [ ] Instalar la PWA en Android (Chrome → "Agregar a pantalla de inicio").
- [ ] En iOS: Safari → Compartir → "Agregar a inicio".
- [ ] Con la PWA instalada y en modo avión: abrir muestra `/offline`, no un
      error del navegador.
- [ ] DevTools → Application → Service Workers: activo; Cache Storage **no**
      contiene respuestas de `/admin` ni `/api`.
- [ ] Lighthouse → PWA: installable OK.

## Follow-ups recomendados (no incluidos)

- **Rate limit en Redis (Upstash)**: el actual es en memoria y en serverless
  no es un límite global. Interfaz ya aislada en `src/lib/rate-limit.ts`.
- **CSP estricta** con nonces (hoy solo va `X-Frame-Options`). Framer-motion /
  GSAP usan estilos inline, requiere pruebas.
- **Notificaciones push** al trabajador cuando entra una reserva nueva
  (VAPID + `web-push`, ver `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`).
- **2FA / passkey** para cuentas `ADMIN`.
- Asignar reservas a un trabajador puntual (hoy todos ven todas, según lo
  pedido).
