/**
 * Crea (o actualiza) el primer usuario ADMIN del panel a partir de variables
 * de entorno. Ejecutar UNA vez tras aplicar el schema:
 *
 *   SEED_ADMIN_EMAIL="dueño@lubrimax.cl" \
 *   SEED_ADMIN_PASSWORD="una-clave-larga-y-unica" \
 *   SEED_ADMIN_NAME="Nombre Apellido" \
 *   npx tsx scripts/seed-staff-admin.ts
 *
 * Si no se pasan las SEED_*, cae a ADMIN_USER/ADMIN_PASSWORD (compatibilidad
 * con el entorno actual). Idempotente: si el correo ya existe, solo actualiza
 * nombre/rol/estado y (si se indica) la contraseña.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || process.env.ADMIN_USER || "")
    .toLowerCase()
    .trim();
  const password = process.env.SEED_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
  const name = process.env.SEED_ADMIN_NAME || "Administrador";

  if (!email || !email.includes("@")) {
    throw new Error(
      "Falta SEED_ADMIN_EMAIL (un correo válido). ADMIN_USER='admin' no sirve: ahora el login es por correo."
    );
  }
  if (password.length < 10) {
    throw new Error("SEED_ADMIN_PASSWORD debe tener al menos 10 caracteres.");
  }

  const hash = await bcrypt.hash(password, 12);

  const existing = await prisma.staffUser.findUnique({ where: { email } });

  if (existing) {
    await prisma.staffUser.update({
      where: { email },
      data: {
        name,
        role: "ADMIN",
        isActive: true,
        password: hash,
        sessionEpoch: { increment: 1 },
      },
    });
    console.log(`✅ Usuario ADMIN actualizado: ${email}`);
  } else {
    await prisma.staffUser.create({
      data: { email, name, role: "ADMIN", isActive: true, password: hash },
    });
    console.log(`✅ Usuario ADMIN creado: ${email}`);
  }

  const count = await prisma.staffUser.count();
  console.log(`   Total de usuarios del panel: ${count}`);
}

main()
  .catch((e) => {
    console.error("❌", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
