import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ServiceCard from "@/components/dom/ServiceCard";

// Fallbacks if we still want them, though we should read from DB
const categoryMap: Record<string, string> = {
  lavados: "Lavados",
  detailing: "Detailing",
  extras: "Extras",
  mecanica: "Mecánica"
};

const categoryTitles: Record<string, string> = {
  lavados: "Lavados Profesionales",
  detailing: "Detailing y Sellados",
  extras: "Servicios Adicionales",
  mecanica: "Mecánica Preventiva"
};

const categoryHeroImages: Record<string, string> = {
  lavados: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&q=80",
  detailing: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80",
  extras: "https://images.unsplash.com/photo-1518987048-93e29699e79a?auto=format&fit=crop&q=80",
  mecanica: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80"
};

const categoryServiceImages: Record<string, string[]> = {
  lavados: [
    "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?auto=format&fit=crop&q=80"
  ],
  detailing: [
    "/images/detailing-exterior-ceramico-2.jpeg",
    "/images/detailing-exterior-ceramico-3.jpeg",
    "/images/detailing-exterior-ceramico.jpeg",
    "/images/detailing-exterior-nanotecnologia.jpeg",
    "/images/detailing-inteior-1.jpeg",
    "/images/detailing-inteior.jpeg",
    "/images/detailing-premium.jpeg"
  ],
  extras: [
    "https://images.unsplash.com/photo-1518987048-93e29699e79a?auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1600705591361-39659be6d5b0?auto=format&fit=crop&q=80"
  ],
  mecanica: [
    "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80"
  ]
};

// Mapeo opcional para servicios específicos (por nombre)
const serviceSpecificImages: Record<string, string[]> = {
  "Lavado Simple": [
    "/images/lavados/lavado-simple-2.jpeg",
    "/images/lavados/lavado-simple-1.jpeg"
  ],
  "Lavado Full": [
    "/images/lavados/lavado-full-2.jpeg",
    "/images/lavados/lavado-full-1.jpeg"
  ],
  "Lavado Premium": [
    "/images/lavados/lavado-premium-2.jpeg",
    "/images/lavados/lavado-premium-1.jpeg"
  ]
};

type Params = Promise<{ categoria: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { categoria } = await params;
  const dbCategory = await prisma.serviceCategory.findUnique({ where: { slug: categoria } });
  
  if (!dbCategory) return { title: "No Encontrado | Lubrimax" };
  return { title: `${dbCategory.name} | Lubrimax` };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { categoria } = await params;
  const dbCategory = await prisma.serviceCategory.findUnique({ where: { slug: categoria } });
  
  if (!dbCategory) {
    notFound();
  }

  const services = await prisma.service.findMany({
    where: { categoryId: dbCategory.id },
    orderBy: { priceAuto: 'asc' }
  });

  return (
    <div className="min-h-screen bg-brand-pure text-white relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-32 pb-16">


        {/* HERO CATEGORÍA */}
        <section className="relative w-full mb-16 text-center py-24 rounded-[3rem] overflow-hidden border border-brand-cyan/10 shadow-[0_0_50px_rgba(56,189,248,0.05)]">
          {/* Background Image & Overlays */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none"
            style={{ backgroundImage: `url('${dbCategory.image || categoryHeroImages[categoria]}')` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-brand-pure via-brand-pure/50 to-transparent pointer-events-none"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_var(--tw-colors-brand-pure)_100%)] pointer-events-none"></div>

          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest italic mb-4 drop-shadow-xl text-white">
              {dbCategory.name}
            </h1>
            <p className="text-gray-300 max-w-2xl mx-auto text-lg drop-shadow-md">
              {dbCategory.description || "Selecciona el servicio que mejor se adapte a las necesidades de tu vehículo."}
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {services.map((service) => {
            const images = serviceSpecificImages[service.name] || (dbCategory.image ? [dbCategory.image] : categoryServiceImages[categoria]);
            return (
              <ServiceCard 
                key={service.id} 
                service={service} 
                images={images} 
                isMechanic={dbCategory.name === "Mecánica"} 
              />
            );
          })}

          {services.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
              No hay servicios disponibles en esta categoría por el momento.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
