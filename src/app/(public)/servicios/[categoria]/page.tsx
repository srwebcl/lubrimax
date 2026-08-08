import React from "react";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import ServiceCard from "@/components/dom/ServiceCard";

// Mapeo de slugs de URL a los nombres exactos en la Base de Datos
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
    "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&q=80"
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

type Params = Promise<{ categoria: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { categoria } = await params;
  const dbCategory = categoryMap[categoria];
  if (!dbCategory) return { title: "No Encontrado | Lubrimax" };
  return { title: `${categoryTitles[categoria]} | Lubrimax` };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { categoria } = await params;
  const dbCategory = categoryMap[categoria];
  const title = categoryTitles[categoria];
  
  if (!dbCategory) {
    notFound();
  }

  const services = await prisma.service.findMany({
    where: { category: dbCategory },
    orderBy: { priceAuto: 'asc' }
  });

  return (
    <div className="min-h-screen bg-brand-pure text-white relative overflow-hidden">
      
      {/* Hero Background */}
      <div className="absolute top-0 left-0 w-full h-[55vh] z-0">
        <div 
          className="absolute inset-0 opacity-40 mix-blend-luminosity"
          style={{
            backgroundImage: `url('${categoryHeroImages[categoria]}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-pure via-brand-pure/60 to-brand-pure z-10" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-32 pb-16">
        <Link href="/servicios" className="inline-flex items-center text-brand-cyan hover:text-white transition-colors mb-8 text-sm uppercase tracking-widest font-bold">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Servicios
        </Link>

        <header className="mb-16 border-b border-white/10 pb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest italic mb-4 drop-shadow-md">
            {title.split(' ')[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan to-blue-500">{title.split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            {dbCategory === "Mecánica" 
              ? "Servicios de mecánica preventiva sujetos a evaluación técnica. Consulta con nuestros expertos."
              : "Selecciona el servicio que mejor se adapte a las necesidades de tu vehículo."}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {services.map((service) => (
            <ServiceCard 
              key={service.id} 
              service={service} 
              images={categoryServiceImages[categoria]} 
              isMechanic={dbCategory === "Mecánica"} 
            />
          ))}

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
