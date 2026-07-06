import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Limpiando la base de datos...');
  await prisma.booking.deleteMany();
  await prisma.service.deleteMany();

  console.log('🌱 Ejecutando seed de Servicios con Precios Dinámicos...');

  const services = [
    // LAVADOS
    {
      name: 'Lavado VIP',
      description: 'Lavado exterior e interior detallado. Uso de champú pH neutro y cera rápida.',
      duration: 60,
      priceAuto: 20000,
      priceSuv2: 25000,
      priceSuv3: 35000,
      category: 'Lavados'
    },
    {
      name: 'Lavado de Chasis y Motor',
      description: 'Lavado profundo y detallado del chasis y compartimento del motor.',
      duration: 90,
      priceAuto: 30000,
      priceSuv2: 40000,
      priceSuv3: 50000,
      category: 'Lavados'
    },
    // DETAILING
    {
      name: 'Detailing Exterior',
      description: 'Limpieza minuciosa, descontaminación de pintura, limpieza de llantas y acondicionado de plásticos.',
      duration: 180,
      priceAuto: 80000,
      priceSuv2: 100000,
      priceSuv3: 130000,
      category: 'Detailing'
    },
    {
      name: 'Detailing Interior',
      description: 'Limpieza profunda de tapicería, cueros, plásticos, techo y alfombras con inyección/extracción.',
      duration: 180,
      priceAuto: 90000,
      priceSuv2: 110000,
      priceSuv3: 150000,
      category: 'Detailing'
    },
    {
      name: 'Corrección de Pintura (Pulido)',
      description: 'Eliminación de micro-rayas (swirls) y oxidación. Devuelve el brillo intenso original de fábrica.',
      duration: 360,
      priceAuto: 150000,
      priceSuv2: 200000,
      priceSuv3: 250000,
      category: 'Detailing'
    },
    // SERVICIOS ESPECIALES (Sellados)
    {
      name: 'Sellado Cerámico 9H',
      description: 'Tratamientos basados en nanotecnología que llevarán a tu vehículo a un nivel superior. Duración hasta 3 años.',
      duration: 480,
      priceAuto: 250000,
      priceSuv2: 300000,
      priceSuv3: 350000,
      category: 'Servicios Especiales'
    },
    {
      name: 'Restauración de Ópticos',
      description: 'Pulido y sellado UV de focos delanteros y traseros para máxima visibilidad nocturna.',
      duration: 60,
      priceAuto: 30000,
      priceSuv2: 30000,
      priceSuv3: 30000,
      category: 'Servicios Especiales'
    },
    // MECÁNICA
    {
      name: 'Mantención por Kilometraje',
      description: 'Cambio de aceite sintético, filtros y revisión de 30 puntos de seguridad.',
      duration: 120,
      priceAuto: 120000,
      priceSuv2: 150000,
      priceSuv3: 180000,
      category: 'Mecánica'
    },
    {
      name: 'Inspección Pre-Compra',
      description: 'Revisión técnica, escáner automotriz y medición de espesor de pintura.',
      duration: 90,
      priceAuto: 45000,
      priceSuv2: 50000,
      priceSuv3: 60000,
      category: 'Mecánica'
    }
  ];

  for (const service of services) {
    await prisma.service.create({
      data: service,
    });
  }

  console.log(`✅ Se insertaron ${services.length} servicios exitosamente con precios dinámicos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
