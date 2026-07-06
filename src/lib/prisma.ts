import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Declaración global para evitar múltiples instancias en Next.js dev mode
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Configuramos la conexión con el driver de pg nativo
const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Inicializamos el Prisma Client con el adapter pg
export const prisma =
  globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
