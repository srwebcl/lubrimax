import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const services = [
  // --- LAVADOS ---
  {
    name: 'Lavado Simple',
    description: 'Limpieza con hidrolavadora y triple shampoo neutro, secado con paños de microfibra, limpieza de vidrios, humectador de plásticos exteriores, renovador de neumáticos.',
    duration: 30, // base en autos
    priceAuto: 10000,
    priceSuv2: 12000,
    priceSuv3: 14000,
    category: 'Lavados'
  },
  {
    name: 'Lavado Full',
    description: 'Limpieza con hidrolavadora y triple shampoo neutro, secado con paño microfibra, limpieza de vidrios, renovador plásticos exteriores, renovador de neumáticos, aspirado, limpieza de paneles.',
    duration: 60,
    priceAuto: 18000,
    priceSuv2: 24000,
    priceSuv3: 26000,
    category: 'Lavados'
  },
  {
    name: 'Lavado Premium',
    description: 'Limpieza con hidrolavadora y triple shampoo neutro, secado con paños microfibra, aplicación de cera carnauba, limpieza de vidrios, humectador de plásticos exteriores, renovador de neumáticos, aspirado, sanitización de ductos de ventilación y cabina, aplicación de silicona libre de aceite y aroma de regalo.',
    duration: 90,
    priceAuto: 50000,
    priceSuv2: 55000,
    priceSuv3: 60000,
    category: 'Lavados'
  },

  // --- DETAILING ---
  {
    name: 'Detailing Interior',
    description: 'Tratamiento con alta tecnología y productos biodegradables: aspirado profundo, limpieza de tapiz de asientos, cabecera, alfombra, techo interior, puertas, panel central, sanitización de ductos y cabina, limpieza completa de porta maletas + regalo lavado exterior.',
    duration: 480,
    priceAuto: 150000,
    priceSuv2: 170000,
    priceSuv3: 190000,
    category: 'Detailing'
  },
  {
    name: 'Detailing Exterior - Nanotecnología (7 meses)',
    description: 'Lavado exterior, lavado de motor, desengrasantes y descontaminado de llantas, acondicionamiento de neumáticos, pulido en 3 pasos (corte grueso, intermedio y espejo) y sellado de pintura con Nanotecnología.',
    duration: 480,
    priceAuto: 200000,
    priceSuv2: 250000,
    priceSuv3: 280000,
    category: 'Detailing'
  },
  {
    name: 'Detailing Exterior - Cerámico (2 años)',
    description: 'Lavado exterior, lavado de motor, descontaminado de llantas, pulido en 3 pasos y sellado de pintura con Cerámico 2 años.',
    duration: 480,
    priceAuto: 260000,
    priceSuv2: 310000,
    priceSuv3: 340000,
    category: 'Detailing'
  },
  {
    name: 'Detailing Exterior - Cerámico (3 años)',
    description: 'Lavado exterior, lavado de motor, descontaminado de llantas, pulido en 3 pasos y sellado de pintura con Cerámico 3 años.',
    duration: 480,
    priceAuto: 320000,
    priceSuv2: 370000,
    priceSuv3: 420000,
    category: 'Detailing'
  },
  {
    name: 'Detailing Premium - Nanotecnología (7 meses)',
    description: 'Combina el detailing exterior completo (lavado, pulido 3 pasos, sellado Nanotecnología) con el tratamiento interior completo.',
    duration: 480,
    priceAuto: 300000,
    priceSuv2: 370000,
    priceSuv3: 420000,
    category: 'Detailing'
  },
  {
    name: 'Detailing Premium - Cerámico (2 años)',
    description: 'Combina el detailing exterior completo (sellado Cerámico 2 años) con el tratamiento interior completo.',
    duration: 480,
    priceAuto: 360000,
    priceSuv2: 430000,
    priceSuv3: 480000,
    category: 'Detailing'
  },
  {
    name: 'Detailing Premium - Cerámico (3 años)',
    description: 'Combina el detailing exterior completo (sellado Cerámico 3 años) con el tratamiento interior completo.',
    duration: 480,
    priceAuto: 420000,
    priceSuv2: 490000,
    priceSuv3: 560000,
    category: 'Detailing'
  },

  // --- EXTRAS ---
  {
    name: 'Lavado de Tapiz',
    description: 'Limpieza de asientos completa con tecnología de punta y productos biodegradables.',
    duration: 150,
    priceAuto: 50000,
    priceSuv2: 55000,
    priceSuv3: 60000,
    category: 'Extras'
  },
  {
    name: 'Descontaminado de Pintura',
    description: 'Lavado exterior, desengrasante y abrillantador de llantas, acondicionamiento de neumáticos, descontaminación de pintura y vidrios con Clay Bar.',
    duration: 210,
    priceAuto: 45000,
    priceSuv2: 60000,
    priceSuv3: 65000,
    category: 'Extras'
  },
  {
    name: 'Lavado de Techo',
    description: 'Limpieza del techo interior del vehículo con productos biodegradables y tecnología de punta.',
    duration: 60,
    priceAuto: 25000,
    priceSuv2: 30000,
    priceSuv3: 35000,
    category: 'Extras'
  },
  {
    name: 'Lavado de Alfombra',
    description: 'Lavado de la alfombra interior con productos biodegradables y tecnología de punta.',
    duration: 120,
    priceAuto: 30000,
    priceSuv2: 35000,
    priceSuv3: 40000,
    category: 'Extras'
  },
  {
    name: 'Pulido de Focos',
    description: 'Pulido y sellado de focos para cualquier categoría de vehículo.',
    duration: 60,
    priceAuto: 40000,
    priceSuv2: 40000,
    priceSuv3: 40000,
    category: 'Extras'
  },
  {
    name: 'Lavado de Motor',
    description: 'Lavado profundo de motor para cualquier categoría de vehículo.',
    duration: 40,
    priceAuto: 25000,
    priceSuv2: 25000,
    priceSuv3: 25000,
    category: 'Extras'
  },
  {
    name: 'Pulido y Pintado de Llantas',
    description: 'Tratamiento completo de pulido y pintado para las 4 llantas.',
    duration: 420,
    priceAuto: 140000,
    priceSuv2: 160000,
    priceSuv3: 170000,
    category: 'Extras'
  },
  {
    name: 'Limpieza y Humectación de Cueros',
    description: 'Tratamiento de hidratación y limpieza de tapicería de cuero.',
    duration: 60,
    priceAuto: 15000,
    priceSuv2: 20000,
    priceSuv3: 25000,
    category: 'Extras'
  },
  {
    name: 'Lavado y Sellado de Chasis',
    description: 'Lavado profundo y sellado protector para el chasis.',
    duration: 240,
    priceAuto: 150000,
    priceSuv2: 230000,
    priceSuv3: 280000,
    category: 'Extras'
  },
  {
    name: 'Lavado y Pulverizado de Chasis',
    description: 'Lavado de chasis, desengrasantes y aplicación de glicerol para detener oxidación y ruidos.',
    duration: 120,
    priceAuto: 70000,
    priceSuv2: 80000,
    priceSuv3: 100000,
    category: 'Extras'
  },
  {
    name: 'Lavado Alfombra Anegada',
    description: 'Desarme de molduras, extracción completa, sanitización (hongos, bacterias), eliminación de aislante dañado, instalación de aislante nuevo y armado.',
    duration: 240,
    priceAuto: 180000,
    priceSuv2: 200000,
    priceSuv3: 240000,
    category: 'Extras'
  },

  // Grabados de Patente
  { name: 'Grabado de Patentes - Solo patente', description: 'Válido hasta 10 vidrios.', duration: 35, priceAuto: 25000, priceSuv2: 25000, priceSuv3: 25000, category: 'Extras' },
  { name: 'Grabado de Patentes - Solo la marca', description: 'Válido hasta 10 vidrios.', duration: 35, priceAuto: 25000, priceSuv2: 25000, priceSuv3: 25000, category: 'Extras' },
  { name: 'Grabado de Patentes - Solo número VIN', description: 'Válido hasta 10 vidrios.', duration: 35, priceAuto: 25000, priceSuv2: 25000, priceSuv3: 25000, category: 'Extras' },
  { name: 'Grabado de Patentes - Marca + N° VIN', description: 'Válido hasta 10 vidrios.', duration: 35, priceAuto: 30000, priceSuv2: 30000, priceSuv3: 30000, category: 'Extras' },
  { name: 'Grabado de Patentes - Marca + Patente', description: 'Válido hasta 10 vidrios.', duration: 35, priceAuto: 30000, priceSuv2: 30000, priceSuv3: 30000, category: 'Extras' },
  { name: 'Grabado de Patentes - N° VIN + Patente', description: 'Válido hasta 10 vidrios.', duration: 35, priceAuto: 30000, priceSuv2: 30000, priceSuv3: 30000, category: 'Extras' },
  { name: 'Grabado de Patentes - Logo + Patente + N° VIN', description: 'Válido hasta 10 vidrios.', duration: 35, priceAuto: 35000, priceSuv2: 35000, priceSuv3: 35000, category: 'Extras' },

  // --- MECÁNICA (Consultar por interno, price: null) ---
  { name: 'Mecánica - Cambio de pastillas de frenos', description: 'Consultar valor vía WhatsApp.', duration: 60, priceAuto: null, priceSuv2: null, priceSuv3: null, category: 'Mecánica' },
  { name: 'Mecánica - Rectificación de discos', description: 'Consultar valor vía WhatsApp.', duration: 60, priceAuto: null, priceSuv2: null, priceSuv3: null, category: 'Mecánica' },
  { name: 'Mecánica - Cambio de aceite', description: 'Consultar valor vía WhatsApp.', duration: 60, priceAuto: null, priceSuv2: null, priceSuv3: null, category: 'Mecánica' },
  { name: 'Mecánica - Filtros', description: 'Consultar valor vía WhatsApp.', duration: 60, priceAuto: null, priceSuv2: null, priceSuv3: null, category: 'Mecánica' },
  { name: 'Mecánica - Plumillas', description: 'Consultar valor vía WhatsApp.', duration: 15, priceAuto: null, priceSuv2: null, priceSuv3: null, category: 'Mecánica' },
  { name: 'Mecánica - Filtro de combustible', description: 'Consultar valor vía WhatsApp.', duration: 60, priceAuto: null, priceSuv2: null, priceSuv3: null, category: 'Mecánica' },
  { name: 'Mecánica - Cambio de líquido de freno', description: 'Consultar valor vía WhatsApp.', duration: 60, priceAuto: null, priceSuv2: null, priceSuv3: null, category: 'Mecánica' }
];

async function main() {
  console.log("Iniciando volcado de servicios de prueba...");
  
  // Borrar todas las reservas para evitar conflictos de llave foránea
  await prisma.booking.deleteMany();
  console.log("Reservas antiguas eliminadas.");

  // Borrar los servicios
  await prisma.service.deleteMany();
  console.log("Catálogo antiguo eliminado.");

  console.log("Cargando nuevos servicios definitivos...");
  
  for (const s of services) {
    await prisma.service.create({
      data: s
    });
  }

  console.log(`¡Éxito! Se han cargado ${services.length} servicios de forma definitiva.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
