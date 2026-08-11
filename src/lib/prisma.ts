import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Declaración global para evitar múltiples instancias en Next.js dev mode
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Configuramos la conexión con el driver de pg nativo. max bajo a propósito:
// en Vercel cada invocación serverless puede levantar su propia instancia de
// este módulo, y cada una abriría hasta `max` conexiones contra el pooler de
// Neon. Con muchas invocaciones concurrentes, un max alto (el default de pg
// es 10) puede agotar el límite de conexiones del pooler; 1 conexión por
// instancia de función alcanza sobra para el tráfico de una request.
const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString, max: 1 });
const adapter = new PrismaPg(pool);

// Inicializamos el Prisma Client con el adapter pg
export const prisma =
  globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
