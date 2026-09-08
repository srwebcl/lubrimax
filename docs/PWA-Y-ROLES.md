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

## Pasos para producción (en este orden)

Todos los comandos se ejecutan **desde la raíz del proyecto**
(`/Users/sebastianrodriguezmilla/proyectos-web/lubrimax`) y en la rama
`feat/pwa-roles` (`git checkout feat/pwa-roles`).

---

### Paso 1 — Generar el secreto de sesión del panel

```bash
openssl rand -base64 32
```

Copia la línea que imprime (ej. `k7Qh2v...=`, 44 caracteres). Es el valor de
`STAFF_SESSION_SECRET`. Guárdalo, lo usas en los pasos 2 y 4.

> En tu `.env` local ya hay un `STAFF_SESSION_SECRET` (lo generó el plan). Ese
> sirve para desarrollo. Para producción usa **uno nuevo** de este paso.

---

### Paso 2 — Cargar las variables de entorno en Vercel

En **vercel.com → proyecto `lubrimax` → Settings → Environment Variables**,
agrega (marca los 3 entornos: Production, Preview, Development):

| Name | Value |
|---|---|
| `STAFF_SESSION_SECRET` | el secreto del Paso 1 |

Verifica que ya existan (deberían estar): `DATABASE_URL`, `DIRECT_URL`,
`CUSTOMER_SESSION_SECRET`, `R2_*`, `RESEND_API_KEY`, `NEXT_PUBLIC_SITE_URL`.

> Si `STAFF_SESSION_SECRET` no está en Vercel al desplegar, el login del panel
> devuelve error 500 **a propósito** (no hay fallback inseguro).

---

### Paso 3 — Aplicar el schema a la base de datos

Cambios **aditivos** (una tabla nueva `StaffUser`, un enum `StaffRole`, la
columna `Booking.workStatus` con default, la tabla `BookingActivityLog`). No
borra ni modifica datos existentes; el código actual en producción sigue
funcionando aunque todavía no esté desplegada la rama.

```bash
npx prisma db push
```

Salida esperada: `🚀  Your database is now in sync with your Prisma schema.`
Usa `DIRECT_URL` automáticamente.

- Si pide `--accept-data-loss`: **DETENTE** y avisa — no debería pasar con
  estos cambios.
- Alternativa con migración versionada:
  `npx prisma migrate dev --name staff_roles_pwa`.

---

### Paso 4 — Crear el primer administrador

Reemplaza los 3 valores por los reales (correo con el que entrarás al panel y
una contraseña de **mínimo 10 caracteres**):

```bash
SEED_ADMIN_EMAIL="tucorreo@ejemplo.com" \
SEED_ADMIN_PASSWORD="una-clave-larga-y-unica" \
SEED_ADMIN_NAME="Tu Nombre" \
npm run seed:admin
```

Salida esperada: `✅ Usuario ADMIN creado: tucorreo@ejemplo.com`.
Es idempotente: si lo vuelves a correr con el mismo correo, actualiza esa
cuenta (sirve para resetear tu propia clave si te quedas afuera).

> Este comando corre localmente pero escribe en la BD de producción (la de
> `DATABASE_URL`). Es la misma que usará el sitio desplegado.

---

### Paso 5 — Desplegar la rama

**Opción A (recomendada): merge a `main`**

```bash
git checkout main
git merge feat/pwa-roles
git push origin main
```

Vercel despliega solo. Espera a que el build termine en verde.

**Opción B: preview primero**

```bash
git push origin feat/pwa-roles
```

Vercel crea una URL de Preview. Pruébala (Paso 7) y luego haz el merge de la
Opción A.

---

### Paso 6 — Crear las cuentas de los trabajadores

Entra al panel ya desplegado: `https://<tu-dominio>/admin/login` con el correo
y clave del Paso 4.

Ve a **Usuarios** (menú lateral) → **➕ Nuevo usuario**:
- Nombre y apellido
- Correo (con ese correo inicia sesión el trabajador)
- Contraseña temporal (mín. 10 caracteres) — dásela al trabajador; él la
  cambia después en **Mi perfil**
- Rol: **Trabajador**

Repite por cada trabajador.

---

### Paso 7 — Limpieza (opcional)

Una vez que entras bien con tu cuenta nueva, en Vercel puedes **eliminar**
`ADMIN_USER` y `ADMIN_PASSWORD` (ya no se usan para iniciar sesión).

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

## Módulo: Recepción de vehículos (rama `feat/ingreso-vehiculos`)

Lo usa el **trabajador** (y el admin). Nueva pestaña **"Ingreso"** en el panel.

**Flujo:** el trabajador escribe la **patente** → si el vehículo ya existe,
se cargan solos los datos del cliente; si no, completa
`Marca, Modelo, Color, Nombre, RUT, Teléfono, Correo`, kilometraje,
observaciones y (opcional) una **foto** (abre la cámara en el celular).
Puede asociar el ingreso a una reserva del día. Abajo se ve la lista
**"En el taller ahora"** con botón "Entregar".

**Datos nuevos (schema):**
- `WorkshopClient` — cliente del taller identificado por RUT (independiente de
  `Customer`, que son las cuentas de tienda/Club con contraseña).
- `Vehicle` — vehículo por `plate` (patente única, normalizada).
- `VehicleIntake` — cada ingreso: foto, km, notas, estado `IN_SHOP`/`DELIVERED`,
  quién lo registró, reserva asociada (opcional).
- La agenda muestra un badge **"En taller"** cuando la reserva ya tiene ingreso.

**Pasos para producción de este módulo** (después de que el módulo de roles
ya esté funcionando):

1. `git merge feat/ingreso-vehiculos` (o desplegar esa rama).
2. **Aplicar el schema otra vez** (agrega 3 tablas, aditivo):
   ```
   npx prisma db push
   ```
3. Listo — no necesita variables nuevas. La subida de fotos usa el mismo
   `/api/upload` (ahora habilitado también para el rol `WORKER`).

> **OCR de patente por foto:** no incluido. La foto se adjunta pero la
> patente se escribe a mano. Automatizar la lectura requiere un servicio de
> OCR (follow-up).

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
