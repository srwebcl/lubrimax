import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Iniciando migración de categorías...");

  // Categorías iniciales basadas en el sistema antiguo
  const initialCategories = [
    {
      name: "Lavados",
      slug: "lavados",
      description: "Limpieza exterior e interior con técnicas de bajo impacto y máxima eficiencia.",
      image: "/images/lavado-espuma.png",
      color: "from-blue-500 to-brand-cyan"
    },
    {
      name: "Detailing",
      slug: "detailing",
      description: "Tratamientos de pintura, pulido extremo y protección cerámica o nanotecnología.",
      image: "/images/detailing-exterior-ceramico-3.jpeg",
      color: "from-purple-500 to-pink-500"
    },
    {
      name: "Extras",
      slug: "extras",
      description: "Servicios adicionales como lavado de tapiz, techo, motor y chasis.",
      image: "/images/lavado-tapiz.png",
      color: "from-amber-500 to-orange-500"
    },
    {
      name: "Mecánica",
      slug: "mecanica",
      description: "Mantenimiento preventivo, frenos, aceites y filtros. Previa evaluación.",
      image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=800",
      color: "from-gray-500 to-gray-300"
    }
  ];

  // Crear o asegurar que existan
  const createdCategories = [];
  for (const cat of initialCategories) {
    const existing = await prisma.serviceCategory.findUnique({ where: { slug: cat.slug } });
    if (!existing) {
      const newCat = await prisma.serviceCategory.create({ data: cat });
      createdCategories.push(newCat);
      console.log(`Categoría creada: ${newCat.name}`);
    } else {
      createdCategories.push(existing);
      console.log(`Categoría ya existe: ${existing.name}`);
    }
  }

  // Actualizar los servicios existentes para que apunten a los nuevos categoryId
  console.log("Enlazando servicios a categorías relacionales...");
  const services = await prisma.service.findMany();
  
  let updatedCount = 0;
  for (const service of services) {
    // Intentar hacer match por el string 'category' que tenían antes
    const matchCategory = createdCategories.find(c => c.name === service.category || c.slug === service.category.toLowerCase());
    
    if (matchCategory && service.categoryId !== matchCategory.id) {
      await prisma.service.update({
        where: { id: service.id },
        data: { categoryId: matchCategory.id }
      });
      updatedCount++;
    }
  }

  console.log(`¡Migración completa! Se enlazaron ${updatedCount} servicios a sus categorías relacionales.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
