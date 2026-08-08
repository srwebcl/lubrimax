import React from "react";
import Link from "next/link";
import { Droplet, Sparkles, PlusCircle, Wrench } from "lucide-react";

const categories = [
  {
    name: "Lavados",
    slug: "lavados",
    description: "Limpieza exterior e interior con técnicas de bajo impacto y máxima eficiencia.",
    icon: Droplet,
    color: "from-blue-500 to-brand-cyan",
    image: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Detailing",
    slug: "detailing",
    description: "Tratamientos de pintura, pulido extremo y protección cerámica o nanotecnología.",
    icon: Sparkles,
    color: "from-purple-500 to-pink-500",
    image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Extras",
    slug: "extras",
    description: "Servicios adicionales como lavado de tapiz, techo, motor y chasis.",
    icon: PlusCircle,
    color: "from-amber-500 to-orange-500",
    image: "https://images.unsplash.com/photo-1626668893632-6f3a4466d22f?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Mecánica",
    slug: "mecanica",
    description: "Mantenimiento preventivo, frenos, aceites y filtros. Previa evaluación.",
    icon: Wrench,
    color: "from-gray-500 to-gray-300",
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=800"
  }
];

export default function Services() {
  return (
    <section id="servicios" className="py-24 relative overflow-hidden bg-brand-pure">
      {/* Patrón Hexagonal Decorativo (Fondo) */}
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='103.923' viewBox='0 0 60 103.923' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 103.923L0 86.6025V51.9615L30 34.641L60 51.9615V86.6025L30 103.923ZM30 102.768L59 86.025V52.5385L30 35.795L1 52.5385V86.025L30 102.768ZM30 51.9615L0 34.641V0L30 -17.3205L60 0V34.641L30 51.9615ZM30 50.806L59 34.064V0.577L30 -16.166L1 0.577V34.064L30 50.806Z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: "60px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold italic uppercase tracking-widest text-brand-chrome mb-4 flex flex-col md:block">
            <span>Descubre nuestros</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">Servicios</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-lg">
            Tratamientos basados en nanotecnología que llevarán a tu vehículo a un nivel superior.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link href={`/servicios/${cat.slug}`} key={cat.slug} className="group">
              <div className="bg-[#0f1115] border border-white/5 rounded-2xl p-6 transition-all duration-500 hover:border-brand-cyan/50 hover:-translate-y-2 h-full flex flex-col items-center text-center relative overflow-hidden min-h-[320px] justify-end group-hover:shadow-[0_0_30px_rgba(0,180,216,0.15)]">
                {/* Imagen de fondo */}
                <div 
                  className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-40 group-hover:opacity-50"
                  style={{ backgroundImage: `url(${cat.image})` }}
                />
                
                {/* Degradados de oscurecimiento */}
                <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#0f1115]/80 via-[#0f1115]/90 to-[#0f1115] transition-opacity duration-500 group-hover:opacity-80" />
                <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-br ${cat.color} blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity duration-500`} />
                
                {/* Ícono superior (mezclado con la imagen) */}
                <div className="absolute top-6 right-6 z-10 opacity-30 group-hover:opacity-100 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
                  <cat.icon className="w-10 h-10 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-wider mb-2 relative z-10 text-white drop-shadow-md">{cat.name}</h3>
                
                <p className="text-gray-400 relative z-10 text-sm font-light">
                  {cat.description}
                </p>
                
                <div className="mt-6 text-brand-cyan uppercase tracking-widest text-xs font-bold opacity-70 group-hover:opacity-100 transition-opacity">
                  Ver opciones &rarr;
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
